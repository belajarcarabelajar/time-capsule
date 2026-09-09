import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import React, { useEffect } from 'react';
import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import HistoricalEnvironment from '../HistoricalEnvironment.jsx';

const originalUrl = window.location.href;
beforeEach(() => window.happyDOM.setURL('http://localhost:5173'));
afterEach(() => { cleanup(); sessionStorage.clear(); window.happyDOM.setURL(originalUrl); });
function harness() {
  let props;
  const Renderer = value => {
    props = value;
    useEffect(() => { value.onReady(); }, [value.onReady]);
    return null;
  };
  const loadRenderer = mock(async () => ({ default: Renderer }));
  return { loadRenderer, current: () => props };
}

test('same-room chapter changes replace the visit and poster without reloading geometry', async () => {
  sessionStorage.setItem('history-render-mode', '3d');
  const h = harness();
  const view = render(<HistoricalEnvironment chapterCount={1} loadRenderer={h.loadRenderer} />);
  await act(async () => {});
  const first = h.current().visit.id;
  view.rerender(<HistoricalEnvironment chapterCount={2} loadRenderer={h.loadRenderer} />);
  expect(view.getByTestId('environment-poster').getAttribute('src')).toContain('poster-detail.webp');
  await act(async () => {});
  expect(h.current().visit.id).not.toBe(first);
  view.rerender(<HistoricalEnvironment chapterCount={3} loadRenderer={h.loadRenderer} />);
  await act(async () => {});
  expect(h.current().visit.id).toBe('archive-context');
  expect(h.current().visit.focusObjectId).toBe('cabinet');
  expect(view.getByTestId('environment-poster').getAttribute('src')).toBe('/history/archive/poster-context.webp');
  view.rerender(<HistoricalEnvironment chapterCount={4} loadRenderer={h.loadRenderer} />);
  await act(async () => {});
  expect(h.current().visit.id).toBe(first);
  expect(view.getByTestId('environment-poster').getAttribute('src')).toBe('/history/archive/poster.webp');
  expect(h.loadRenderer).toHaveBeenCalledTimes(1);
});

test('skip cancels arrival without advancing learning or replaying on unblocking', async () => {
  sessionStorage.setItem('history-render-mode', '3d');
  const h = harness();
  const advance = mock();
  const content = blocked => <div onClick={advance}><HistoricalEnvironment blocked={blocked} loadRenderer={h.loadRenderer} /></div>;
  const view = render(content(false));
  await act(async () => {});
  expect(h.current().arriving).toBe(true);
  fireEvent.click(view.getByRole('button', { name: 'Lewati perjalanan' }));
  expect(h.current().arriving).toBe(false);
  expect(advance).not.toHaveBeenCalled();
  view.rerender(content(true));
  expect(h.current().motionEnabled).toBe(false);
  view.rerender(content(false));
  expect(h.current().arriving).toBe(false);
});

test('mounting while blocked defers arrival until the lesson unblocks', async () => {
  sessionStorage.setItem('history-render-mode', '3d');
  const h = harness();
  const content = blocked => <HistoricalEnvironment blocked={blocked} loadRenderer={h.loadRenderer} />;
  const view = render(content(true));
  await act(async () => {});
  expect(h.current().arriving).toBe(false);
  expect(h.current().motionEnabled).toBe(false);
  view.rerender(content(false));
  await act(async () => {});
  expect(h.current().arriving).toBe(true);
  expect(view.queryByRole('button', { name: 'Lewati perjalanan' })).not.toBeNull();
});

test('blocking mid-arrival cancels it without replay on unblock', async () => {
  sessionStorage.setItem('history-render-mode', '3d');
  const h = harness();
  const content = blocked => <HistoricalEnvironment blocked={blocked} loadRenderer={h.loadRenderer} />;
  const view = render(content(false));
  await act(async () => {});
  expect(h.current().arriving).toBe(true);
  view.rerender(content(true));
  expect(h.current().arriving).toBe(false);
  view.rerender(content(false));
  expect(h.current().arriving).toBe(false);
});

test('changing reduced motion cancels arrival and does not replay when restored', async () => {
  sessionStorage.setItem('history-render-mode', '3d');
  const original = window.matchMedia;
  let listener;
  const query = { matches: false, addEventListener: (_, fn) => { listener = fn; }, removeEventListener() {} };
  window.matchMedia = () => query;
  try {
    const h = harness();
    render(<HistoricalEnvironment loadRenderer={h.loadRenderer} />);
    await act(async () => {});
    act(() => { query.matches = true; listener(); });
    expect(h.current().arriving).toBe(false);
    expect(h.current().motionEnabled).toBe(false);
    act(() => { query.matches = false; listener(); });
    expect(h.current().arriving).toBe(false);
  } finally { window.matchMedia = original; }
});
