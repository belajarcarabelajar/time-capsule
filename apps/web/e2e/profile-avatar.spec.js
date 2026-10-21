import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const picture = 'https://lh3.googleusercontent.com/a/profile-test=s96-c';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function pagesImgSrc() {
  const lines = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8').split('\n');
  const start = lines.findIndex(line => line.trim() === '/*');
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (!/^\s/.test(line)) break;
    block.push(line.trim());
  }
  const policy = block.find(line => line.startsWith('Content-Security-Policy:')).slice('Content-Security-Policy:'.length);
  const directive = policy.split(';').map(part => part.trim()).find(part => part.split(/\s+/)[0] === 'img-src');
  return directive.split(/\s+/).slice(1);
}

async function openStartScreen(page, routeAvatar) {
  const imgSrc = pagesImgSrc();
  // Only img-src is applied: the Vite dev server serves inline module preambles
  // the full production policy would block, and img-src alone governs the avatar.
  await page.route(url => url.pathname === '/', async route => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      headers: { ...response.headers(), 'content-security-policy': `img-src ${imgSrc.join(' ')}` },
    });
  });
  await page.route('**/api/auth/me', route => route.fulfill({ json: {
    authenticated: true,
    user: { id: 'fixture', name: 'Penjelajah', email: 'p@example.com', picture, points: 50, maxPoints: 50 },
  } }));
  await page.route(/generativelanguage\.googleapis\.com|api\.cloudflare\.com|agentrouter\.org|cloudflareinsights\.com/, route => route.abort());
  await page.route('https://lh3.googleusercontent.com/**', routeAvatar);
  await page.goto('/');
  const profile = page.getByRole('button', { name: /Penjelajah/ });
  await expect(profile).toBeVisible();
  return profile;
}

const avatarLoaded = page => page.evaluate(() => {
  const img = document.querySelector('img[alt="Penjelajah"]');
  return Boolean(img && img.complete && img.naturalWidth > 0);
});

test('the Google profile picture loads after login', async ({ page }) => {
  await openStartScreen(page, route => route.fulfill({ status: 200, contentType: 'image/png', body: png }));
  await expect.poll(() => avatarLoaded(page)).toBe(true);
});

test('a failed profile picture falls back to the initial', async ({ page }) => {
  const profile = await openStartScreen(page, route => route.fulfill({ status: 404, body: '' }));
  await expect(profile.getByText('P', { exact: true })).toBeVisible();
  await expect(page.locator('img[alt="Penjelajah"]')).toHaveCount(0);
});
