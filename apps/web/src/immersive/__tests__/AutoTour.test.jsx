import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import React, { useEffect } from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import HistoricalEnvironment from '../HistoricalEnvironment.jsx';

beforeEach(() => { sessionStorage.setItem('history-render-mode', '3d'); });
afterEach(() => { cleanup(); sessionStorage.clear(); });

function harness() {
  const history = [];
  const Renderer = value => {
    history.push(value);
    useEffect(() => { value.onReady(); }, [value.onReady]);
    return null;
  };
  const loadRenderer = mock(async () => ({ default: Renderer }));
  return { loadRenderer, history, current: () => history.at(-1) };
}

async function mount(base = {}) {
  const h = harness();
  const element = (props = {}) => <HistoricalEnvironment loadRenderer={h.loadRenderer} {...base} {...props} />;
  const view = render(element());
  await act(async () => {});
  const root = () => view.container.querySelector('.history-environment');
  return { h, view, root, update: props => view.rerender(element(props)) };
}

describe('auto-tour', () => {
  test('each dialogue line passes its tour stop to the renderer and the root, with drift on', async () => {
    const { h, root, update } = await mount({ storyStep: 0 });
    for (const [storyStep, id] of [[0, 'archive:wide'], [1, 'archive:sweep-left'], [2, 'archive:close-instrument']]) {
      update({ storyStep });
      expect(h.current().tourStop?.id).toBe(id);
      expect(root().getAttribute('data-tour-stop')).toBe(id);
      expect(h.current().drift).toBe(true);
    }
    expect(root().getAttribute('data-tour')).toBe('on');
    const stop = h.current().tourStop;
    update({ storyStep: 2 });
    expect(h.current().tourStop).toBe(stop);
  });

  test('the first line after the arrival reaches the renderer with the arrival already over', async () => {
    const { h, update } = await mount({ storyStep: 0 });
    expect(h.current().arriving).toBe(true);
    expect(h.current().tourStop?.id).toBe('archive:wide');
    const before = h.history.length;
    update({ storyStep: 1 });
    const after = h.history.slice(before);
    expect(after.length).toBeGreaterThan(0);
    expect(after.filter(props => props.tourStop?.id === 'archive:sweep-left').map(props => props.arriving))
      .toEqual(after.filter(props => props.tourStop?.id === 'archive:sweep-left').map(() => false));
    expect(after[0]).toMatchObject({ arriving: false, tourStop: { id: 'archive:sweep-left' } });
  });

  test('Jeda tur holds the tour stop without drift and Lanjutkan tur jumps to the current line', async () => {
    const { h, view, root, update } = await mount({ storyStep: 0 });
    update({ storyStep: 2 });
    fireEvent.click(view.getByRole('button', { name: 'Jeda tur' }));
    expect(root().getAttribute('data-tour')).toBe('paused');
    expect(h.current().drift).toBe(false);
    expect(sessionStorage.getItem('history-tour')).toBe('paused');
    for (const storyStep of [3, 4]) {
      update({ storyStep });
      expect(h.current().tourStop?.id).toBe('archive:close-instrument');
      expect(root().getAttribute('data-tour-stop')).toBe('archive:close-instrument');
    }
    fireEvent.click(view.getByRole('button', { name: 'Lanjutkan tur' }));
    expect(h.current().tourStop?.id).toBe('archive:close-map');
    expect(root().getAttribute('data-tour')).toBe('on');
    expect(h.current().drift).toBe(true);
    expect(sessionStorage.getItem('history-tour')).toBeNull();
  });

  test('the tour toggle sits after the mode button with an icon and label that follow its state', async () => {
    const { view } = await mount();
    const buttons = () => [...view.container.querySelectorAll('.history-controls__bar button')];
    const toggle = buttons()[2];
    expect(buttons()[1].getAttribute('aria-label')).toBe('Gunakan gambar');
    expect(toggle.getAttribute('aria-label')).toBe('Jeda tur');
    expect(toggle.hasAttribute('aria-pressed')).toBe(false);
    expect(toggle.querySelector('.history-controls__icon').textContent).toBe('⏸️');
    expect(toggle.querySelector('.history-controls__icon').getAttribute('aria-hidden')).toBe('true');
    expect(toggle.querySelector('.history-controls__label').textContent).toBe('Jeda tur');
    fireEvent.click(toggle);
    expect(buttons()[2].getAttribute('aria-label')).toBe('Lanjutkan tur');
    expect(buttons()[2].querySelector('.history-controls__icon').textContent).toBe('▶️');
    expect(buttons()[2].querySelector('.history-controls__label').textContent).toBe('Lanjutkan tur');
  });

  test('clicking or pressing Enter on the tour toggle does not advance the lesson', async () => {
    const h = harness();
    const advance = mock();
    const advanceKey = mock();
    const view = render(<div onClick={advance} onKeyDown={advanceKey}>
      <HistoricalEnvironment loadRenderer={h.loadRenderer} /></div>);
    await act(async () => {});
    fireEvent.click(view.getByRole('button', { name: 'Jeda tur' }));
    fireEvent.keyDown(view.getByRole('button', { name: 'Lanjutkan tur' }), { key: 'Enter' });
    expect(advance).not.toHaveBeenCalled();
    expect(advanceKey).not.toHaveBeenCalled();
  });

  test('a stored paused tour starts paused and holds the first tour stop', async () => {
    sessionStorage.setItem('history-tour', 'paused');
    const { h, view, root, update } = await mount({ storyStep: 0 });
    expect(root().getAttribute('data-tour')).toBe('paused');
    expect(view.getByRole('button', { name: 'Lanjutkan tur' })).toBeTruthy();
    expect(h.current().drift).toBe(false);
    update({ storyStep: 2 });
    expect(h.current().tourStop?.id).toBe('archive:wide');
  });

  test('a new chapter while the tour is paused starts at that chapter\'s first tour stop', async () => {
    const { h, view, update } = await mount({ chapterCount: 1, storyStep: 0 });
    update({ chapterCount: 1, storyStep: 2 });
    fireEvent.click(view.getByRole('button', { name: 'Jeda tur' }));
    expect(h.current().tourStop?.id).toBe('archive:close-instrument');
    update({ chapterCount: 2, storyStep: 0 });
    expect(h.current().tourStop?.id).toBe('archive:detail');
    update({ chapterCount: 2, storyStep: 1 });
    expect(h.current().tourStop?.id).toBe('archive:detail');
  });

  test('exploring holds the tour stop and Kembali belajar returns to the current line\'s stop', async () => {
    const { h, view, root, update } = await mount({ storyStep: 0 });
    update({ storyStep: 1 });
    fireEvent.click(view.getByRole('button', { name: 'Jelajahi ruang' }));
    update({ storyStep: 4 });
    expect(h.current().tourStop?.id).toBe('archive:sweep-left');
    expect(root().getAttribute('data-tour')).toBe('on');
    fireEvent.click(view.getByRole('button', { name: 'Kembali belajar' }));
    expect(h.current().tourStop?.id).toBe('archive:close-map');
  });

  test('the start screen has no tour stop and no tour toggle', async () => {
    const { h, view, root } = await mount({ startScreen: true });
    expect(view.getByRole('button', { name: 'Gunakan gambar' })).toBeTruthy();
    expect(h.current().tourStop).toBeNull();
    expect(h.current().drift).toBe(false);
    expect(root().getAttribute('data-tour-stop') || '').toBe('');
    expect(view.queryByRole('button', { name: 'Jeda tur' })).toBeNull();
  });

  test('poster mode has no tour toggle', async () => {
    sessionStorage.setItem('history-render-mode', 'static');
    const { view } = await mount();
    expect(view.getByRole('button', { name: 'Aktifkan 3D' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Jeda tur' })).toBeNull();
  });

  test('a renderer failure hides the tour toggle', async () => {
    const loadRenderer = mock(async () => { throw new Error('no webgl'); });
    const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
    await act(async () => {});
    expect(view.getByRole('button', { name: 'Coba 3D lagi' })).toBeTruthy();
    expect(view.queryByRole('button', { name: 'Jeda tur' })).toBeNull();
  });

  test('a blocked lesson hides the tour toggle', async () => {
    const { view, update } = await mount();
    expect(view.getByRole('button', { name: 'Jeda tur' })).toBeTruthy();
    update({ blocked: true });
    expect(view.queryByRole('button', { name: 'Jeda tur' })).toBeNull();
  });

  test('a blocked lesson still moves the tour stop with each line, with motion off', async () => {
    const { h, update } = await mount({ environmentKey: 'archive', chapterCount: 1, storyStep: 0, blocked: true });
    expect(h.current().tourStop?.id).toBe('archive:wide');
    for (const [storyStep, id] of [[1, 'archive:sweep-left'], [2, 'archive:close-instrument']]) {
      update({ storyStep, blocked: true });
      expect(h.current().tourStop?.id).toBe(id);
      expect(h.current().motionEnabled).toBe(false);
    }
  });

  test('reduced motion turns motion off but the tour stop still follows each dialogue line', async () => {
    const original = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      const { h, update } = await mount({ storyStep: 0 });
      expect(h.current().motionEnabled).toBe(false);
      expect(h.current().tourStop?.id).toBe('archive:wide');
      update({ storyStep: 2 });
      expect(h.current().tourStop?.id).toBe('archive:close-instrument');
    } finally { window.matchMedia = original; }
  });

  test('storage that throws on read and write does not break the tour or its toggle', async () => {
    const names = ['getItem', 'setItem', 'removeItem'];
    const originals = names.map(name => sessionStorage[name]);
    const spies = names.map(() => mock(() => { throw new Error('denied'); }));
    // happy-dom's Storage proxy ignores plain assignment to its methods, so spyOn cannot replace them.
    const replace = methods => names.forEach((name, index) => Object.defineProperty(sessionStorage, name,
      { value: methods[index], configurable: true, writable: true }));
    const errors = [];
    const record = event => errors.push(event.error?.message ?? event.message);
    replace(spies);
    window.addEventListener('error', record);
    try {
      const { h, view, root } = await mount({ storyStep: 1 });
      expect(h.current().tourStop?.id).toBe('archive:sweep-left');
      fireEvent.click(view.getByRole('button', { name: 'Jeda tur' }));
      expect(root().getAttribute('data-tour')).toBe('paused');
      fireEvent.click(view.getByRole('button', { name: 'Lanjutkan tur' }));
      expect(root().getAttribute('data-tour')).toBe('on');
      for (const spy of spies) expect(spy).toHaveBeenCalled();
      expect(errors).toEqual([]);
    } finally {
      window.removeEventListener('error', record);
      replace(originals);
    }
  });
});
