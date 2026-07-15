import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { ActivityLog } from '../src/models/ActivityLog';
import { Candidate } from '../src/models/Candidate';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };
const OTHER_RECRUITER = { email: 'other@test.com', password: 'Other@1234' };

describe('Activity Logs API', () => {
  let adminToken: string;
  let recToken: string;
  let adminId: string;
  let recId: string;
  let otherRecId: string;

  beforeEach(async () => {
    const admin = await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
    const rec = await createUser({ ...RECRUITER, name: 'Rec One', role: 'RECRUITER' });
    const other = await createUser({ ...OTHER_RECRUITER, name: 'Rec Two', role: 'RECRUITER' });
    adminId = admin.id;
    recId = rec.id;
    otherRecId = other.id;
    adminToken = await loginAndGetToken(ADMIN.email, ADMIN.password);
    recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
  });

  it('rejects unauthenticated access with 401', async () => {
    const res = await request(app).get('/api/activity-logs');
    expect(res.status).toBe(401);
  });

  describe('admin scope', () => {
    beforeEach(async () => {
      await ActivityLog.create([
        { user: recId, type: 'login', details: {} },
        { user: recId, type: 'search_candidates', details: { q: 'engineer' } },
        { user: otherRecId, type: 'search_candidates', details: { q: 'designer' } },
        {
          user: adminId,
          type: 'create_recruiter',
          details: { recruiterId: recId, name: 'Rec One', email: RECRUITER.email },
        },
      ]);
    });

    it("sees every user's logs with pagination meta", async () => {
      const res = await auth(request(app).get('/api/activity-logs'), adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(4);
      expect(res.body.pagination).toMatchObject({ total: 4 });
    });

    it('filters by type', async () => {
      const res = await auth(
        request(app).get('/api/activity-logs?type=search_candidates'),
        adminToken
      );
      expect(res.body.data).toHaveLength(2);
    });

    it('filters by actorType=admin', async () => {
      const res = await auth(request(app).get('/api/activity-logs?actorType=admin'), adminToken);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].type).toBe('create_recruiter');
    });

    it('filters by userId', async () => {
      const res = await auth(
        request(app).get(`/api/activity-logs?userId=${recId}`),
        adminToken
      );
      expect(res.body.data).toHaveLength(2);
    });

    it('enriches recruiterName/recruiterEmail via lookup when not inlined at write time', async () => {
      await ActivityLog.create({
        user: adminId,
        type: 'update_recruiter',
        details: { recruiterId: recId },
      });
      const res = await auth(
        request(app).get('/api/activity-logs?type=update_recruiter'),
        adminToken
      );
      expect(res.body.data[0].details).toMatchObject({
        recruiterName: 'Rec One',
        recruiterEmail: RECRUITER.email,
      });
    });

    it('normalizes candidateName from an inlined name and from a lookup, consistently', async () => {
      const candidate = await Candidate.create({
        unique_id: 'x1',
        name: 'Cand One',
        resumeUrl: 'https://x/y.pdf',
      });
      await ActivityLog.create([
        {
          user: adminId,
          type: 'add_candidate',
          details: { candidateId: candidate.id, source: 'manual', name: 'Cand One' },
        },
        { user: recId, type: 'resume_download', details: { candidateId: candidate.id } },
      ]);
      const res = await auth(request(app).get('/api/activity-logs'), adminToken);
      const byType = (t: string) => res.body.data.find((r: { type: string }) => r.type === t);
      expect(byType('add_candidate').details.candidateName).toBe('Cand One');
      expect(byType('resume_download').details.candidateName).toBe('Cand One');
    });
  });

  describe('recruiter scope', () => {
    it("never sees another recruiter's logs", async () => {
      await ActivityLog.create([
        { user: recId, type: 'search_candidates', details: {} },
        { user: otherRecId, type: 'search_candidates', details: {} },
      ]);
      const res = await auth(request(app).get('/api/activity-logs'), recToken);
      expect(res.body.data).toHaveLength(1);
    });

    it('never sees login/logout, even when explicitly requesting type=login', async () => {
      await ActivityLog.create([
        { user: recId, type: 'login', details: {} },
        { user: recId, type: 'search_candidates', details: {} },
      ]);

      const unfiltered = await auth(request(app).get('/api/activity-logs'), recToken);
      expect(unfiltered.body.data).toHaveLength(1);
      expect(unfiltered.body.data[0].type).toBe('search_candidates');

      const forced = await auth(request(app).get('/api/activity-logs?type=login'), recToken);
      expect(forced.status).toBe(200);
      expect(forced.body.data).toHaveLength(0);
    });

    it('ignores userId/actorType query params — always self-scoped', async () => {
      await ActivityLog.create({ user: otherRecId, type: 'search_candidates', details: {} });
      const res = await auth(
        request(app).get(`/api/activity-logs?userId=${otherRecId}&actorType=recruiter`),
        recToken
      );
      expect(res.body.data).toHaveLength(0);
    });
  });
});
