import { defineConfig } from 'tsup';

export default defineConfig([
  // Main build (backwards compatibility)
  {
    entry: ['src/index.ts'],
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    platform: 'node',
    target: 'node16',
    external: ['axios', 'eventemitter3', 'react']
  },
  // Server build (Node.js) - for API routes
  {
    entry: { 'server/index': 'src/server/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    platform: 'node',
    target: 'node16',
    external: ['axios', 'eventemitter3']
  },
  // React build (Browser) - for React components
  {
    entry: { 'react/index': 'src/react/index.ts' },
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    platform: 'browser',
    target: 'es2020',
    external: ['react'],
    esbuildOptions(options) {
      options.external = ['fs', 'path', 'http', 'https', 'stream', 'zlib'];
    }
  }
]);
