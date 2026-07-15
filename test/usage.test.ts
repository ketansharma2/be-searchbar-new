import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { Candidate } from '../src/models/Candidate';
import { DownloadLog } from '../src/models/DownloadLog';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

describe('Usage API — date range', () => {
  let adminToken: string;
  let recToken: string;
  let recId: string;
  let candidateId: string;

  beforeEach(async () => {
    await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
    const rec = await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
    recId = rec.id;
    adminToken = await loginAndGetToken(ADMIN.email, ADMIN.password);
    recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
    const candidate = await Candidate.create({ unique_id: 'c1', name: 'Cand', resumeUrl: 'x' });
    candidateId = candidate.id;
  });

  describe('GET /usage/me', () => {
    it('omits `range` when no from/to is given (existing today-only behavior unchanged)', async () => {
      const res = await auth(request(app).get('/api/usage/me'), recToken);
      expect(res.status).toBe(200);
      expect(res.body.usage.range).toBeUndefined();
    });

    it('reports downloads in range, self-scoped, vs. the equal-length prior window', async () => {
      const now = new Date();
      const to = now;
      const from = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - (to.getTime() - from.getTime()));

      // 2 downloads by this recruiter inside the range, 1 by a different user inside the range
      // (must not count), 1 by this recruiter inside the previous window.
      const other = await createUser({
        name: 'Other',
        email: 'other@test.com',
        password: 'Passw0rd!',
        role: 'RECRUITER',
      });
      await DownloadLog.create([
        { user: recId, candidate: candidateId, createdAt: new Date(from.getTime() + 1000) },
        { user: recId, candidate: candidateId, createdAt: new Date(to.getTime() - 1000) },
        { user: other.id, candidate: candidateId, createdAt: new Date(from.getTime() + 2000) },
        { user: recId, candidate: candidateId, createdAt: new Date(prevFrom.getTime() + 1000) },
      ]);

      const res = await auth(
        request(app).get(`/api/usage/me?from=${from.toISOString()}&to=${to.toISOString()}`),
        recToken
      );
      expect(res.status).toBe(200);
      expect(res.body.usage.range).toMatchObject({ count: 2, previousCount: 1 });
    });
  });

  describe('GET /usage/summary', () => {
    it('rejects a recruiter (admin-only) with 403', async () => {
      const res = await auth(request(app).get('/api/usage/summary'), recToken);
      expect(res.status).toBe(403);
    });

    it('reports org-wide downloads in range across all users', async () => {
      const now = new Date();
      const to = now;
      const from = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      await DownloadLog.create([
        { user: recId, candidate: candidateId, createdAt: new Date(from.getTime() + 1000) },
        { user: recId, candidate: candidateId, createdAt: new Date(to.getTime() - 1000) },
      ]);

      const res = await auth(
        request(app).get(`/api/usage/summary?from=${from.toISOString()}&to=${to.toISOString()}`),
        adminToken
      );
      expect(res.status).toBe(200);
      expect(res.body.usage.range).toMatchObject({ count: 2 });
      // Existing fields stay present and unaffected by the range.
      expect(res.body.usage).toHaveProperty('totalDownloadsToday');
      expect(res.body.usage).toHaveProperty('activeRecruiters');
    });

    it('rejects `from` after `to` with 400', async () => {
      const res = await auth(
        request(app).get('/api/usage/summary?from=2026-01-10&to=2026-01-01'),
        adminToken
      );
      expect(res.status).toBe(400);
    });
  });
});
