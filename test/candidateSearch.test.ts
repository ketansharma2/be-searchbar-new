import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { Candidate } from '../src/models/Candidate';
import { ActivityLog } from '../src/models/ActivityLog';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

async function seedCandidates() {
  await Candidate.create([
    {
      unique_id: 'c1',
      name: 'Aarav Sharma',
      designation: 'Frontend Engineer',
      location: 'Delhi',
      relevantExp: 3,
      recentCompany: 'Acme',
      topSkills: ['React', 'TypeScript'],
      skillsAll: ['React', 'TypeScript', 'Node'],
      resumeUrl: 'https://x.com/a.pdf',
    },
    {
      unique_id: 'c2',
      name: 'Priya Nair',
      designation: 'Backend Engineer',
      location: 'Mumbai',
      relevantExp: 6,
      recentCompany: 'Globex',
      topSkills: ['Node', 'MongoDB'],
      skillsAll: ['Node', 'MongoDB', 'AWS'],
      resumeUrl: 'https://x.com/p.pdf',
    },
    {
      unique_id: 'c3',
      name: 'Rohan Gupta',
      designation: 'Frontend Engineer',
      location: 'Delhi',
      relevantExp: 1,
      topSkills: ['React'],
      skillsAll: ['React', 'CSS'],
      resumeUrl: 'https://x.com/r.pdf',
    },
  ]);
}

describe('Candidate search & remarks API', () => {
  let recToken: string;
  let adminToken: string;

  beforeEach(async () => {
    await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
    await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
    adminToken = await loginAndGetToken(ADMIN.email, ADMIN.password);
    recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
    await seedCandidates();
  });

  describe('GET /api/candidates (search)', () => {
    it('401 unauthenticated', async () => {
      expect((await request(app).get('/api/candidates?q=engineer')).status).toBe(401);
    });

    it('is available to BOTH recruiter and admin', async () => {
      expect((await auth(request(app).get('/api/candidates?location=Delhi'), recToken)).status).toBe(200);
      expect((await auth(request(app).get('/api/candidates?location=Delhi'), adminToken)).status).toBe(200);
    });

    it('400 when no search criterion is provided', async () => {
      const res = await auth(request(app).get('/api/candidates'), recToken);
      expect(res.status).toBe(400);
    });

    it('filters by location', async () => {
      const res = await auth(request(app).get('/api/candidates?location=Delhi'), recToken);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('filters by designation', async () => {
      const res = await auth(
        request(app).get('/api/candidates?designation=Backend'),
        recToken
      );
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Priya Nair');
    });

    it('filters by experience range', async () => {
      const res = await auth(request(app).get('/api/candidates?minExp=2&maxExp=5'), recToken);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].unique_id).toBe('c1');
    });

    it('AND-matches skills across topSkills/skillsAll', async () => {
      const res = await auth(
        request(app).get('/api/candidates?skills=React&skills=Node'),
        recToken
      );
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].unique_id).toBe('c1');
    });

    it('full-text search ranks by relevance', async () => {
      const res = await auth(request(app).get('/api/candidates?q=Frontend'), recToken);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    });

    it('never exposes resumeText and returns cards', async () => {
      const res = await auth(request(app).get('/api/candidates?location=Delhi'), recToken);
      const card = res.body.data[0];
      expect(card).not.toHaveProperty('resumeText');
      expect(card).toHaveProperty('hasResume', true);
      expect(card).toHaveProperty('topSkills');
    });

    it('logs search_candidates with result count', async () => {
      await auth(request(app).get('/api/candidates?location=Delhi'), recToken);
      const log = await ActivityLog.findOne({ type: 'search_candidates' });
      expect(log).toBeTruthy();
      expect((log!.details as { resultCount: number }).resultCount).toBe(2);
    });

    it('paginates (size 20 default, custom limit)', async () => {
      const res = await auth(
        request(app).get('/api/candidates?designation=Engineer&limit=2&page=1'),
        recToken
      );
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  describe('POST /api/candidates/:id/remarks', () => {
    it('adds a remark with author + timestamp and logs update_remark', async () => {
      const c = await Candidate.findOne({ unique_id: 'c1' });
      const res = await auth(
        request(app).post(`/api/candidates/${c!.id}/remarks`),
        recToken
      ).send({ text: 'Strong React skills' });

      expect(res.status).toBe(201);
      expect(res.body.candidate.remarks).toHaveLength(1);
      expect(res.body.candidate.remarks[0]).toMatchObject({
        text: 'Strong React skills',
        authorEmail: RECRUITER.email,
      });
      expect(await ActivityLog.countDocuments({ type: 'update_remark' })).toBe(1);
    });

    it('rejects an empty remark (400)', async () => {
      const c = await Candidate.findOne({ unique_id: 'c1' });
      const res = await auth(
        request(app).post(`/api/candidates/${c!.id}/remarks`),
        recToken
      ).send({ text: '   ' });
      expect(res.status).toBe(400);
    });

    it('404 for a missing candidate', async () => {
      const res = await auth(
        request(app).post('/api/candidates/64b7f9f9f9f9f9f9f9f9f9f9/remarks'),
        recToken
      ).send({ text: 'hi' });
      expect(res.status).toBe(404);
    });
  });
});
