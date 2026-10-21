import { mkdir, writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { mockHistoryApi, tourScenario } from './fixtures/historyScenarios.js';

const archive = ['archive', 'Sejarah sumber pengetahuan', 'Ruang arsip'];
const archiveTour = ['archive:wide', 'archive:sweep-left', 'archive:close-instrument', 'archive:detail',
  'archive:close-map', 'archive:sweep-right', 'archive:close-cabinet', 'archive:overview'];
const rooms = [
  archive,
  ['ww1-field-station', 'Perang Dunia I', 'Western Front, France'],
  ['ww2-radio-room', 'Perang Dunia II', 'London, Britain'],
  ['kingdom-court', 'Majapahit', 'Java'],
  ['market-port', 'Sriwijaya', 'Palembang, Sumatra'],
  ['rural-village', 'Kehidupan petani', 'Pulau Jawa'],
  ['resistance-outpost', 'Perang Diponegoro', 'Pulau Jawa'],
  ['ancient-library', 'Perpustakaan kuno', 'Alexandria'],
];
const lines = tourScenario.script.filter(line => line.type === 'dialogue').map(line => line.text);
// The dialogue, controls and header sit over the canvas region; hide them so a
// pixel change can only come from the 3D view.
const sceneOnly = 'body * { visibility: hidden !important; } '
  + '.history-environment__scene, .history-environment__scene * { visibility: visible !important; }';

const lineText = (page, index) => page.getByText(lines[index], { exact: false });
const paint = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const canvasShot = (room, path) => room.locator('canvas').screenshot({ style: sceneOnly, ...(path ? { path } : {}) });
const pad = number => String(number).padStart(2, '0');

// With motion on, software rendering can trip the frame monitor, which swaps the
// canvas for the poster. Keep the evidence frame and record which one it shows.
async function evidenceShot(room, path) {
  const options = { style: sceneOnly, timeout: 5000, ...(path ? { path } : {}) };
  // sceneOnly hides the room root itself, so the fallback targets the scene layer.
  const scene = () => room.locator('.history-environment__scene').screenshot(options);
  let state = await room.getAttribute('data-render-state');
  const canvas = room.locator('canvas');
  let body;
  if (await canvas.count()) {
    body = await canvas.screenshot(options).catch(async error => {
      state = `${state}; canvas shot failed: ${error.message.split('\n')[0]}`;
      return scene();
    });
  } else {
    body = await scene();
  }
  return { body, state };
}

async function startLesson(page, [roomId, topic, location], environmentKey) {
  await mockHistoryApi(page, location, environmentKey, tourScenario);
  await page.goto('/');
  await page.getByPlaceholder('Ketik Peristiwa Sejarah...').fill(topic);
  await page.getByRole('button', { name: 'Mulai Petualangan' }).click();
  // The start screen owns a separate archive scene; target the lesson one.
  const room = page.locator(`.history-environment:not(.is-start)[data-room="${roomId}"]`);
  await expect(room).toHaveAttribute('data-render-state', 'ready', { timeout: 15000 });
  // Software rendering can stretch the arrival far beyond its duration; start every tour from a settled stop.
  await page.getByRole('button', { name: 'Lewati perjalanan' }).evaluateAll(buttons => { buttons[0]?.click(); });
  await expect(room).toHaveAttribute('data-journey', 'reading');
  await expect(room.locator('.history-canvas')).toHaveCSS('opacity', '1');
  await expect(room.locator('canvas')).toHaveCount(1);
  await expect(lineText(page, 0)).toBeVisible();
  await paint(page);
  return room;
}

async function pressUntil(page, reached) {
  for (let press = 0; press < 3; press += 1) {
    // Match the normal journey: controls consume Enter, so release focus first.
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.keyboard.press('Enter');
    // Enter on a line that is still typing only finishes it, so press again.
    if (await reached().then(() => true, () => false)) return;
  }
}

async function advance(page, from) {
  const next = lineText(page, from + 1);
  await pressUntil(page, () => next.waitFor({ timeout: 1500 }));
  await expect(next).toBeVisible();
}

async function advanceStop(room, page, previous) {
  await pressUntil(page, () => expect(room).not.toHaveAttribute('data-tour-stop', previous, { timeout: 1500 }));
  await expect(room).not.toHaveAttribute('data-tour-stop', previous);
}

async function markStopChanges(room) {
  await room.evaluate(node => {
    window.tourStopChangedAt = performance.now();
    new MutationObserver(() => { window.tourStopChangedAt = performance.now(); })
      .observe(node, { attributes: true, attributeFilter: ['data-tour-stop'] });
  });
}

async function waitSinceStopChange(page, ms) {
  const elapsed = await page.evaluate(() => performance.now() - window.tourStopChangedAt);
  // Evidence frames only: the glide has no observable end state to wait on.
  if (elapsed < ms) await page.waitForTimeout(ms - elapsed);
}

test('each dialogue line moves the camera to the next tour stop', async ({ page }) => {
  // Reduced motion means no drift, no dust and a demand frameloop, so a frame differs only when the camera moves.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const room = await startLesson(page, archive);
  const stops = [];
  const frames = [];
  for (let line = 0; line < 9; line += 1) {
    if (line > 0) await advance(page, line - 1);
    await paint(page);
    stops.push(await room.getAttribute('data-tour-stop'));
    frames.push(await canvasShot(room));
  }
  expect(stops).toEqual([...archiveTour, 'archive:wide']);
  for (let line = 1; line < frames.length; line += 1) {
    expect(frames[line].equals(frames[line - 1]), `line ${line + 1} shows a different view than line ${line}`).toBe(false);
  }
});

test('Jeda tur holds the stop and Lanjutkan tur resumes at the current line', async ({ page }) => {
  // Reduced motion means no drift, no dust and a demand frameloop, so a frame differs only when the camera moves.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const room = await startLesson(page, archive);
  await advance(page, 0);
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[1]);
  await expect(room).toHaveAttribute('data-tour', 'on');
  await page.getByRole('button', { name: 'Jeda tur', exact: true }).click();
  await expect(room).toHaveAttribute('data-tour', 'paused');
  await expect(page.getByRole('button', { name: 'Lanjutkan tur', exact: true })).toBeVisible();
  // The paused render has committed; a click that reached the lesson would have replaced this line.
  await expect(lineText(page, 1)).toBeVisible();
  await advance(page, 1);
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[1]);
  await advance(page, 2);
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[1]);
  await page.getByRole('button', { name: 'Lanjutkan tur', exact: true }).click();
  await expect(room).toHaveAttribute('data-tour', 'on');
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[3]);
  await expect(lineText(page, 3)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Jeda tur', exact: true })).toBeVisible();
});

