import mongoose from 'mongoose';
import { env } from './env';

/**
 * Establish a singleton MongoDB connection.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected');
  });
  mongoose.connection.on('error', (err) => {
    console.error('[db] MongoDB connection error:', err.message);
  });
  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected');
  });

  await mongoose.connect(env.mongoUri);
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
