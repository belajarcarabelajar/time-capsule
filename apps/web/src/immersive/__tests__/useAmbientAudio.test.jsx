import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { act, cleanup, renderHook } from '@testing-library/react';
import useAmbientAudio from '../useAmbientAudio.js';

const original = globalThis.Audio;
let created;
beforeEach(() => {
  created = [];
  globalThis.Audio = class {
    play = mock(() => Promise.resolve());
    pause = mock();
    load = mock();
    removeAttribute = mock();
    addEventListener = mock();
    removeEventListener = mock();
    constructor(url) { this.url = url; created.push(this); }
  };
});
afterEach(() => { cleanup(); globalThis.Audio = original; });
test('disabled audio never loads; hiding and unmount release playback', () => {
  const view = renderHook(({ enabled, visible }) => useAmbientAudio('/history/room-tone.mp3', enabled, visible), {
    initialProps: { enabled: false, visible: true },
  });
  expect(created).toHaveLength(0);
  view.rerender({ enabled: true, visible: true });
  expect(created[0].play).toHaveBeenCalledTimes(1);
  view.rerender({ enabled: true, visible: false });
  expect(created[0].pause).toHaveBeenCalledTimes(1);
  expect(created[0].removeAttribute).toHaveBeenCalledWith('src');
});
test('synchronous browser playback denial stays inside the optional audio layer', async () => {
  globalThis.Audio = class extends original {
    play() { throw new Error('Playback denied'); }
    load() {}
    pause() {}
  };
  let view;
  await act(async () => { view = renderHook(() => useAmbientAudio('/history/room-tone.mp3', true, true)); });
  expect(view.result.current).toBe(true);
});
