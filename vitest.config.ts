import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Minimal vitest config — intentionally does not inherit from vite.config.ts, because
 * the main build pipeline pulls in SillyTavern imports that only resolve at bundle time.
 * Tests only exercise pure parser modules, so we just need the @/ alias.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
