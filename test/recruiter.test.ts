import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app, createUser, loginAndGetToken, auth } from './helpers';
import { ActivityLog } from '../src/models/ActivityLog';
import { RefreshToken } from '../src/models/RefreshToken';
import { DownloadLog } from '../src/models/DownloadLog';
import { User } from '../src/models/User';

const ADMIN = { email: 'admin@test.com', password: 'Admin@1234' };
const RECRUITER = { email: 'rec@test.com', password: 'Rec@12345' };

async function seedAdmin() {
  await createUser({ ...ADMIN, name: 'Admin', role: 'ADMIN' });
  return loginAndGetToken(ADMIN.email, ADMIN.password);
}

describe('Recruiter Management API', () => {
  let adminToken: string;

  beforeEach(async () => {
    adminToken = await seedAdmin();
  });

  describe('authorization (RBAC)', () => {
    it('rejects unauthenticated access with 401', async () => {
      const res = await request(app).get('/api/recruiters');
      expect(res.status).toBe(401);
    });

    it('rejects a recruiter (non-admin) with 403', async () => {
      await createUser({ ...RECRUITER, name: 'Rec', role: 'RECRUITER' });
      const recToken = await loginAndGetToken(RECRUITER.email, RECRUITER.password);
      const res = await auth(request(app).get('/api/recruiters'), recToken);
      expect(res.status).toBe(403);
    });
  });

  describe('create', () => {
    it('creates a recruiter and writes an audit log', async () => {
      const res = await auth(request(app).post('/api/recruiters'), adminToken).send({
        name: 'Jane Doe',
        email: 'jane@test.com',
        password: 'Passw0rd!',
        dailyDownloadLimit: 25,
      });
      expect(res.status).toBe(201);
      expect(res.body.recruiter).toMatchObject({
        name: 'Jane Doe',
        email: 'jane@test.com',
        role: 'RECRUITER',
        active: true,
        dailyDownloadLimit: 25,
        usedToday: 0,
      });
      expect(res.body.recruiter).not.toHaveProperty('password');

      const logs = await ActivityLog.find({ type: 'create_recruiter' });
      expect(logs).toHaveLength(1);
    });

    it('rejects short passwords (400) and never persists', async () => {
      const res = await auth(request(app).post('/api/recruiters'), adminToken).send({
        name: 'X',
        email: 'short@test.com',
        password: 'short',
      });
      expect(res.status).toBe(400);
      expect(res.body.errors).toHaveProperty('password');
      expect(await User.findOne({ email: 'short@test.com' })).toBeNull();
    });

    it('rejects duplicate email (400)', async () => {
      const body = { name: 'A', email: 'dup@test.com', password: 'Passw0rd!' };
      await auth(request(app).post('/api/recruiters'), adminToken).send(body);
      const res = await auth(request(app).post('/api/recruiters'), adminToken).send(body);
      expect(res.status).toBe(400);
      expect(res.body.errors.email).toContain('Email already exists');
    });
  });

  describe('list (search, filter, pagination)', () => {
    beforeEach(async () => {
      await createUser({ name: 'Alice Active', email: 'alice@test.com', password: 'Passw0rd!', role: 'RECRUITER', active: true });
      await createUser({ name: 'Bob Inactive', email: 'bob@test.com', password: 'Passw0rd!', role: 'RECRUITER', active: false });
      await createUser({ name: 'Carol Active', email: 'carol@test.com', password: 'Passw0rd!', role: 'RECRUITER', active: true });
    });

    it('lists only recruiters (excludes admins) with pagination meta', async () => {
      const res = await auth(request(app).get('/api/recruiters'), adminToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.pagination).toMatchObject({ page: 1, total: 3, totalPages: 1 });
      expect(res.body.data.every((r: { role: string }) => r.role === 'RECRUITER')).toBe(true);
    });

    it('filters by status=inactive', async () => {
      const res = await auth(request(app).get('/api/recruiters?status=inactive'), adminToken);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Bob Inactive');
    });

    it('searches by name/email (case-insensitive)', async () => {
      const res = await auth(request(app).get('/api/recruiters?search=alice'), adminToken);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe('alice@test.com');
    });

    it('paginates', async () => {
      const res = await auth(request(app).get('/api/recruiters?page=1&limit=2'), adminToken);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toMatchObject({ page: 1, limit: 2, total: 3, totalPages: 2 });
    });
  });

  describe('update', () => {
    it('updates fields; blank password leaves it unchanged', async () => {
      const created = await auth(request(app).post('/api/recruiters'), adminToken).send({
        name: 'Old', email: 'upd@test.com', password: 'Passw0rd!',
      });
      const id = created.body.recruiter.id;

      const res = await auth(request(app).patch(`/api/recruiters/${id}`), adminToken).send({
        name: 'New Name', dailyDownloadLimit: 50, password: '',
      });
      expect(res.status).toBe(200);
      expect(res.body.recruiter).toMatchObject({ name: 'New Name', dailyDownloadLimit: 50 });

      // Password unchanged → original login still works.
      await expect(loginAndGetToken('upd@test.com', 'Passw0rd!')).resolves.toBeTruthy();
    });

    it('returns 404 for a non-recruiter / missing id', async () => {
      const res = await auth(
        request(app).patch('/api/recruiters/64b7f9f9f9f9f9f9f9f9f9f9'),
        adminToken
      ).send({ name: 'x' });
      expect(res.status).toBe(404);
    });
  });

  describe('status toggle', () => {
    it('deactivates a recruiter, revokes their sessions, and blocks login', async () => {
      const created = await auth(request(app).post('/api/recruiters'), adminToken).send({
        name: 'Deact', email: 'deact@test.com', password: 'Passw0rd!',
      });
      const id = created.body.recruiter.id;
      // establish a session
      await loginAndGetToken('deact@test.com', 'Passw0rd!');
      expect(await RefreshToken.countDocuments()).toBeGreaterThan(0);

      const res = await auth(
        request(app).patch(`/api/recruiters/${id}/status`),
        adminToken
      ).send({ active: false });
      expect(res.status).toBe(200);
      expect(res.body.recruiter.active).toBe(false);

      // Their refresh tokens are gone.
      const recTokens = await RefreshToken.countDocuments({ user: id });
      expect(recTokens).toBe(0);

      // Login now blocked (403, deactivated).
      const login = await request(app).post('/api/auth/login').send({
        email: 'deact@test.com', password: 'Passw0rd!',
      });
      expect(login.status).toBe(403);
    });
  });

  describe('delete (cascade)', () => {
    it('hard-deletes and removes their logs/tokens', async () => {
      const created = await auth(request(app).post('/api/recruiters'), adminToken).send({
        name: 'Del', email: 'del@test.com', password: 'Passw0rd!',
      });
      const id = created.body.recruiter.id;

      // Seed some dependent records.
      await RefreshToken.create({ user: id, tokenHash: 'h', expiresAt: new Date(Date.now() + 1e6) });
      await ActivityLog.create({ user: id, type: 'login', details: {} });
      await DownloadLog.create({ user: id, candidate: id });

      const res = await auth(request(app).delete(`/api/recruiters/${id}`), adminToken);
      expect(res.status).toBe(200);

      expect(await User.findById(id)).toBeNull();
      expect(await RefreshToken.countDocuments({ user: id })).toBe(0);
      expect(await ActivityLog.countDocuments({ user: id })).toBe(0);
      expect(await DownloadLog.countDocuments({ user: id })).toBe(0);
      // The admin's own delete_recruiter audit entry remains.
      expect(await ActivityLog.countDocuments({ type: 'delete_recruiter' })).toBe(1);
    });
  });
});
