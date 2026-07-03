import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';

// Avoid hitting real S3 — the manual-add flow uploads through this module.
vi.mock('../src/services/storage/s3.storage', () => ({
  s3Storage: {
    upload: vi.fn().mockResolvedValue({
      key: 'resumes/mock-key.pdf',
      url: 'https://cdn.example.com/resumes/mock-key.pdf',
    }),
  },
}));

import { app, createUser, loginAndGetToken, auth } from './helpers';
import { Candidate } from '../src/models/Candidate';
import { BulkUploadLog } from '../src/models/BulkUploadLog';
import { ActivityLog } from '../src/models/ActivityLog';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

const PDF = Buffer.from('%PDF-1.4 fake resume');

const validFields = {
  name: 'Devyani Garg',
  email: 'devyani@example.com',
  mobile: '9876543210',
  location: 'Panipat',
  qualification: 'B.Com',
  designation: 'Consumer Relationship Management',
  topSkills: 'Communication,Problem Solving',
};

async function adminToken(): Promise<string> {
  await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
  return loginAndGetToken(ADMIN.email, ADMIN.password);
}

/** Build an .xlsx buffer from headers + row objects. */
async function buildXlsx(
  headers: string[],
  rows: Record<string, string>[]
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(headers);
  for (const row of rows) ws.addRow(headers.map((h) => row[h] ?? ''));
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

describe('Candidate ingestion API', () => {
  let token: string;
  beforeEach(async () => {
    token = await adminToken();
  });

  describe('Manual add — POST /api/candidates', () => {
    it('401 unauthenticated, 403 for recruiter', async () => {
      const unauth = await request(app).post('/api/candidates').field('name', 'x');
      expect(unauth.status).toBe(401);

      await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
      const recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
      const forbidden = await auth(request(app).post('/api/candidates'), recToken)
        .field('name', 'x')
        .attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' });
      expect(forbidden.status).toBe(403);
    });

    it('400 when PDF resume is missing', async () => {
      let req = auth(request(app).post('/api/candidates'), token);
      for (const [k, v] of Object.entries(validFields)) req = req.field(k, v);
      const res = await req; // no .attach
      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('resume');
    });

    it('400 on invalid fields (bad mobile) even with a PDF', async () => {
      const res = await auth(request(app).post('/api/candidates'), token)
        .field('name', 'X')
        .field('email', 'x@y.com')
        .field('mobile', '123') // not 10 digits
        .field('location', 'Delhi')
        .field('qualification', 'B.Tech')
        .field('designation', 'Dev')
        .attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' });
      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('mobile');
      expect(await Candidate.countDocuments()).toBe(0);
    });

    it('creates a candidate, stores resume url, logs add_candidate', async () => {
      let req = auth(request(app).post('/api/candidates'), token);
      for (const [k, v] of Object.entries(validFields)) req = req.field(k, v);
      const res = await req.attach('resume', PDF, {
        filename: 'cv.pdf',
        contentType: 'application/pdf',
      });

      expect(res.status).toBe(201);
      expect(res.body.candidate).toMatchObject({
        name: 'Devyani Garg',
        email: 'devyani@example.com',
        mobile: '9876543210',
        resumeUrl: 'https://cdn.example.com/resumes/mock-key.pdf',
      });
      expect(res.body.candidate.unique_id).toBeTruthy();
      expect(res.body.candidate.topSkills).toEqual(['Communication', 'Problem Solving']);
      // resumeText must never be exposed.
      expect(res.body.candidate).not.toHaveProperty('resumeText');

      expect(await ActivityLog.countDocuments({ type: 'add_candidate' })).toBe(1);
    });

    it('409 on duplicate email/mobile', async () => {
      const send = () => {
        let req = auth(request(app).post('/api/candidates'), token);
        for (const [k, v] of Object.entries(validFields)) req = req.field(k, v);
        return req.attach('resume', PDF, { filename: 'cv.pdf', contentType: 'application/pdf' });
      };
      expect((await send()).status).toBe(201);
      expect((await send()).status).toBe(409);
    });
  });

  describe('Bulk upload — POST /api/candidates/bulk', () => {
    const headers = ['Name', 'Email', 'Mobile', 'Location', 'Skills', 'Resume URL'];

    it('403 for recruiter', async () => {
      await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
      const recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
      const xlsx = await buildXlsx(headers, []);
      const res = await auth(request(app).post('/api/candidates/bulk'), recToken).attach(
        'file',
        xlsx,
        { filename: 'c.xlsx' }
      );
      expect(res.status).toBe(403);
    });

    it('400 when a required column is missing', async () => {
      const xlsx = await buildXlsx(['Name', 'Email', 'Mobile', 'Location', 'Skills'], []);
      const res = await auth(request(app).post('/api/candidates/bulk'), token).attach(
        'file',
        xlsx,
        { filename: 'c.xlsx' }
      );
      expect(res.status).toBe(400);
      expect(res.body.errors.missingColumns).toContain('resumeUrl');
    });

    it('imports valid rows, skips missing-url and duplicates, writes logs', async () => {
      const rows = [
        { Name: 'Alice', Email: 'alice@x.com', Mobile: '9000000001', Location: 'Delhi', Skills: 'React,Node', 'Resume URL': 'https://x.com/a.pdf' },
        { Name: 'Bob', Email: 'bob@x.com', Mobile: '9000000002', Location: 'Mumbai', Skills: 'Java', 'Resume URL': 'https://x.com/b.pdf' },
        { Name: 'NoUrl', Email: 'nourl@x.com', Mobile: '9000000003', Location: 'Pune', Skills: 'C++', 'Resume URL': '' },
        { Name: 'Alice Dup', Email: 'alice@x.com', Mobile: '9000000009', Location: 'Delhi', Skills: 'React', 'Resume URL': 'https://x.com/a2.pdf' },
      ];
      const xlsx = await buildXlsx(headers, rows);
      const res = await auth(request(app).post('/api/candidates/bulk'), token).attach(
        'file',
        xlsx,
        { filename: 'candidates.xlsx' }
      );

      expect(res.status).toBe(200);
      expect(res.body.summary).toMatchObject({ total: 4, success: 2, failed: 2 });
      expect(res.body.summary.errors).toHaveLength(2);

      expect(await Candidate.countDocuments()).toBe(2);
      const alice = await Candidate.findOne({ email: 'alice@x.com' });
      expect(alice?.skillsAll).toEqual(['React', 'Node']);
      expect(alice?.unique_id).toBeTruthy();

      const logs = await BulkUploadLog.find();
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ totalRows: 4, successRows: 2, failedRows: 2 });
      expect(await ActivityLog.countDocuments({ type: 'bulk_upload' })).toBe(1);
    });
  });
});
