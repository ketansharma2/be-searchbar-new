import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: 'Email is required' })
      .email('Please enter a valid email')
      .toLowerCase()
      .trim(),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
    // Optional client hint; the authoritative role always comes from the DB.
    role: z.enum(['ADMIN', 'RECRUITER']).optional(),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
