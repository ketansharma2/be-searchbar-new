import request, { type Test } from 'supertest';
import type { Application } from 'express';
import { createApp } from '../src/app';
import { User, type Role } from '../src/models/User';
import { hashPassword } from '../src/utils/password';

export const app: Application = createApp();

export async function createUser(overrides: {
  name?: string;
  email: string;
  password: string;
  role: Role;
  active?: boolean;
  dailyDownloadLimit?: number;
}) {
  return User.create({
    name: overrides.name ?? 'Test User',
    email: overrides.email,
    password: await hashPassword(overrides.password),
    role: overrides.role,
    active: overrides.active ?? true,
    dailyDownloadLimit: overrides.dailyDownloadLimit ?? 10,
  });
}

/** Log a user in and return their access token. */
export async function loginAndGetToken(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password });
  if (res.status !== 200) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body.accessToken as string;
}

/** Attach a Bearer token to a supertest request. */
export function auth(req: Test, token: string): Test {
  return req.set('Authorization', `Bearer ${token}`);
}
