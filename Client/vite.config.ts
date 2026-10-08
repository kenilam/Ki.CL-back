import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { federation } from '@module-federation/vite';
import { compression } from 'vite-plugin-compression2';

const root = path.dirname(fileURLToPath(import.meta.url));

// Served by Express at /client/* - base must match so chunk URLs resolve.
export default defineConfig({
  root,
  base: '/client/',
  plugins: [
    // A .gz and a .br beside each built file, which the server sends as they are.
    compression({ algorithms: ['gzip', 'brotliCompress'] }),
    react(),
    federation({
      name: 'api',
      filename: 'remoteEntry.js',
      exposes: {
        './provider': './src/index.ts',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.0.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.0.0' },
        '@apollo/client': { singleton: true, requiredVersion: '^4.0.0' },
      },
      dts: {
        generateTypes: {
          typesFolder: 'types',
          compileInChildProcess: true,
        },
      },
    }),
  ],
  resolve: {
    // Keep in sync with Client/tsconfig.json paths: "api/*" → "./src/*"
    alias: {
      api: path.resolve(root, 'src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    modulePreload: false,
    cssCodeSplit: false,
    // Do NOT set lib/external - MF shared handles react; externals leave bare
    // "react" imports that the browser cannot resolve.
  },
  server: {
    origin: 'http://localhost:3100',
  },
});
