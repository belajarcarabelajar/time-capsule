import { defineConfig } from '@playwright/test';
import immersive from './playwright.immersive.config.js';

export default defineConfig({
  ...immersive,
  testMatch: 'session-journeys.spec.js',
  timeout: 45000,
  outputDir: '/tmp/time-capsule-journey-results',
  use: { ...immersive.use, baseURL: 'http://127.0.0.1:5175' },
  webServer: {
    ...immersive.webServer,
    command: 'bun run dev --host 127.0.0.1 --port 5175 --strictPort',
    url: 'http://127.0.0.1:5175',
  },
});
