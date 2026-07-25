import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';
import React, { act } from 'react';
import App from '../App.jsx';

const { render, cleanup, fireEvent } = await import('@testing-library/react');

describe('App Component Integration', () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    window.AudioContext = class {
      constructor() {
        this.currentTime = 0;
      }
      createOscillator() {
        return {
          connect() {},
          start() {},
          stop() {},
          frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }
        };
      }
      createGain() {
        return {
          connect() {},
          gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }
        };
      }
      resume() { return Promise.resolve(); }
    };
  });

  afterEach(() => {
    cleanup();
    global.fetch = originalFetch;
  });

  test('renders StartScreen initially', () => {
    const { getByText, getByRole } = render(<App />);
    expect(getByText('TIME CAPSULE')).toBeTruthy();
    expect(getByRole('button', { name: /Mulai Petualangan/i })).toBeTruthy();
  });

  test('entering topic and starting game transitions to loading then gameplay', async () => {
    const mockGameData = {
      meta: { chapter: 1, title: 'Test Chapter', location: 'Test Location', year: '1945', themeColor: 'amber' },
      characters: {
        PLAYER: { id: 'PLAYER', name: 'Penjelajah', icon: '🧑🏻‍🚀', desc: 'Masa Depan' },
        NPC_1: { id: 'NPC_1', name: 'NPC 1', icon: '👤', desc: 'Desc 1' },
        NPC_2: { id: 'NPC_2', name: 'NPC 2', icon: '👤', desc: 'Desc 2' },
        NPC_3: { id: 'NPC_3', name: 'NPC 3', icon: '👤', desc: 'Desc 3' },
      },
      scenes: { MAIN: { bg: 'from-stone-900 to-black', elements: [] } },
      script: [
        { type: 'narrator', text: 'Once upon a time...' }
      ]
    };

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockGameData) }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 500 });
    });

    const { getByPlaceholderText, getByRole, getByText } = render(<App />);

    const input = getByPlaceholderText('Ketik Peristiwa Sejarah...');
    fireEvent.change(input, { target: { value: 'Indonesia' } });

    const button = getByRole('button', { name: /Mulai Petualangan/i });
    fireEvent.click(button);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(getByText('Test Location')).toBeTruthy();
    expect(getByText('INSIGHT SEJARAH')).toBeTruthy();
  });

  test('shows error message if fetchScenarioData fails', async () => {
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({ success: false, errors: ['Error'] }), { status: 500 });
    });

    const { getByPlaceholderText, getByRole, getByText } = render(<App />);

    const input = getByPlaceholderText('Ketik Peristiwa Sejarah...');
    fireEvent.change(input, { target: { value: 'Error Topic' } });

    const button = getByRole('button', { name: /Mulai Petualangan/i });
    fireEvent.click(button);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(getByText('Gagal membuka portal. Coba lagi.')).toBeTruthy();
  });
});
