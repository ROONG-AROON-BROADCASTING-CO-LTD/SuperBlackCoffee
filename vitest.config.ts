import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['packages/**/*.test.{ts,tsx}', 'apps/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['apps/{admin,attendance,franchise,stock}/src/**/*.{ts,tsx}'],
      reporter: ['text-summary', 'json-summary', 'html'],
    },
  },
});
