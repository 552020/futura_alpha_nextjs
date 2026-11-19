import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests-unit/setup.ts'], // Enable test setup for mocking
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests-integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      // Fully commented out (pre-Clerk-removal / old storage-edges API); kept for reference.
      'tests-integration/db/storage-edges.test.ts',
      'tests-integration/api/memories/create-memory.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@/auth': resolve(__dirname, './auth.ts'),
    },
  },
});
