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

const createMockGameData = (chapter = 1, location = 'Test Location') => ({
  meta: { chapter, title: `Test Chapter ${chapter}`, location: `${location} ${chapter}`, year: '1945', themeColor: 'amber' },
  characters: {
    PLAYER: { id: 'PLAYER', name: 'Penjelajah', icon: '🧑🏻‍🚀', desc: 'Masa Depan' },
    NPC_1: { id: 'NPC_1', name: 'Soekarno', icon: '👤', desc: 'Tokoh Proklamator' },
    NPC_2: { id: 'NPC_2', name: 'Hatta', icon: '👤', desc: 'Wakil Presiden' },
    NPC_3: { id: 'NPC_3', name: 'NPC 3', icon: '👤', desc: 'Desc 3' },
  },
  scenes: { MAIN: { bg: 'from-stone-900 to-black', elements: [] } },
  script: [
    { type: 'narrator', text: 'Halo Penjelajah Waktu!' },
    { type: 'dialogue', speakerId: 'NPC_1', mood: 'happy', text: 'Selamat datang di Rengasdengklok.' },
    {
      type: 'quiz',
      speakerId: 'NPC_1',
      mood: 'thinking',
      text: 'Kapan Proklamasi dibacakan?',
      choices: [
        { text: '17 Agustus 1945', correct: true, response: 'Tepat sekali!' },
        { text: '10 November 1945', correct: false, response: 'Kurang tepat.' }
      ]
    },
    { type: 'narrator', text: 'Akhir dari Bab ini.' }
  ]
});

describe('App Component Integration', () => {
  let originalFetch;
  let writeTextMock;

  beforeEach(() => {
    originalFetch = global.fetch;
    writeTextMock = mock(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true
    });

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
    const mockGameData = createMockGameData(1, 'Jakarta');

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

    expect(getByText('Jakarta 1')).toBeTruthy();
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

  test('handles Copy Error Log functionality', async () => {
    global.fetch = mock(async () => {
      return new Response(JSON.stringify({ success: false, errors: ['Error'] }), { status: 500 });
    });

    const { getByPlaceholderText, getByRole, getByText } = render(<App />);

    const input = getByPlaceholderText('Ketik Peristiwa Sejarah...');
    fireEvent.change(input, { target: { value: 'Broken Scenario' } });

    const button = getByRole('button', { name: /Mulai Petualangan/i });
    fireEvent.click(button);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const copyBtn = getByRole('button', { name: /Salin Detail Eror/i });
    expect(copyBtn).toBeTruthy();

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalled();
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain('=== TIME CAPSULE ERROR LOG ===');
    expect(copiedText).toContain('Topic: Broken Scenario');
  });

  test('supports Keyboard navigation and handles Quiz flow seamlessly', async () => {
    const mockGameData = createMockGameData(1, 'Bandung');

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockGameData) }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 500 });
    });

    const { getByText, queryByText, queryAllByText, getByRole } = render(<App />);

    const input = getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Proklamasi' } });
    fireEvent.click(getByRole('button', { name: /Mulai Petualangan/i }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    const mainContainer = document.querySelector('.fixed');

    // Advance to Step 1: Dialogue (Soekarno)
    let soekarnoText = queryByText(/Soekarno/i);
    for (let i = 0; i < 6 && !soekarnoText; i++) {
      await act(async () => { fireEvent.click(mainContainer); });
      soekarnoText = queryByText(/Soekarno/i);
    }
    expect(soekarnoText).toBeTruthy();

    // Advance to Step 2: Quiz Popup
    let quizHeading = queryByText('Pertanyaan / Kuis');
    for (let i = 0; i < 6 && !quizHeading; i++) {
      await act(async () => { fireEvent.click(mainContainer); });
      quizHeading = queryByText('Pertanyaan / Kuis');
    }

    expect(quizHeading).toBeTruthy();
    expect(queryAllByText(/Kapan Proklamasi dibacakan/i).length).toBeGreaterThan(0);
    const choiceOption = getByText(/17 Agustus 1945/i).closest('button');
    expect(choiceOption).toBeTruthy();

    // Click answer choice
    await act(async () => {
      fireEvent.click(choiceOption);
    });

    // Complete feedback typing
    await act(async () => {
      fireEvent.click(mainContainer);
    });

    // Feedback should be shown in DialogueBox
    expect(getByText(/Tepat sekali/i)).toBeTruthy();

    // Advance past feedback to Step 3 (Narrator)
    let endNarrator = queryByText(/Akhir dari Bab ini/i);
    for (let i = 0; i < 6 && !endNarrator; i++) {
      await act(async () => { fireEvent.click(mainContainer); });
      endNarrator = queryByText(/Akhir dari Bab ini/i);
    }

    expect(endNarrator).toBeTruthy();
  });

  test('multi-chapter progression and preloading transition', async () => {
    const simpleChapter1 = {
      ...createMockGameData(1, 'Surabaya'),
      script: [
        { type: 'narrator', text: 'Bab 1 dimuai' },
        { type: 'narrator', text: 'Bab 1 selesai' }
      ]
    };
    const simpleChapter2 = {
      ...createMockGameData(2, 'Surabaya'),
      script: [
        { type: 'narrator', text: 'Bab 2 dimulai' }
      ]
    };

    let requestCount = 0;
    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        requestCount++;
        const responseData = requestCount === 1 ? simpleChapter1 : simpleChapter2;
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(responseData) }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 500 });
    });

    const { getByPlaceholderText, getByRole, getByText } = render(<App />);

    fireEvent.change(getByPlaceholderText('Ketik Peristiwa Sejarah...'), { target: { value: 'Pertempuran Surabaya' } });
    fireEvent.click(getByRole('button', { name: /Mulai Petualangan/i }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 150));
    });

    expect(getByText('Surabaya 1')).toBeTruthy();

    const mainContainer = getByText('Surabaya 1').closest('div');

    // Step 0: finish typing & advance
    fireEvent.click(mainContainer);
    fireEvent.click(mainContainer);

    // Step 1: finish typing & advance -> end of script -> showContinuePrompt
    fireEvent.click(mainContainer);
    fireEvent.click(mainContainer);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    // Continue prompt button should be displayed
    const continueBtn = getByRole('button', { name: /Ya, lanjutkan!/i });
    expect(continueBtn).toBeTruthy();

    // Click continue to transition to chapter 2
    fireEvent.click(continueBtn);

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(getByText('Surabaya 2')).toBeTruthy();
  });

  test('handles finish adventure (warp home) flow', async () => {
    const mockGameData = createMockGameData(1, 'Jogja');

    global.fetch = mock(async (url) => {
      if (url === '/api/gemini') {
        return new Response(JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify(mockGameData) }] } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      return new Response('', { status: 500 });
    });

    const { getByPlaceholderText, getByRole, getByText, getByTitle } = render(<App />);

    fireEvent.change(getByPlaceholderText('Ketik Peristiwa Sejarah...'), { target: { value: 'Malioboro' } });
    fireEvent.click(getByRole('button', { name: /Mulai Petualangan/i }));

    await act(async () => {
      await new Promise(r => setTimeout(r, 100));
    });

    expect(getByText('Jogja 1')).toBeTruthy();

    // Click exit button in top bar ("Keluar ke Menu Utama")
    const finishBtn = getByTitle('Keluar ke Menu Utama');
    expect(finishBtn).toBeTruthy();

    fireEvent.click(finishBtn);

    // Should show warp animation / screen state and then return to StartScreen
    await act(async () => {
      await new Promise(r => setTimeout(r, 2600));
    });

    expect(getByText('TIME CAPSULE')).toBeTruthy();
  });
});
