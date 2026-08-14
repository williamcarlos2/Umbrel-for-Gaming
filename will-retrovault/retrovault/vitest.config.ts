import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      // Measure coverage across all source files, not just those imported by tests
      include: ['src/lib/**/*.ts', 'src/data/**/*.ts', 'src/hooks/**/*.ts'],
      // Exclude framework boilerplate, generated files, and client-only UI
      exclude: [
        'src/**/*.tsx',           // React components — tested via integration, not unit
        'src/app/**',             // Next.js pages/routes — API routes tested separately
        'src/types/**',           // Type declarations only
        'src/lib/fieldCache.ts',  // IndexedDB — browser-only, can't unit test in Node
        'src/lib/markdown.ts',    // Requires filesystem + remark — integration tested
        'src/middleware.ts',
        'src/proxy.ts',
        '**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
