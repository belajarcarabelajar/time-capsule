import { expect, test } from '@playwright/test';
import { mockHistoryApi } from './fixtures/historyScenarios.js';

async function startLesson(page) {
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill('Sriwijaya');
  await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
  await expect(page.locator('[data-room="market-port"]')).toBeVisible();
  await expect(page.getByText('Selamat datang di ruang belajar sejarah.', { exact: false })).toBeVisible();
}

async function advanceUntil(page, target) {
  // Lesson advance listens to Enter on window and to clicks bubbling from the
  // dialogue layer. Control buttons hold focus and swallow Enter, so blur
  // first to guarantee the key reaches the lesson handler.
  for (let step = 0; step < 14 && !await target.isVisible(); step += 1) {
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await expect(target).toBeVisible();
}

async function finishLesson(page) {
  await advanceUntil(page, page.getByRole('button', { name: 'Membandingkan sumber' }));
  await page.getByRole('button', { name: 'Membandingkan sumber' }).click();
  await expect(page.getByText('Tepat, bandingkan sumber.', { exact: false })).toBeVisible();
  await advanceUntil(page, page.getByText('Sumber membantu kita memahami masa lalu.', { exact: false }));
  await advanceUntil(page, page.getByRole('button', { name: 'Ya, lanjutkan!' }));
}

for (const width of [320, 390]) {
  test(`poster visits change within one topic and preserve lesson flow at ${width}px`, async ({ page }) => {
    const calls = await mockHistoryApi(page, 'Palembang, Sumatra', 'market-port');
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => sessionStorage.setItem('history-render-mode', 'static'));
    await startLesson(page);
    const room = page.locator('[data-room="market-port"]');
    await expect(room).toHaveAttribute('data-visit', 'market-port-reveal');
    await expect(page.locator('canvas')).toHaveCount(0);
    await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
    await page.getByRole('button', { name: 'Dermaga', exact: true }).click();
    await expect(page.locator('.history-object-detail')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Membandingkan sumber' })).not.toBeVisible();
    await page.getByRole('button', { name: 'Kembali belajar' }).click();
    await finishLesson(page);
    await page.getByRole('button', { name: 'Ya, lanjutkan!' }).click();
    await expect(room).toHaveAttribute('data-visit', 'market-port-focus');
    await expect(page.getByTestId('environment-poster')).toHaveAttribute('src', '/history/market-port/poster-detail.webp');
    await expect(page.getByTestId('environment-poster')).toHaveJSProperty('naturalWidth', 1440);
    await expect(page.getByText('Selamat datang di ruang belajar sejarah.', { exact: false })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/time-capsule-journey-${width}.png`, fullPage: true });
    await finishLesson(page);
    await page.getByRole('button', { name: 'Pulang ke Masa Depan' }).click();
    await expect(page.getByPlaceholder('Ketik Peristiwa Sejarah...')).toBeVisible();
    await expect(page.locator('[data-room="archive"]')).toHaveAttribute('data-visit', 'archive-reveal');
    expect(calls).toEqual(['scenario', 'scenario', 'scenario']);
  });
}

test('reduced motion retains 3D and switches visit without an arrival animation', async ({ page }) => {
  const calls = await mockHistoryApi(page, 'Palembang, Sumatra', 'market-port');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startLesson(page);
  const room = page.locator('[data-room="market-port"]');
  await expect(room).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(page.getByRole('button', { name: 'Lewati perjalanan' })).toHaveCount(0);
  await finishLesson(page);
  await page.getByRole('button', { name: 'Ya, lanjutkan!' }).click();
  await expect(room).toHaveAttribute('data-visit', 'market-port-focus');
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(page.locator('canvas')).toHaveCount(1);
  expect(calls).toEqual(['scenario', 'scenario', 'scenario']);
});

test('arrival can be skipped and manual motion pause survives the next visit', async ({ page }) => {
  const calls = await mockHistoryApi(page, 'Palembang, Sumatra', 'market-port');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill('Sriwijaya');
  // Observe and click in one browser frame: separate driver round trips can
  // outlast the short arrival while software rendering blocks the main thread.
  await Promise.all([
    page.waitForFunction(() => {
      const button = document.querySelector('[data-room="market-port"] .history-arrival button');
      if (!button?.getClientRects().length) return false;
      button.click();
      return true;
    }, null, { polling: 'raf', timeout: 15000 }),
    page.getByRole('button', { name: 'Mulai Petualangan' }).click(),
  ]);
  const room = page.locator('[data-room="market-port"]');
  const skip = page.getByRole('button', { name: 'Lewati perjalanan' });
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(page.getByRole('button', { name: 'Jelajahi ruang' })).toBeFocused();
  await expect(room).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await page.getByRole('button', { name: 'Jeda gerakan' }).click();
  await page.getByRole('button', { name: 'Kembali belajar' }).click();
  await finishLesson(page);
  await page.getByRole('button', { name: 'Ya, lanjutkan!' }).click();
  await expect(room).toHaveAttribute('data-visit', 'market-port-focus');
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(skip).toHaveCount(0);
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await expect(page.getByRole('button', { name: 'Aktifkan gerakan' })).toBeVisible();
  expect(calls).toEqual(['scenario', 'scenario', 'scenario']);
});
