import { AppConfig } from '../models/AppConfig';

/**
 * Get allowed CORS origins from the database.
 * Falls back to CLIENT_ORIGIN env var if not found in DB.
 */
export async function getAllowedOrigins(): Promise<string[]> {
  try {
    const config = await AppConfig.findOne({ key: 'cors_allowed_origins' });
    if (config && Array.isArray(config.value)) {
      return config.value as string[];
    }
  } catch (error) {
    console.error('[config.service] Failed to fetch CORS origins from DB:', error);
  }
  
  // Fallback to environment variable
  return [];
}

/**
 * Cache for CORS origins to avoid DB queries on every request.
 * Refreshed periodically or on app startup.
 */
let cachedOrigins: string[] = [];
let lastFetch = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedAllowedOrigins(): Promise<string[]> {
  const now = Date.now();
  if (cachedOrigins.length === 0 || now - lastFetch > CACHE_TTL) {
    cachedOrigins = await getAllowedOrigins();
    lastFetch = now;
  }
  return cachedOrigins;
}
