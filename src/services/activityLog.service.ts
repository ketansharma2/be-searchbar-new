import {
  activityLogRepository,
  type ActivityLogFilter,
  type ActivityLogWithActor,
} from '../repositories/activityLog.repository';
import { candidateRepository } from '../repositories/candidate.repository';
import { userRepository } from '../repositories/user.repository';
import { resolvePagination, buildMeta, type Paginated } from '../utils/pagination';
import type { ActivityType } from '../models/ActivityLog';
import type { Role } from '../models/User';
import type { ListActivityLogsQuery } from '../validators/activityLog.validators';

/**
 * Append an audit entry. Logging must never break the primary action, so
 * failures here are swallowed (and reported to the console) rather than thrown.
 */
export async function logActivity(params: {
  userId: string;
  type: ActivityType;
  details?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  try {
    await activityLogRepository.create({
      user: params.userId as never,
      type: params.type,
      details: params.details ?? {},
      ip: params.ip,
    });
  } catch (err) {
    console.error('[activityLog] failed to record', params.type, err);
  }
}

export interface ActivityLogView {
  id: string;
  type: ActivityType;
  details: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
  actor: { id: string; name: string; email: string; role: Role };
}

// Never shown in a recruiter's own log view, regardless of any `type` filter they pass.
const RECRUITER_HIDDEN_TYPES: ActivityType[] = ['login', 'logout'];

/**
 * Unified activity feed. Admins may view/filter across all users; recruiters
 * are always force-scoped to their own rows and can never see login/logout
 * entries, no matter what the query asks for.
 */
export async function listActivityLogs(
  query: ListActivityLogsQuery,
  caller: { id: string; role: Role }
): Promise<Paginated<ActivityLogView>> {
  const pagination = resolvePagination(query.page, query.limit);

  const filter: ActivityLogFilter = {};
  if (query.from) filter.from = query.from;
  if (query.to) filter.to = query.to;

  let actorType: 'all' | 'admin' | 'recruiter' = 'all';

  if (caller.role === 'RECRUITER') {
    filter.user = caller.id;
    if (query.type) {
      filter.type = RECRUITER_HIDDEN_TYPES.includes(query.type)
        ? { $in: [] } // explicitly requesting a hidden type resolves to no results, never an error
        : query.type;
    } else {
      filter.type = { $nin: RECRUITER_HIDDEN_TYPES };
    }
  } else {
    if (query.userId) filter.user = query.userId;
    if (query.type) filter.type = query.type;
    actorType = query.actorType ?? 'all';
  }

  const { items, total } = await activityLogRepository.findPaginatedWithActor(
    filter,
    actorType,
    pagination
  );

  return {
    data: await enrichDetails(items),
    pagination: buildMeta(total, pagination),
  };
}

/**
 * Normalizes `details` across activity types so the frontend has one
 * consistent shape to render: `candidateName`/`recruiterName`/`recruiterEmail`
 * are always populated when the corresponding id is present — using the
 * name/email already inlined at write time where available (e.g.
 * `add_candidate`, `create_recruiter`), and batching a lookup for the page's
 * remaining ids otherwise (e.g. `update_recruiter`, `resume_download`).
 */
async function enrichDetails(rows: ActivityLogWithActor[]): Promise<ActivityLogView[]> {
  // Mongoose's `minimize` option (on by default) strips empty `{}` objects before
  // persisting, so a log written with no extra context has no `details` field at
  // all in MongoDB — never assume it's present.
  const candidateIdsToLookup = distinct(
    rows
      .filter((r) => typeof r.details?.candidateId === 'string' && typeof r.details?.name !== 'string')
      .map((r) => r.details!.candidateId as string)
  );
  const recruiterIdsToLookup = distinct(
    rows
      .filter(
        (r) => typeof r.details?.recruiterId === 'string' && typeof r.details?.name !== 'string'
      )
      .map((r) => r.details!.recruiterId as string)
  );

  const [candidates, recruiters] = await Promise.all([
    candidateIdsToLookup.length
      ? candidateRepository.find({ _id: { $in: candidateIdsToLookup } })
      : Promise.resolve([]),
    recruiterIdsToLookup.length
      ? userRepository.find({ _id: { $in: recruiterIdsToLookup } })
      : Promise.resolve([]),
  ]);
  const candidateNameById = new Map(candidates.map((c) => [c.id, c.name]));
  const recruiterById = new Map(recruiters.map((u) => [u.id, { name: u.name, email: u.email }]));

  return rows.map((row) => {
    const details: Record<string, unknown> = { ...row.details };

    if (typeof details.candidateId === 'string') {
      details.candidateName =
        typeof details.name === 'string'
          ? details.name
          : (candidateNameById.get(details.candidateId) ?? 'Unknown candidate');
    }
    if (typeof details.recruiterId === 'string') {
      const inlineName = typeof details.name === 'string' ? details.name : undefined;
      const looked = recruiterById.get(details.recruiterId);
      details.recruiterName = inlineName ?? looked?.name ?? 'Unknown recruiter';
      const inlineEmail = typeof details.email === 'string' ? details.email : undefined;
      if (inlineEmail || looked?.email) details.recruiterEmail = inlineEmail ?? looked?.email;
    }

    return {
      id: row._id.toString(),
      type: row.type,
      details,
      ip: row.ip,
      createdAt: row.createdAt,
      actor: {
        id: row.actor._id.toString(),
        name: row.actor.name,
        email: row.actor.email,
        role: row.actor.role,
      },
    };
  });
}

function distinct(ids: string[]): string[] {
  return Array.from(new Set(ids));
}
