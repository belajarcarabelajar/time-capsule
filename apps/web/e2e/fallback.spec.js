import { expect, test } from '@playwright/test';

test('explicit immersive disable keeps the legacy background and form usable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByPlaceholder('Ketik Peristiwa Sejarah...')).toBeVisible();
  await expect(page.locator('[data-room]')).toHaveCount(0);
});
