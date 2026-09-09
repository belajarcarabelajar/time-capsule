import { expect, test } from '@playwright/test';
import { mockHistoryApi, scenario } from './fixtures/historyScenarios.js';
import { roomManifest } from '../src/immersive/rooms.js';

const rooms = [
  ['archive', 'Sejarah sumber pengetahuan', 'Ruang arsip'],
  ['ww1-field-station', 'Perang Dunia I', 'Western Front, France'],
  ['ww2-radio-room', 'Perang Dunia II', 'London, Britain'],
  ['kingdom-court', 'Majapahit', 'Java'],
  ['market-port', 'Sriwijaya', 'Palembang, Sumatra'],
  ['rural-village', 'Kehidupan petani', 'Pulau Jawa'],
  ['resistance-outpost', 'Perang Diponegoro', 'Pulau Jawa'],
  ['ancient-library', 'Perpustakaan kuno', 'Alexandria'],
];
const compositions = [
  { name: 'primary', visit: 'reveal', poster: 'poster.webp' },
  { name: 'focus', visit: 'focus', poster: 'poster-detail.webp' },
  { name: 'context', visit: 'context', poster: 'poster-context.webp' },
];

async function advanceUntil(page, target) {
  // Match the normal journey: controls consume Enter, so release focus first.
  for (let step = 0; step < 14 && !await target.isVisible(); step += 1) {
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Enter');
    await page.waitForTimeout(150);
  }
  await expect(target).toBeVisible();
}

async function nextChapter(page) {
  const answer = page.getByRole('button', { name: scenario.script[1].choices[0].text });
  await advanceUntil(page, answer);
  await answer.click();
  await expect(page.getByText(scenario.script[1].choices[0].response, { exact: false })).toBeVisible();
  await advanceUntil(page, page.getByText(scenario.script[2].text, { exact: false }));
  const continueButton = page.getByRole('button', { name: 'Ya, lanjutkan!', exact: true });
  await advanceUntil(page, continueButton);
  await continueButton.click();
}

async function assertReady(page, room) {
  await expect(room).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(room.locator('.history-canvas')).toHaveCSS('opacity', '1');
  const canvas = room.locator('canvas');
  await expect(canvas).toHaveCount(1);
  await expect(canvas).toBeVisible();
  expect(await canvas.evaluate(element => {
    const gl = element.getContext('webgl2') || element.getContext('webgl');
    return Boolean(gl && !gl.isContextLost() && gl.drawingBufferWidth > 0 && gl.drawingBufferHeight > 0);
  })).toBe(true);
  // Reduced motion applies the camera immediately; let the demand frame paint.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function assertLayout(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const selector of ['.history-controls', '.history-object-detail']) {
    const element = page.locator(selector);
    if (!await element.isVisible()) continue;
    expect(await element.evaluate(node => {
      const rect = node.getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight
        && node.scrollWidth <= node.clientWidth;
    }), `${selector} fits the viewport without clipped text`).toBe(true);
  }
}

