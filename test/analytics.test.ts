import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { Candidate } from '../src/models/Candidate';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

describe('Analytics API', () => {
  let adminToken: string;
  let recToken: string;

  beforeEach(async () => {
    await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
    await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
    adminToken = await loginAndGetToken(ADMIN.email, ADMIN.password);
    recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
  });

  describe('authorization', () => {
    it('rejects unauthenticated access with 401', async () => {
      expect((await request(app).get('/api/analytics/summary')).status).toBe(401);
    });

    it('rejects a recruiter (admin-only) with 403', async () => {
      const res = await auth(request(app).get('/api/analytics/summary'), recToken);
      expect(res.status).toBe(403);
    });
  });

  describe('summary', () => {
    it('reports total/today/yesterday/last-7-days counts', async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      const tenDaysAgo = new Date(now);
      tenDaysAgo.setDate(now.getDate() - 10);

      await Candidate.create([
        { unique_id: 'a', name: 'A', resumeUrl: 'x' },
        { unique_id: 'b', name: 'B', resumeUrl: 'x', createdAt: yesterday },
        { unique_id: 'c', name: 'C', resumeUrl: 'x', createdAt: tenDaysAgo },
      ]);

      const res = await auth(request(app).get('/api/analytics/summary'), adminToken);
      expect(res.status).toBe(200);
      expect(res.body.summary).toMatchObject({
        totalCandidates: 3,
        addedToday: 1,
        addedYesterday: 1,
      });
      expect(res.body.summary.addedThisWeek).toBeGreaterThanOrEqual(2);
    });
  });

  describe('breakdown', () => {
    beforeEach(async () => {
      await Candidate.create([
        {
          unique_id: 'd1',
          name: 'Person A',
          location: 'Bangalore, Karnataka',
          designation: 'Software Engineer',
          topSkills: ['React', 'Node'],
          skillsAll: ['React', 'Node', 'AWS'],
          companyNamesAll: ['Acme'],
          recentCompany: 'Acme',
          portal: 'Naukri',
          relevantExp: 2,
          resumeUrl: 'x',
        },
        {
          unique_id: 'd2',
          name: 'Person B',
          location: 'bangalore | remote',
          designation: 'Software Engineer',
          topSkills: ['React'],
          skillsAll: ['React', 'Vue'],
          companyNamesAll: ['Globex'],
          recentCompany: 'Globex',
          portal: 'Naukri',
          relevantExp: 2,
          resumeUrl: 'x',
        },
        {
          unique_id: 'd3',
          name: 'Person C',
          location: 'Mumbai',
          designation: 'Product Manager',
          topSkills: ['Roadmapping'],
          skillsAll: ['Roadmapping'],
          companyNamesAll: ['Initech'],
          recentCompany: 'Initech',
          portal: 'LinkedIn',
          relevantExp: 12,
          resumeUrl: 'x',
        },
      ]);
    });

    it('rejects an invalid dimension with 400', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=bogus'),
        adminToken
      );
      expect(res.status).toBe(400);
    });

    it('collapses multi-part location values to a primary city, case-insensitively', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=location'),
        adminToken
      );
      expect(res.status).toBe(200);
      expect(res.body.dimension).toBe('location');
      const bangalore = res.body.breakdown.find(
        (r: { label: string }) => r.label.toLowerCase() === 'bangalore'
      );
      expect(bangalore.count).toBe(2);
      const mumbai = res.body.breakdown.find((r: { label: string }) => r.label === 'Mumbai');
      expect(mumbai.count).toBe(1);
    });

    it('dedupes a skill present in both topSkills and skillsAll for the same candidate', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=skills'),
        adminToken
      );
      const react = res.body.breakdown.find((r: { label: string }) => r.label === 'React');
      expect(react.count).toBe(2);
    });

    it('groups companies from companyNamesAll and recentCompany without duplicating', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=company'),
        adminToken
      );
      const acme = res.body.breakdown.find((r: { label: string }) => r.label === 'Acme');
      expect(acme.count).toBe(1);
    });

    it('filters designation by normalized location', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=designation&location=Bangalore'),
        adminToken
      );
      expect(res.body.breakdown).toHaveLength(1);
      expect(res.body.breakdown[0]).toMatchObject({ label: 'Software Engineer', count: 2 });
    });

    it('groups by portal/source', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=portal'),
        adminToken
      );
      const naukri = res.body.breakdown.find((r: { label: string }) => r.label === 'Naukri');
      expect(naukri.count).toBe(2);
    });

    it('buckets experience into whole years ascending, with a 10+ overflow bucket', async () => {
      const res = await auth(
        request(app).get('/api/analytics/breakdown?dimension=experience'),
        adminToken
      );
      const labels: string[] = res.body.breakdown.map((r: { label: string }) => r.label);
      expect(labels.indexOf('2 years')).toBeLessThan(labels.indexOf('10+ years'));
      const overflow = res.body.breakdown.find((r: { label: string }) => r.label === '10+ years');
      expect(overflow.count).toBe(1);
      const twoYears = res.body.breakdown.find((r: { label: string }) => r.label === '2 years');
      expect(twoYears.count).toBe(2);
    });
  });

  describe('date range filtering', () => {
    it('omits `range` from the summary when no from/to is given', async () => {
      const res = await auth(request(app).get('/api/analytics/summary'), adminToken);
      expect(res.body.summary.range).toBeUndefined();
    });

    it('computes a range summary with a period-over-period trend', async () => {
      const now = new Date();
      const to = now;
      const from = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - (to.getTime() - from.getTime()));

      await Candidate.create([
        // 3 candidates inside [from, to]
        { unique_id: 'r1', name: 'R1', resumeUrl: 'x', createdAt: new Date(from.getTime() + 1000) },
        { unique_id: 'r2', name: 'R2', resumeUrl: 'x', createdAt: new Date(to.getTime() - 1000) },
        {
          unique_id: 'r3',
          name: 'R3',
          resumeUrl: 'x',
          createdAt: new Date((from.getTime() + to.getTime()) / 2),
        },
        // 1 candidate inside the equal-length prior window
        { unique_id: 'p1', name: 'P1', resumeUrl: 'x', createdAt: new Date(prevFrom.getTime() + 1000) },
        // 1 candidate well before either window — must not be counted anywhere
        {
          unique_id: 'old',
          name: 'Old',
          resumeUrl: 'x',
          createdAt: new Date(prevFrom.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      ]);

      const res = await auth(
        request(app).get(
          `/api/analytics/summary?from=${from.toISOString()}&to=${to.toISOString()}`
        ),
        adminToken
      );
      expect(res.status).toBe(200);
      expect(res.body.summary.range).toMatchObject({ count: 3, previousCount: 1, deltaPct: 200 });
    });

    it('filters breakdowns to candidates created within the range', async () => {
      const now = new Date();
      const from = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const to = now;
      const longAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      await Candidate.create([
        {
          unique_id: 'in1',
          name: 'In1',
          resumeUrl: 'x',
          location: 'Pune',
          createdAt: new Date(from.getTime() + 1000),
        },
        { unique_id: 'out1', name: 'Out1', resumeUrl: 'x', location: 'Pune', createdAt: longAgo },
      ]);

      const res = await auth(
        request(app).get(
          `/api/analytics/breakdown?dimension=location&from=${from.toISOString()}&to=${to.toISOString()}`
        ),
        adminToken
      );
      const pune = res.body.breakdown.find((r: { label: string }) => r.label === 'Pune');
      expect(pune.count).toBe(1);
    });

    it('rejects `from` after `to` with 400', async () => {
      const res = await auth(
        request(app).get('/api/analytics/summary?from=2026-01-10&to=2026-01-01'),
        adminToken
      );
      expect(res.status).toBe(400);
    });
  });
});
