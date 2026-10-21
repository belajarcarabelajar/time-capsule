import { defineConfig } from '@playwright/test';
import { chromiumLaunchOptions } from './playwright.launch.js';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'fallback.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  outputDir: '/tmp/time-capsule-browser-results-fallback',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5178',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: chromiumLaunchOptions(),
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'VITE_IMMERSIVE_ENABLED=false bun run dev --host 127.0.0.1 --port 5178 --strictPort',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
