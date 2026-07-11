import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom'],
    alias: {
      '@time-capsule/ui': path.resolve(__dirname, '../../packages/ui/src/index.js'),
      '@time-capsule/game-engine': path.resolve(__dirname, '../../packages/game-engine/src/index.js'),
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(__dirname, '../..')],
    },
  },
});
