import { defineConfig } from '@playwright/test';
import { chromiumLaunchOptions } from './playwright.launch.js';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'auto-tour.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60000,
  outputDir: '/tmp/time-capsule-tour-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5174',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    viewport: { width: 1440, height: 960 },
    launchOptions: chromiumLaunchOptions(),
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: {
    command: 'bun run dev --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
