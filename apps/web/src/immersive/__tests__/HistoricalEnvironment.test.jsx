import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import React from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import HistoricalEnvironment from '../HistoricalEnvironment.jsx';

beforeEach(() => { sessionStorage.setItem('history-render-mode', 'static'); });
afterEach(() => { cleanup(); sessionStorage.clear(); });
describe('3d-default historical environment', () => {
  test('3d loads by default; save-data stays on the poster', async () => {
    sessionStorage.removeItem('history-render-mode');
    const loadRenderer = mock(async () => ({ default: () => null }));
    const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
    await act(async () => {});
    expect(loadRenderer).toHaveBeenCalledTimes(1);
    expect(view.getByRole('button', { name: 'Gunakan gambar' })).toBeTruthy();
    cleanup();
    const connection = navigator.connection;
    try {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
      const staticLoader = mock(() => new Promise(() => {}));
      render(<HistoricalEnvironment loadRenderer={staticLoader} />);
      expect(staticLoader).not.toHaveBeenCalled();
    } finally {
      if (connection === undefined) delete navigator.connection;
      else Object.defineProperty(navigator, 'connection', { value: connection, configurable: true });
    }
  });
  test('static poster and accessible inspection work without loading WebGL', () => {
    const loadRenderer = mock(() => new Promise(() => {}));
    const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
    expect(view.getByTestId('environment-poster')).toBeTruthy();
    expect(loadRenderer).not.toHaveBeenCalled();
    fireEvent.click(view.getByRole('button', { name: 'Jelajahi ruang' }));
    expect(view.getByRole('group', { name: 'Benda dalam ruang' })).toBeTruthy();
    fireEvent.click(view.getByRole('button', { name: 'Kembali belajar' }));
    expect(view.queryByRole('group', { name: 'Benda dalam ruang' })).toBeNull();
  });
  test('uses a valid environment key for the illustrative kingdom room', () => {
    const view = render(<HistoricalEnvironment topic="Majapahit" location="Java" environmentKey="kingdom-court" />);
    expect(view.container.querySelector('[data-room="kingdom-court"]')).toBeTruthy();
    expect(view.getByTestId('environment-poster').getAttribute('src')).toBe('/history/kingdom-court/poster.webp');
  });
  test('controls never bubble learning clicks or Enter; Escape returns focus', () => {
    const advance = mock();
    const view = render(<div onClick={advance} onKeyDown={advance}><HistoricalEnvironment /></div>);
    const explore = view.getByRole('button', { name: 'Jelajahi ruang' });
    fireEvent.click(explore);
    fireEvent.keyDown(view.getByRole('button', { name: 'Kembali belajar' }), { key: 'Enter' });
    fireEvent.keyDown(view.getByRole('button', { name: 'Kembali belajar' }), { key: 'Escape' });
    expect(advance).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(explore);
  });
  test('blocked gameplay closes and hides inspection controls', () => {
    const view = render(<HistoricalEnvironment />);
    fireEvent.click(view.getByRole('button', { name: 'Jelajahi ruang' }));
    view.rerender(<HistoricalEnvironment blocked />);
    expect(view.queryByRole('button', { name: 'Kembali belajar' })).toBeNull();
    expect(view.queryByRole('button', { name: 'Jelajahi ruang' })).toBeNull();
  });
  test('an explicit 3D choice survives a room remount without enabling motion', async () => {
    sessionStorage.setItem('history-render-mode', '3d');
    const loadRenderer = mock(async () => ({ default: () => null }));
    const query = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    try {
      const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
      await act(async () => {});
      expect(loadRenderer).toHaveBeenCalledTimes(1);
      fireEvent.click(view.getByRole('button', { name: 'Jelajahi ruang' }));
      expect(view.queryByRole('button', { name: 'Aktifkan gerakan' })).toBeNull();
    } finally { window.matchMedia = query; }
  });
  test('keyboard view buttons update camera offset without advancing the story', async () => {
    let offset;
    const loadRenderer = async () => ({ default: props => { offset = props.viewOffset; return null; } });
    const advance = mock();
    const view = render(<div onClick={advance}><HistoricalEnvironment loadRenderer={loadRenderer} /></div>);
    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Aktifkan 3D' })));
    fireEvent.click(view.getByRole('button', { name: 'Jelajahi ruang' }));
    fireEvent.click(view.getByRole('button', { name: 'Lihat ke kiri' }));
    expect(offset.yaw).toBeLessThan(0);
    expect(advance).not.toHaveBeenCalled();
  });
  test('failed lazy import leaves poster and learning UI usable with explicit retry', async () => {
    const loadRenderer = mock(() => Promise.reject(new Error('offline')));
    const view = render(<><p>Belajar tetap tersedia</p><HistoricalEnvironment loadRenderer={loadRenderer} /></>);
    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Aktifkan 3D' })));
    expect(view.getByText('Belajar tetap tersedia')).toBeTruthy();
    expect(view.getByTestId('environment-poster')).toBeTruthy();
    expect(view.getByRole('button', { name: 'Coba 3D lagi' })).toBeTruthy();
  });
  test('old lazy loads cannot replace a new selected room', async () => {
    let finish;
    const loadRenderer = () => new Promise(resolve => { finish = resolve; });
    const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
    await act(async () => fireEvent.click(view.getByRole('button', { name: 'Aktifkan 3D' })));
    await act(async () => view.rerender(<HistoricalEnvironment topic="WWII" location="London" loadRenderer={loadRenderer} />));
    const stale = finish;
    view.rerender(<HistoricalEnvironment topic="WWI" location="France" loadRenderer={loadRenderer} />);
    await act(async () => stale({ default: () => <div>stale renderer</div> }));
    expect(view.queryByText('stale renderer')).toBeNull();
  });
  test('ten-second timeout preserves poster and ignores late import completion', async () => {
    const original = globalThis.setTimeout;
    let timeout;
    let complete;
    globalThis.setTimeout = (callback, duration, ...args) => {
      if (duration === 10000) { timeout = callback; return 999999; }
      return original(callback, duration, ...args);
    };
    try {
      const loadRenderer = () => new Promise(resolve => { complete = resolve; });
      const view = render(<HistoricalEnvironment loadRenderer={loadRenderer} />);
      await act(async () => fireEvent.click(view.getByRole('button', { name: 'Aktifkan 3D' })));
      act(() => timeout());
      await act(async () => complete({ default: () => <div>late scene</div> }));
      expect(view.queryByText('late scene')).toBeNull();
      expect(view.getByTestId('environment-poster')).toBeTruthy();
      expect(view.getByRole('button', { name: 'Coba 3D lagi' })).toBeTruthy();
    } finally { globalThis.setTimeout = original; }
  });
});
