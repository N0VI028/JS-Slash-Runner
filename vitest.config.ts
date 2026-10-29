import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Minimal vitest config — intentionally does not inherit from vite.config.ts, because
 * the main build pipeline pulls in SillyTavern imports that only resolve at bundle time.
 * Use a small event/chat fixture for DOM recovery tests; never load a live server in unit tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@sillytavern/script': path.resolve(__dirname, 'tests/fixtures/sillytavern.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
