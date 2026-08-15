import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts', 'src/**/*.spec.ts'],
  },
  resolve: {
    alias: {
      '@mcg-convoy/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
