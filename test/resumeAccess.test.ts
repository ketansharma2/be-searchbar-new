import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { Candidate } from '../src/models/Candidate';
import { DownloadLog } from '../src/models/DownloadLog';
import { ActivityLog } from '../src/models/ActivityLog';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

async function makeCandidate(resumeUrl = 'https://x.com/cv.pdf') {
  return Candidate.create({
    unique_id: `u-${Math.random().toString(36).slice(2)}`,
    name: 'Test Cand',
    designation: 'Engineer',
    resumeUrl,
  });
}

describe('Metered resume access', () => {
  let recToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
    // Recruiter with a small daily limit for easy testing.
    await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER', dailyDownloadLimit: 2 });
    adminToken = await loginAndGetToken(ADMIN.email, ADMIN.password);
    recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
  });

  it('401 unauthenticated', async () => {
    const c = await makeCandidate();
    expect((await request(app).get(`/api/candidates/${c.id}/resume/download`)).status).toBe(401);
  });

  describe('preview (free)', () => {
    it('returns the url without consuming quota and logs resume_view', async () => {
      const c = await makeCandidate();
      const res = await auth(request(app).get(`/api/candidates/${c.id}/resume/preview`), recToken);
      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://x.com/cv.pdf');
      expect(await DownloadLog.countDocuments()).toBe(0);
      expect(await ActivityLog.countDocuments({ type: 'resume_view' })).toBe(1);
    });

    it('404 when the candidate has no resume', async () => {
      const c = await Candidate.create({ unique_id: 'nores', name: 'No Resume' });
      const res = await auth(request(app).get(`/api/candidates/${c.id}/resume/preview`), recToken);
      expect(res.status).toBe(404);
    });
  });

  describe('download (metered)', () => {
    it('records a DownloadLog + resume_download and reports usage', async () => {
      const c = await makeCandidate();
      const res = await auth(request(app).get(`/api/candidates/${c.id}/resume/download`), recToken);
      expect(res.status).toBe(200);
      expect(res.body.url).toBe('https://x.com/cv.pdf');
      expect(res.body.usage).toMatchObject({
        unlimited: false,
        usedToday: 1,
        dailyDownloadLimit: 2,
        remaining: 1,
      });
      expect(await DownloadLog.countDocuments()).toBe(1);
      expect(await ActivityLog.countDocuments({ type: 'resume_download' })).toBe(1);
    });

    it('blocks with 403 once the daily limit is reached', async () => {
      const c1 = await makeCandidate();
      const c2 = await makeCandidate();
      const c3 = await makeCandidate();
      await auth(request(app).get(`/api/candidates/${c1.id}/resume/download`), recToken); // 1
      await auth(request(app).get(`/api/candidates/${c2.id}/resume/download`), recToken); // 2 (limit)
      const blocked = await auth(request(app).get(`/api/candidates/${c3.id}/resume/download`), recToken);
      expect(blocked.status).toBe(403);
      expect(blocked.body.message).toMatch(/limit exceeded/i);
      // No extra log written for the blocked attempt.
      expect(await DownloadLog.countDocuments()).toBe(2);
    });

    it('admins are unlimited (no limit enforcement)', async () => {
      const c = await makeCandidate();
      for (let i = 0; i < 5; i += 1) {
        const res = await auth(request(app).get(`/api/candidates/${c.id}/resume/download`), adminToken);
        expect(res.status).toBe(200);
        expect(res.body.usage.unlimited).toBe(true);
      }
    });
  });

  describe('usage endpoints', () => {
    it('GET /api/usage/me returns recruiter usage', async () => {
      const c = await makeCandidate();
      await auth(request(app).get(`/api/candidates/${c.id}/resume/download`), recToken);
      const res = await auth(request(app).get('/api/usage/me'), recToken);
      expect(res.body.usage).toMatchObject({
        unlimited: false,
        usedToday: 1,
        dailyDownloadLimit: 2,
        remaining: 1,
      });
    });

    it('GET /api/usage/me marks admin unlimited', async () => {
      const res = await auth(request(app).get('/api/usage/me'), adminToken);
      expect(res.body.usage.unlimited).toBe(true);
    });

    it('GET /api/usage/summary is admin-only', async () => {
      expect((await auth(request(app).get('/api/usage/summary'), recToken)).status).toBe(403);
      const res = await auth(request(app).get('/api/usage/summary'), adminToken);
      expect(res.status).toBe(200);
      expect(res.body.usage).toHaveProperty('totalDownloadsToday');
      expect(res.body.usage).toHaveProperty('activeRecruiters');
    });
  });
});
