import { GlobalRegistrator } from '@happy-dom/global-registrator';
GlobalRegistrator.register();

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

import { test, expect, mock, spyOn } from "bun:test";
import { renderHook, act } from '@testing-library/react';

let mockUser = { id: '1', name: 'Test User' };
mock.module('./apps/web/src/context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser })
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

global.fetch = mock(async (url) => {
    return {
    ok: true,
    json: async () => {
        return {
           candidates: [{
                content: {
                    parts: [{
                        text: JSON.stringify(validMockGameData)
                    }]
                }
            }]
        };
    }
    };
});

test("debug validate 51", async () => {
    const { useGameState } = await import("./apps/web/src/hooks/useGameState.js");
    const { SoundEngine } = await import("@time-capsule/game-engine");
    SoundEngine.ctx = null;
    let spy = spyOn(SoundEngine, "init");

    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setTopic('History');
    });

    await act(async () => {
      await result.current.handleStartAdventure();
    });
    console.log("error msg test 51:", result.current.errorMsg, result.current.errorDetail);
    expect(result.current.inputMode).toBe(false);
    expect(spy).toHaveBeenCalled();
});
