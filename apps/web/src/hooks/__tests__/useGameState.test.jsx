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
// happy-dom ships an incomplete AudioContext stub, so always override it:
// SoundEngine.init() news this up and playWarp needs the full node API.
window.AudioContext = MockAudioContext;
window.webkitAudioContext = MockAudioContext;

import { test, expect, describe, afterEach, mock, beforeEach } from 'bun:test';
import { renderHook, act } from '@testing-library/react';

let fetchShouldFail = false;
let authShouldFail = false;

const originalFetch = global.fetch;

let mockUser = { id: '1', name: 'Test User' };
const checkSession = mock(async () => {});
mock.module('../../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser, checkSession })
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

const REFUSED_MESSAGE = 'Topik ini tidak dapat diproses. Coba topik sejarah lain.';
const RATE_LIMITED_MESSAGE = 'Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.';

const scenarioReply = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});
const successReply = () => scenarioReply(200, {
  success: true,
  result: { response: JSON.stringify(validMockGameData) },
});
const refusedReply = () => scenarioReply(422, { success: false, error: 'REFUSED', message: REFUSED_MESSAGE });
const rateLimitedReply = () => scenarioReply(429, { success: false, error: 'RATE_LIMITED', message: RATE_LIMITED_MESSAGE });
const serverErrorReply = () => scenarioReply(500, { success: false, message: 'Portal waktu sedang sibuk. Coba lagi sebentar lagi.' });
const INSUFFICIENT_POINTS_MESSAGE = 'Poin Anda tidak mencukupi. Diperlukan 10 poin untuk men-generate cerita. Poin akan di-reset besok!';
const POINTS_UNAVAILABLE_MESSAGE = 'Saldo poin sementara tidak tersedia. Silakan coba lagi.';
const insufficientPointsReply = () => scenarioReply(403, { success: false, error: 'INSUFFICIENT_POINTS', message: INSUFFICIENT_POINTS_MESSAGE });
const pointsUnavailableReply = () => scenarioReply(503, { success: false, error: 'POINTS_UNAVAILABLE', message: POINTS_UNAVAILABLE_MESSAGE });

const chapterReply = (location) => scenarioReply(200, {
  success: true,
  result: { response: JSON.stringify({ ...validMockGameData, meta: { ...validMockGameData.meta, location } }) },
});

// A macrotask tick drains the promise chains between a settled request and
// the hook's next fetch call.
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

// Chapter 1 answers at once; every later chapter request waits until the
// test settles it, so a preload can be held in flight.
const deferredScenarioFetch = () => {
  const requests = [];
  const pending = new Map();
  const fetchMock = mock((_url, options) => {
    const { chapter } = JSON.parse(options.body);
    requests.push(chapter);
    if (chapter === 1) return Promise.resolve(chapterReply('Chapter 1'));
    return new Promise((resolve, reject) => {
      pending.set(chapter, [...(pending.get(chapter) || []), { resolve, reject }]);
    });
  });
  const settle = (chapter, action) => {
    const waiting = pending.get(chapter) || [];
    pending.delete(chapter);
    waiting.forEach(action);
  };
  return {
    fetchMock,
    requests,
    resolveChapter: (chapter, location) => settle(chapter, ({ resolve }) => resolve(chapterReply(location))),
    rejectChapter: (chapter, error) => settle(chapter, ({ reject }) => reject(error)),
  };
};

const originalConsoleError = console.error;

import { useGameState } from '../useGameState';
import { SoundEngine } from '@time-capsule/game-engine';