async function capture(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

for (const [roomId, topic, location] of rooms) {
  test(`${roomId} primary, focus and context retain 3D and isolated inspection`, async ({ page, baseURL }, testInfo) => {
    const unexpected = [];
    const pageErrors = [];
    const modelRequests = [];
    const timings = [];
    const started = Date.now();
    const models = new Set();
    page.on('request', request => {
      if (new URL(request.url()).pathname === `/history/${roomId}/room.glb`) {
        modelRequests.push({ elapsedMs: Date.now() - started });
      }
    });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      const url = new URL(response.url());
      if (url.pathname.endsWith('/room.glb') && response.ok()) models.add(url.pathname);
    });
    // Registered first: fixture routes take precedence. Everything else must
    // be a local application/asset request, never a live API or remote service.
    await page.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== new URL(baseURL).origin || /^\/api(?:\/|$)/.test(url.pathname)) {
        unexpected.push(`${route.request().method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      return route.continue();
    });
    const calls = await mockHistoryApi(page, location, roomId);
    // Observe attempts too: the shared fixture aborts known provider domains.
    page.on('request', request => {
      const url = new URL(request.url());
      if (/^https?:$/.test(url.protocol) && url.origin !== new URL(baseURL).origin) {
        unexpected.push(`external ${url.origin}${url.pathname}`);
      }
    });
    await page.goto('/');
    if (roomId === 'archive') {
      // The start screen owns a separate archive scene; measure lesson loads only.
      await expect(page.locator('[data-room="archive"]')).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
      modelRequests.length = 0;
      models.clear();
    }
    await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill(topic);
    await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
    const room = page.locator(`[data-room="${roomId}"]`);
    const viewport = testInfo.project.name.endsWith('mobile') ? 'mobile' : 'desktop';
    const objects = roomManifest[roomId].objects;
    expect(objects).toHaveLength(3);

    for (const [index, composition] of compositions.entries()) {
      const compositionStarted = Date.now();
      await expect(room).toHaveAttribute('data-visit', `${roomId}-${composition.visit}`);
      await assertReady(page, room);
      const dialogue = page.getByText(scenario.script[0].text, { exact: false });
      await expect(dialogue).toBeVisible({ timeout: 15000 });
      await expect.poll(() => calls.length).toBe(index + 2);
      timings.push({ composition: composition.name, readyElapsedMs: Date.now() - compositionStarted });
      expect(models.has(`/history/${roomId}/room.glb`)).toBe(true);
      expect(modelRequests).toHaveLength(1);
      const poster = page.getByTestId('environment-poster');
      await expect(poster).toHaveAttribute('src', `/history/${roomId}/${composition.poster}`);
      await expect.poll(() => poster.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      await poster.evaluate(img => img.decode());
      await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
      await assertReady(page, room);
      await assertLayout(page);
      const name = `time-capsule-${roomId}-enrichment-${viewport}-${composition.name}`;
      await capture(page, testInfo, name);

      const object = objects[index];
      const button = page.getByRole('button', { name: object.label, exact: true });
      await button.click();
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('.history-object-detail')).toContainText(object.description);
      await assertReady(page, room);
      await assertLayout(page);
      await capture(page, testInfo, `${name}-inspection`);
      await button.press('Escape');
      await expect(page.getByRole('button', { name: 'Jelajahi ruang' })).toBeFocused();
      await expect(page.locator('.history-object-detail')).toHaveCount(0);
      await expect(dialogue).toBeVisible();
      await expect(page.getByRole('button', { name: scenario.script[1].choices[0].text })).toHaveCount(0);
      expect(calls).toEqual(Array(index + 2).fill('scenario'));
      expect(unexpected).toEqual([]);
      expect(pageErrors).toEqual([]);
      if (index < compositions.length - 1) await nextChapter(page);
    }
    expect(calls).toEqual(['scenario', 'scenario', 'scenario', 'scenario']);
    expect(modelRequests).toHaveLength(1);
    await testInfo.attach('loading-and-requests', {
      body: Buffer.from(JSON.stringify({ roomId, viewport, timings, modelRequests, scenarioCalls: calls.length,
        contextPosterDecoded: true, unexpected, pageErrors }, null, 2)),
      contentType: 'application/json',
    });
  });
}

test('market-port bounded motion observation records renderer state', async ({ page, baseURL }, testInfo) => {
  const unexpected = [];
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin || /^\/api(?:\/|$)/.test(url.pathname)) {
      unexpected.push(url.origin + url.pathname);
      return route.abort();
    }
    return route.continue();
  });
  page.on('request', request => {
    const url = new URL(request.url());
    if (/^https?:$/.test(url.protocol) && url.origin !== new URL(baseURL).origin) unexpected.push(url.origin + url.pathname);
  });
  const calls = await mockHistoryApi(page, 'Palembang, Sumatra', 'market-port');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill('Sriwijaya');
  await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
  const room = page.locator('[data-room="market-port"]');
  await expect(room).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
  // This observation measures steady ambient motion, not the arrival tween.
  // Software rendering may stretch that tween beyond a wall-clock assertion.
  await page.getByRole('button', { name: 'Lewati perjalanan' }).evaluateAll(buttons => {
    buttons[0]?.click();
  });
  await expect(room).toHaveAttribute('data-journey', 'reading');
  const states = [];
  const started = Date.now();
  // Observe a bounded steady interval with motion active and inspection closed.
  // Software rasterization cannot establish a hardware frame-rate budget.
  for (let sample = 0; sample < 10; sample += 1) {
    await page.waitForTimeout(500);
    states.push({ elapsedMs: Date.now() - started, state: await room.getAttribute('data-render-state') });
  }
  await testInfo.attach('motion-observation', {
    body: Buffer.from(JSON.stringify({ states, fallbackObserved: states.some(sample => sample.state !== 'ready') }, null, 2)),
    contentType: 'application/json',
  });
  await expect(page.getByText(scenario.script[0].text, { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Jelajahi ruang' }).click();
  await page.getByRole('button', { name: 'Dermaga', exact: true }).click();
  await expect(page.locator('.history-object-detail')).toBeVisible();
  await assertLayout(page);
  await capture(page, testInfo, `time-capsule-market-port-motion-${testInfo.project.name}`);
  expect(calls).toEqual(['scenario', 'scenario']);
  expect(unexpected).toEqual([]);
});
