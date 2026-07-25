import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { fetchScenarioData, SoundEngine } from '@time-capsule/game-engine';

mock.module('@time-capsule/game-engine', () => ({
  fetchScenarioData: mock(),
  SoundEngine: {
    init: mock(),
    playClick: mock(),
    playType: mock(),
    playWarp: mock(),
    playCorrect: mock(),
    playWrong: mock(),
    playTheme: mock(),
    stopTheme: mock(),
    playNarrator: mock(),
  }
}));

describe('App Component Integration', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    fetchScenarioData.mockClear();
    SoundEngine.playWarp.mockClear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('renders StartScreen initially', () => {
    act(() => {
      root.render(<App />);
    });
    expect(container.innerHTML).toContain('TIME CAPSULE');
    expect(container.innerHTML).toContain('Mulai Petualangan');
  });

  test('entering topic and starting game transitions to loading then gameplay', async () => {
    const mockGameData = {
      meta: { chapter: 1, title: 'Test Chapter', location: 'Test Location', year: '1945' },
      mood: 'neutral',
      characters: { 'PLAYER': { name: 'Player' } },
      script: [
        { type: 'narrator', text: 'Once upon a time...' }
      ]
    };

    fetchScenarioData.mockResolvedValue(mockGameData);

    act(() => {
      root.render(<App />);
    });

    const input = container.querySelector('input');
    act(() => {
      fireEvent.change(input, { target: { value: 'Indonesia' } });
    });

    const button = container.querySelector('button[type="submit"]');

    act(() => {
      fireEvent.click(button);
    });

    // Asserting the loading state
    expect(container.innerHTML).toContain('Membuka Portal');

    expect(SoundEngine.init).toHaveBeenCalled();
    expect(SoundEngine.playWarp).toHaveBeenCalled();
    expect(fetchScenarioData).toHaveBeenCalledWith('Indonesia', 1, '');

    await act(async () => {
      await Promise.resolve();
    });

    // We verify the actual presence of elements, NarratorBox has INSIGHT SEJARAH, Location is rendered.
    expect(container.innerHTML).toContain('Test Location');
    expect(container.innerHTML).toContain('INSIGHT SEJARAH');
  });

  test('shows error message if fetchScenarioData fails', async () => {
    const error = new Error('Network error');
    fetchScenarioData.mockImplementation(() => Promise.reject(error));

    act(() => {
      root.render(<App />);
    });

    const input = container.querySelector('input');
    act(() => {
      fireEvent.change(input, { target: { value: 'Error Topic' } });
    });

    const button = container.querySelector('button[type="submit"]');
    act(() => {
      fireEvent.click(button);
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(container.innerHTML).toContain('Gagal membuka portal');
  });
});
