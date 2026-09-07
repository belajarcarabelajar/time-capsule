import { expect, test } from '@playwright/test';
import { mockHistoryApi } from './fixtures/historyScenarios.js';

for (const [topic, location, room, object, environmentKey] of [
  ['Perang Dunia I', 'Western Front, France', 'ww1-field-station', 'Telepon lapangan'],
  ['Perang Dunia II', 'London, Britain', 'ww2-radio-room', 'Penerima radio'],
  ['Majapahit', 'Java', 'kingdom-court', 'Kursi upacara', 'kingdom-court'],
  ['Sriwijaya', 'Palembang, Sumatra', 'market-port', 'Dermaga', 'market-port'],
  ['Kehidupan petani', 'Pulau Jawa', 'rural-village', 'Sawah', 'rural-village'],
]) {
  test(`${room} loads authored geometry and inspection without extra generation`, async ({ page }) => {
    const calls = await mockHistoryApi(page, location, environmentKey);
    await page.setViewportSize({ width: 1440, height: 960 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill(topic);
    await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
    await expect(page.locator(`[data-room="${room}"]`)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gunakan gambar' })).toBeVisible();
    await expect(page.locator(`[data-room="${room}"]`)).toHaveAttribute('data-render-state', 'ready', { timeout: 12000 });
    await expect(page.locator('canvas')).toHaveCount(1);
    await page.screenshot({ path: `/tmp/time-capsule-${room}-desktop.png`, fullPage: true });
    await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
    await page.getByRole('button', { name: object, exact: true }).click();
    await expect(page.locator('.history-object-detail')).toBeVisible();
    await page.getByRole('button', { name: object, exact: true }).press('Escape');
    await expect(page.getByRole('button', { name: 'Jelajahi ruang' })).toBeFocused();
    expect(calls.filter(call => call === 'scenario')).toHaveLength(2);
    expect(calls).toHaveLength(2);
  });
}

test('kingdom-court loads 3D by default on mobile without creating extra content', async ({ page }) => {
  const calls = await mockHistoryApi(page, 'Java', 'kingdom-court');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill('Majapahit');
  await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
  await expect(page.locator('[data-room="kingdom-court"]')).toBeVisible();
  await expect(page.locator('[data-room="kingdom-court"]')).toHaveAttribute('data-render-state', 'ready', { timeout: 12000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await page.getByRole('button', { name: 'Kursi upacara', exact: true }).click();
  await expect(page.locator('.history-object-detail')).toContainText('bukan salinan singgasana');
  expect(calls.filter(call => call === 'scenario')).toHaveLength(2);
  expect(calls).toHaveLength(2);
  await page.screenshot({ path: '/tmp/time-capsule-kingdom-court-mobile.png', fullPage: true });
});

test('archive scene renders real 3D with motion paused behind the original topic form', async ({ page }) => {
  await mockHistoryApi(page);
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.getByPlaceholder('Ketik Peristiwa Sejarah...')).toBeVisible();
  await expect(page.locator('[data-room="archive"]')).toBeVisible();
  await expect(page.locator('[data-room="archive"]')).toHaveAttribute('data-render-state', 'ready', { timeout: 12000 });
  await expect(page.locator('canvas')).toHaveCount(1);
  await page.screenshot({ path: '/tmp/time-capsule-archive-desktop.png', fullPage: true });
  await expect(page.locator('canvas')).toHaveCount(1);
});

test('save-data stays on the poster and keeps the form usable', async ({ page }) => {
  const calls = await mockHistoryApi(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { saveData: true } });
  });
  await page.goto('/');
  await expect(page.locator('[data-room="archive"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await page.getByRole('button', { name: 'Instrumen waktu', exact: true }).click();
  await expect(page.locator('.history-object-detail')).toContainText('bukan artefak sejarah');
  await page.getByRole('button', { name: 'Instrumen waktu', exact: true }).press('Escape');
  await expect(page.getByRole('button', { name: 'Jelajahi ruang' })).toBeFocused();
  expect(calls).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/tmp/time-capsule-archive-mobile.png', fullPage: true });
});

test('asset failure keeps the lesson and isolated inspection usable', async ({ page }) => {
  const calls = await mockHistoryApi(page);
  await page.route('**/history/**/*.glb', route => route.abort());
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill('Perang Dunia I');
  await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
  await expect(page.locator('[data-room="ww1-field-station"]')).toBeVisible();
  await expect(page.getByText('Selamat datang di ruang belajar sejarah.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await page.getByRole('button', { name: 'Telepon lapangan', exact: true }).click();
  await page.getByRole('button', { name: 'Telepon lapangan', exact: true }).press('Enter');
  await expect(page.getByText('Bagaimana kita memeriksa sebuah cerita?')).not.toBeVisible();
  await page.getByRole('button', { name: 'Kembali belajar' }).click();
  expect(calls.filter(call => call === 'scenario')).toHaveLength(2);
  expect(calls).toHaveLength(2);
});
