import { connectDatabase, disconnectDatabase } from './config/db';
import { User } from './models/User';
import { hashPassword } from './utils/password';
import { env } from './config/env';

/**
 * Idempotent seed: creates (or updates password of) the ADMIN and RECRUITER
 * demo accounts. Run with `npm run seed`.
 */
async function seed(): Promise<void> {
  await connectDatabase();

  const accounts = [
    {
      name: 'Maven Admin',
      email: env.seed.adminEmail,
      password: env.seed.adminPassword,
      role: 'ADMIN' as const,
    },
    {
      name: 'Demo Recruiter',
      email: env.seed.recruiterEmail,
      password: env.seed.recruiterPassword,
      role: 'RECRUITER' as const,
      dailyDownloadLimit: 10,
    },
  ];

  for (const acc of accounts) {
    const hashed = await hashPassword(acc.password);
    const existing = await User.findOne({ email: acc.email });
    if (existing) {
      existing.name = acc.name;
      existing.password = hashed;
      existing.role = acc.role;
      existing.active = true;
      if ('dailyDownloadLimit' in acc && typeof acc.dailyDownloadLimit === 'number') {
        existing.dailyDownloadLimit = acc.dailyDownloadLimit;
      }
      await existing.save();
      console.log(`[seed] Updated ${acc.role}: ${acc.email}`);
    } else {
      await User.create({ ...acc, password: hashed, active: true });
      console.log(`[seed] Created ${acc.role}: ${acc.email}`);
    }
  }

  await disconnectDatabase();
  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('[seed] Failed:', err);
  process.exit(1);
});
