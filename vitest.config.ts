import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Use jsdom for React hook tests
    environmentMatchGlobs: [
      ['tests/react/**', 'jsdom']
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'tests/**',
        'examples/**',
        'dist/**',
        '**/*.config.*',
        '**/types/**'
      ]
    },
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist']
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
});
