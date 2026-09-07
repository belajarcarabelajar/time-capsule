import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'immersive.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30000,
  outputDir: '/tmp/time-capsule-browser-results',
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit', launchOptions: {} } }],
  webServer: {
    command: 'bun run dev:immersive --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
});
