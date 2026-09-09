import { expect, test } from '@playwright/test';
import { mockHistoryApi } from './fixtures/historyScenarios.js';

test('explicit immersive disable keeps the legacy background and form usable', async ({ page }) => {
  const calls = await mockHistoryApi(page);
  await page.goto('/');
  await expect(page.getByPlaceholder('Ketik Peristiwa Sejarah...')).toBeVisible();
  await expect(page.locator('[data-room]')).toHaveCount(0);
  expect(calls).toEqual([]);
});
