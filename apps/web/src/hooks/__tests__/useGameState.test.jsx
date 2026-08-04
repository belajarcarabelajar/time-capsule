import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

class MockAudioContext {
  state = 'running';
  resume() { return Promise.resolve(); }
  createOscillator() { return { frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {}, type: 'sine' }; }
  createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }; }
  currentTime = 0;
  destination = {};
}
window.AudioContext = window.AudioContext || MockAudioContext;
window.webkitAudioContext = window.webkitAudioContext || MockAudioContext;

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';

let fetchShouldFail = false;
let authShouldFail = false;

const originalFetch = global.fetch;

let mockUser = { id: '1', name: 'Test User' };
mock.module('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
}));

mock.module('../utils/history', () => ({
  generateHistorySummary: () => 'mocked history'
}));

const validMockGameData = {
  meta: { location: "Test Loc", themeColor: "#000000" },
  characters: {
    PLAYER: { id: "PLAYER", name: "Penjelajah", icon: "🧑🏻‍🚀", desc: "Masa Depan" },
    NPC_1: { id: "NPC_1", name: "NPC 1", icon: "N", desc: "desc" },
    NPC_2: { id: "NPC_2", name: "NPC 2", icon: "N", desc: "desc" },
    NPC_3: { id: "NPC_3", name: "NPC 3", icon: "N", desc: "desc" }
  },
  scenes: { MAIN: { bg: "bg.jpg", elements: [] } },
  script: [
    { type: "dialogue", speakerId: "PLAYER", mood: "happy", text: "Hello" },
    { type: "quiz", speakerId: "NPC_1", mood: "happy", text: "Quiz time", choices: [] }
  ]
};

const originalConsoleError = console.error;

import { useGameState } from '../useGameState';
import { SoundEngine } from '@time-capsule/game-engine';

describe('useGameState', () => {
  let originalClipboard;

  beforeEach(() => {
    fetchShouldFail = false;
    authShouldFail = false;
    mockUser = { id: '1', name: 'Test User' };

    SoundEngine.ctx = null;

    console.error = mock(() => {});

    global.fetch = mock(async (url) => {
      if (fetchShouldFail) {
        if (authShouldFail) throw new Error('Authentication required');
        throw new Error('Test Error');
      }
      return {
        ok: true,
        json: async () => ({
            candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify(validMockGameData)
                    }]
                }
            }]
        })
      };
    });

    originalClipboard = navigator.clipboard;
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mock(() => Promise.resolve()) },
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.error = originalConsoleError;
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    mock.restore();
  });

  test('initial state is correct', () => {
    const { result } = renderHook(() => useGameState());
    expect(result.current.inputMode).toBe(true);
    expect(result.current.topic).toBe('');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.showAuthModal).toBe(false);
    expect(result.current.errorMsg).toBeNull();
    expect(result.current.gameData).toBeNull();
  });

  test('handleStartAdventure does nothing if topic is empty', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.handleStartAdventure();
    });

    expect(result.current.inputMode).toBe(true);
  });

  test('handleStartAdventure shows auth modal if user is missing', async () => {
    mockUser = null;
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setTopic('History');
    });

    await act(async () => {
      await result.current.handleStartAdventure();
    });

    expect(result.current.showAuthModal).toBe(true);
    expect(result.current.inputMode).toBe(true);
  });

  test('handleAnswer processes correct answer', async () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.handleAnswer({ correct: true, response: 'Good job!' });
    });

    expect(result.current.quizMode).toBe(false);
    expect(result.current.feedback).toEqual({
      text: 'Good job!',
      mood: '🎉',
      correct: true
    });
    expect(result.current.isTyping).toBe(true);
  });

  test('handleFinish resets state', async () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
        result.current.handleFinish();
    });

    expect(result.current.isWarpingHome).toBe(true);
  });
});
