import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { '@': '/src' },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/area-scoring.ts', 'src/lib/model-v2-clinical.ts'],
      reporter: ['text', 'html'],
    },
  },
});
