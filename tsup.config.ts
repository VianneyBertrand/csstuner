import { defineConfig } from 'tsup'

export default defineConfig([
  // Package npm (composant React)
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ['react', 'react-dom'],
    treeshake: true,
  },
  // CLI companion (npx csstuner)
  {
    entry: ['src/companion/server.ts'],
    format: ['esm'],
    platform: 'node',
    sourcemap: true,
    outDir: 'dist',
    banner: { js: '#!/usr/bin/env node' },
    noExternal: ['culori'],
  },
])
