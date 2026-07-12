import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load environment variables from the workspace root
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), '');
  const cfAccountId = env.VITE_CF_ACCOUNT_ID || '';
  const cfApiToken = env.VITE_CF_API_TOKEN || '';

  return {
    envDir: path.resolve(__dirname, '../..'),
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
      proxy: {
        '/api/ai': {
          target: `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/meta/llama-3.1-8b-instruct`,
          changeOrigin: true,
          rewrite: () => '',
          headers: {
            'Authorization': `Bearer ${cfApiToken}`
          }
        }
      }
    },
  };
});
