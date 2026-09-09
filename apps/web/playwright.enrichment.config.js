import { defineConfig } from '@playwright/test';
import immersive from './playwright.immersive.config.js';

export default defineConfig({
  ...immersive,
  testMatch: 'visual-enrichment.spec.js',
  timeout: 90000,
  outputDir: '/tmp/time-capsule-enrichment-results',
  use: {
    ...immersive.use,
    baseURL: 'http://127.0.0.1:5176',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    locale: 'id-ID',
    timezoneId: 'Asia/Jakarta',
    colorScheme: 'dark',
    deviceScaleFactor: 1,
  },
  projects: [
    { name: 'chromium-desktop', use: { browserName: 'chromium', viewport: { width: 1440, height: 960 } } },
    { name: 'chromium-mobile', use: {
      browserName: 'chromium', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
    } },
  ],
  webServer: {
    ...immersive.webServer,
    command: 'bun run dev --host 127.0.0.1 --port 5176 --strictPort',
    url: 'http://127.0.0.1:5176',
  },
});