describe('useGameState', () => {
  let originalClipboard;

  beforeEach(() => {
    checkSession.mockClear();
    fetchShouldFail = false;
    authShouldFail = false;
    mockUser = { id: '1', name: 'Test User' };

    SoundEngine.ctx = null;

    console.error = mock(() => {});

    global.fetch = mock(async (_url) => {
      if (fetchShouldFail) {
        if (authShouldFail) throw new Error('Authentication required');
        throw new Error('Test Error');
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
            success: true,
            result: { response: JSON.stringify(validMockGameData) },
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

  test('refreshes after foreground and preload success; consuming cache only charges new preload', async () => {
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setTopic('History'));
    await act(async () => { await result.current.handleStartAdventure(); });
    expect(checkSession).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.nextGameData).toBeTruthy();
    await act(async () => { await result.current.handleContinue(); });
    expect(checkSession).toHaveBeenCalledTimes(3);
    expect(global.fetch).toHaveBeenCalledTimes(3);
    expect(result.current.chapterCount).toBe(2);
  });

  test('handleStartAdventure does nothing if topic is empty', async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.handleStartAdventure();
    });

    expect(result.current.inputMode).toBe(true);
  });

  test('refreshes quota even if generation fails after a possible server debit', async () => {
    fetchShouldFail = true;
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setTopic('History'));
    await act(async () => { await result.current.handleStartAdventure(); });
    expect(checkSession).toHaveBeenCalledTimes(1);
    expect(result.current.inputMode).toBe(true);
    expect(result.current.errorMsg).toBeTruthy();
  });

  const startChapterOne = async (reply) => {
    global.fetch = mock(async () => reply());
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setTopic('History'));
    await act(async () => { await result.current.handleStartAdventure(); });
    return result;
  };

  test('chapter 1 scenario request refused with 422 shows the server message', async () => {
    const result = await startChapterOne(refusedReply);
    expect(result.current.errorMsg).toBe(REFUSED_MESSAGE);
    expect(result.current.errorDetail.message).toBe(REFUSED_MESSAGE);
    expect(result.current.showAuthModal).toBe(false);
    expect(result.current.inputMode).toBe(true);
  });

  test('chapter 1 scenario request rate limited with 429 shows the server message', async () => {
    const result = await startChapterOne(rateLimitedReply);
    expect(result.current.errorMsg).toBe(RATE_LIMITED_MESSAGE);
    expect(result.current.showAuthModal).toBe(false);
  });

  test('chapter 1 scenario request failing with 500 keeps the fixed portal message', async () => {
    const result = await startChapterOne(serverErrorReply);
    expect(result.current.errorMsg).toBe('Gagal membuka portal. Coba lagi.');
    expect(result.current.errorDetail.message).toBe('Portal waktu sedang sibuk. Coba lagi sebentar lagi.');
  });

  // Reply 1 opens chapter 1, reply 2 fails the preload so handleContinue
  // must fetch, reply 3 answers that foreground request.
  const continueWithoutPreload = async (foregroundReply) => {
    const replies = [successReply, serverErrorReply, foregroundReply];
    let call = 0;
    global.fetch = mock(async () => replies[Math.min(call++, replies.length - 1)]());
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setTopic('History'));
    await act(async () => { await result.current.handleStartAdventure(); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.current.nextGameData).toBeNull();
    await act(async () => { await result.current.handleContinue(); });
    expect(global.fetch).toHaveBeenCalledTimes(3);
    return result;
  };

  test('later chapter scenario request rate limited with 429 shows the server message', async () => {
    const result = await continueWithoutPreload(rateLimitedReply);
    expect(result.current.errorMsg).toBe(RATE_LIMITED_MESSAGE);
    expect(result.current.chapterCount).toBe(1);
    expect(result.current.showAuthModal).toBe(false);
  });

  test('chapter 1 scenario request with insufficient points (403) shows the server message', async () => {
    const result = await startChapterOne(insufficientPointsReply);
    expect(result.current.errorMsg).toBe(INSUFFICIENT_POINTS_MESSAGE);
    expect(result.current.showAuthModal).toBe(false);
  });

  test('chapter 1 scenario request with points unavailable (503) shows the server message', async () => {
    const result = await startChapterOne(pointsUnavailableReply);
    expect(result.current.errorMsg).toBe(POINTS_UNAVAILABLE_MESSAGE);
    expect(result.current.showAuthModal).toBe(false);
  });

  test('chapter 1 scenario request with a non-JSON 503 page keeps the fixed portal message', async () => {
    const result = await startChapterOne(() => ({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json'); },
    }));
    expect(result.current.errorMsg).toBe('Gagal membuka portal. Coba lagi.');
    expect(result.current.errorDetail.message).toBe('POINTS_UNAVAILABLE');
  });

  test('chapter 1 scenario request with a 403 carrying only an error code keeps the fixed portal message', async () => {
    const result = await startChapterOne(() => scenarioReply(403, { success: false, error: 'INSUFFICIENT_POINTS' }));
    expect(result.current.errorMsg).toBe('Gagal membuka portal. Coba lagi.');
    expect(result.current.errorDetail.message).toBe('INSUFFICIENT_POINTS');
  });

  test('chapter 1 scenario request rejected with 401 opens the auth modal without an error message', async () => {
    const result = await startChapterOne(() => scenarioReply(401, { success: false }));
    expect(result.current.showAuthModal).toBe(true);
    expect(result.current.errorMsg).toBeNull();
  });

  test('later chapter scenario request refused with 422 shows the server message', async () => {
    const result = await continueWithoutPreload(refusedReply);
    expect(result.current.errorMsg).toBe(REFUSED_MESSAGE);
    expect(result.current.chapterCount).toBe(1);
    expect(result.current.showAuthModal).toBe(false);
  });

  test('later chapter scenario request failing with 500 keeps the fixed connection message', async () => {
    const result = await continueWithoutPreload(serverErrorReply);
    expect(result.current.errorMsg).toBe('Koneksi terputus. Mohon coba lagi.');
    expect(result.current.chapterCount).toBe(1);
  });

  const startWithPendingPreload = async () => {
    const server = deferredScenarioFetch();
    global.fetch = server.fetchMock;
    const { result } = renderHook(() => useGameState());
    act(() => result.current.setTopic('History'));
    await act(async () => { await result.current.handleStartAdventure(); });
    expect(server.requests).toEqual([1, 2]);
    expect(result.current.nextGameData).toBeNull();
    return { result, ...server };
  };

  const continueAndFlush = async (result) => {
    let continuing;
    await act(async () => {
      continuing = result.current.handleContinue();
      await flush();
    });
    // Wrapped so the async helper does not adopt the pending promise.
    return { continuing };
  };

  test('continuing while the chapter 2 preload is in flight waits for it instead of requesting chapter 2 again', async () => {
    const { result, requests, resolveChapter } = await startWithPendingPreload();

    const { continuing } = await continueAndFlush(result);
    expect(requests).toEqual([1, 2]);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveChapter(2, 'Chapter 2');
      await continuing;
      await flush();
    });

    expect(requests.filter((chapter) => chapter === 2)).toHaveLength(1);
    expect(result.current.gameData.meta.location).toBe('Chapter 2');
    expect(result.current.chapterCount).toBe(2);
    expect(result.current.isLoading).toBe(false);
  });

  test('continuing after an awaited preload requests chapter 3 and never shows chapter 2 again', async () => {
    const { result, requests, resolveChapter } = await startWithPendingPreload();

    const { continuing: toChapterTwo } = await continueAndFlush(result);
    await act(async () => {
      resolveChapter(2, 'Chapter 2');
      await toChapterTwo;
      await flush();
    });

    const { continuing: toChapterThree } = await continueAndFlush(result);
    await act(async () => {
      resolveChapter(3, 'Chapter 3');
      await toChapterThree;
      await flush();
    });

    expect(requests).toContain(3);
    expect(requests.filter((chapter) => chapter === 3)).toHaveLength(1);
    expect(result.current.gameData.meta.location).toBe('Chapter 3');
    expect(result.current.chapterCount).toBe(3);
  });

  test('continuing falls back to one chapter request when the in-flight preload rejects', async () => {
    const { result, requests, resolveChapter, rejectChapter } = await startWithPendingPreload();

    const { continuing } = await continueAndFlush(result);
    expect(requests).toEqual([1, 2]);

    await act(async () => {
      rejectChapter(2, new Error('network down'));
      await flush();
    });
    expect(requests).toEqual([1, 2, 2]);

    await act(async () => {
      resolveChapter(2, 'Chapter 2 retry');
      await continuing;
      await flush();
    });

    expect(requests.filter((chapter) => chapter === 2)).toHaveLength(2);
    expect(result.current.gameData.meta.location).toBe('Chapter 2 retry');
    expect(result.current.chapterCount).toBe(2);
    expect(result.current.errorMsg).toBeNull();
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