test('motion on advances the tour stop and records glide evidence frames', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const room = await startLesson(page, archive);
  await markStopChanges(room);
  const states = {};
  const attachFrame = async name => {
    const { body, state } = await evidenceShot(room);
    states[name] = state;
    await testInfo.attach(name, { body, contentType: 'image/png' });
  };
  await attachFrame('glide-start');
  await advanceStop(room, page, archiveTour[0]);
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[1]);
  await waitSinceStopChange(page, 1000);
  await attachFrame('glide-mid');
  await waitSinceStopChange(page, 3500);
  await attachFrame('glide-end');
  await testInfo.attach('render-states', { body: Buffer.from(JSON.stringify(states, null, 2)), contentType: 'application/json' });
  await expect(room).toHaveAttribute('data-tour-stop', archiveTour[1]);
});

test.describe('evidence', () => {
  // Skipped at describe level so no browser starts when no folder is given.
  test.skip(!process.env.TOUR_SHOTS, 'set TOUR_SHOTS=<dir> to save every tour stop frame');

  test('visual sweep of every tour stop', async ({ page }) => {
    const dir = process.env.TOUR_SHOTS;
    test.setTimeout(15 * 60 * 1000);
    const states = {};
    for (const entry of rooms) {
      const roomId = entry[0];
      await mkdir(`${dir}/${roomId}`, { recursive: true });

      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      let room = await startLesson(page, entry, roomId);
      for (let line = 0; line < 8; line += 1) {
        if (line > 0) await advance(page, line - 1);
        await paint(page);
        const stop = await room.getAttribute('data-tour-stop');
        expect(stop, `${roomId} line ${line + 1} carries a stop of its own room`).toMatch(new RegExp(`^${roomId}:`));
        await canvasShot(room, `${dir}/${roomId}/${pad(line + 1)}-${stop.replace(':', '_')}.png`);
      }

      await page.unrouteAll({ behavior: 'ignoreErrors' });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      room = await startLesson(page, entry, roomId);
      await markStopChanges(room);
      // Eight glides: lines 2 to 9, the last one cycling back to the first stop.
      for (let line = 1; line < 9; line += 1) {
        await advanceStop(room, page, await room.getAttribute('data-tour-stop'));
        await waitSinceStopChange(page, 1000);
        const name = `mid-${pad(line + 1)}`;
        states[`${roomId}/${name}`] = (await evidenceShot(room, `${dir}/${roomId}/${name}.png`)).state;
        // Let the 2.4 s glide settle so the next one starts from a stop, not mid-air.
        await waitSinceStopChange(page, 3000);
      }
    }
    await writeFile(`${dir}/render-states.json`, JSON.stringify(states, null, 2));
  });
});
