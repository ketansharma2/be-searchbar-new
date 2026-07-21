import type { FilterQuery } from 'mongoose';
import { type IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { userRepository } from '../repositories/user.repository';
import { downloadLogRepository } from '../repositories/downloadLog.repository';
import { activityLogRepository } from '../repositories/activityLog.repository';
import { RefreshToken } from '../models/RefreshToken';
import { hashPassword } from '../utils/password';
import { logActivity } from './activityLog.service';
import {
  resolvePagination,
  buildMeta,
  type Paginated,
} from '../utils/pagination';
import { buildRangeSummary, type RangeSummary } from '../utils/dateRange';
import type {
  CreateRecruiterInput,
  UpdateRecruiterInput,
  ListRecruitersQuery,
} from '../validators/recruiter.validators';

export interface RecruiterView {
  id: string;
  name: string;
  email: string;
  role: IUser['role'];
  active: boolean;
  real_password: string;
  dailyDownloadLimit: number;
  usedToday: number;
  createdAt: Date;
}

function toRecruiterView(user: IUser, usedToday: number): RecruiterView {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    real_password:user.real_password,
    dailyDownloadLimit: user.dailyDownloadLimit,
    usedToday,
    createdAt: user.createdAt,
  };
}

/** Admin-scoped, paginated recruiter list with search + status filter. */
export async function listRecruiters(
  query: ListRecruitersQuery
): Promise<Paginated<RecruiterView>> {
  const pagination = resolvePagination(query.page, query.limit);

  const filter: FilterQuery<IUser> = { role: 'RECRUITER' };
  if (query.status === 'active') filter.active = true;
  if (query.status === 'inactive') filter.active = false;
  if (query.search) {
    const rx = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const { items, total } = await userRepository.findPaginated(filter, pagination);
  const usageMap = await downloadLogRepository.countTodayForUsers(
    items.map((u) => u.id)
  );

  return {
    data: items.map((u) => toRecruiterView(u, usageMap[u.id] ?? 0)),
    pagination: buildMeta(total, pagination),
  };
}

export async function getRecruiter(id: string): Promise<RecruiterView> {
  const user = await requireRecruiter(id);
  const usedToday = await downloadLogRepository.countToday(user.id);
  return toRecruiterView(user, usedToday);
}

export async function createRecruiter(
  input: CreateRecruiterInput,
  actorId: string
): Promise<RecruiterView> {
  if (await userRepository.emailExists(input.email)) {
    throw ApiError.badRequest('Validation failed', { email: ['Email already exists'] });
  }

  const user = await userRepository.create({
    name: input.name,
    email: input.email,
    password: await hashPassword(input.password),
    role: 'RECRUITER',
    real_password: input.password,
    active: input.active,
    dailyDownloadLimit: input.dailyDownloadLimit,
  });

  await logActivity({
    userId: actorId,
    type: 'create_recruiter',
    details: { recruiterId: user.id, name: user.name, email: user.email },
  });

  return toRecruiterView(user, 0);
}

export async function updateRecruiter(
  id: string,
  input: UpdateRecruiterInput,
  actorId: string
): Promise<RecruiterView> {
  const user = await requireRecruiter(id);

  if (input.email && input.email !== user.email) {
    if (await userRepository.emailExists(input.email, id)) {
      throw ApiError.badRequest('Validation failed', { email: ['Email already exists'] });
    }
    user.email = input.email;
  }
  if (input.name !== undefined) user.name = input.name;
  if (input.dailyDownloadLimit !== undefined) {
    user.dailyDownloadLimit = input.dailyDownloadLimit;
  }
  if (input.active !== undefined) user.active = input.active;
  // Blank password = unchanged.
  if (input.password){
    user.password = await hashPassword(input.password);
    user.real_password = input.password;
  } 

  await user.save();

  await logActivity({
    userId: actorId,
    type: 'update_recruiter',
    details: { recruiterId: user.id },
  });

  const usedToday = await downloadLogRepository.countToday(user.id);
  return toRecruiterView(user, usedToday);
}

export async function setRecruiterStatus(
  id: string,
  active: boolean,
  actorId: string
): Promise<RecruiterView> {
  const user = await requireRecruiter(id);
  user.active = active;
  await user.save();

  // Deactivating immediately kills existing sessions.
  if (!active) {
    await RefreshToken.deleteMany({ user: user._id });
  }

  await logActivity({
    userId: actorId,
    type: active ? 'activate_recruiter' : 'deactivate_recruiter',
    details: { recruiterId: user.id },
  });

  const usedToday = await downloadLogRepository.countToday(user.id);
  return toRecruiterView(user, usedToday);
}

/**
 * Hard-delete a recruiter and cascade:
 *  - remove their refresh tokens, download logs, and activity logs
 *  - (candidate un-assignment is wired in when the Candidate model lands)
 */
export async function deleteRecruiter(id: string, actorId: string): Promise<void> {
  const user = await requireRecruiter(id);

  await Promise.all([
    RefreshToken.deleteMany({ user: user._id }),
    downloadLogRepository.deleteMany({ user: user._id }),
    activityLogRepository.deleteMany({ user: user._id }),
  ]);

  await userRepository.deleteById(id);

  await logActivity({
    userId: actorId,
    type: 'delete_recruiter',
    details: { recruiterId: id, email: user.email },
  });
}

/** "Recruiters added in range" KPI, vs. the equal-length prior window. */
export async function getRecruiterRangeSummary(from: Date, to: Date): Promise<RangeSummary> {
  const { count, previousCount } = await userRepository.getRecruiterRangeSummary(from, to);
  return buildRangeSummary(from, to, count, previousCount);
}

/** Fetch a user, ensuring it exists and is actually a recruiter. */
async function requireRecruiter(id: string): Promise<IUser> {
  const user = await userRepository.findById(id);

  if (!user || user.role !== 'RECRUITER') {
    throw ApiError.notFound('Recruiter not found');
  }
  return user;
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
