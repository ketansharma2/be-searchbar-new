import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    // In-memory Mongo download + boot can take a while on first run.
    testTimeout: 30000,
    hookTimeout: 60000,
    // Each test file gets an isolated Mongo instance; run serially for safety.
    fileParallelism: false,
  },
});
