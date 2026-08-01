import { describe, it, expect, mock } from 'bun:test';
import React from 'react';
import { render, act } from '@testing-library/react';

// Must register global first
import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {}
}

const playTypeMock = mock(() => {});
mock.module('@time-capsule/game-engine', () => ({
  SoundEngine: {
    playType: playTypeMock,
  }
}));

import { Typewriter } from './src/components/Typewriter';

describe('Benchmark Typewriter', () => {
  it('measures time to type 1000 characters', async () => {
    const text = "A".repeat(1000);
    const start = performance.now();

    let resolveComplete;
    const completePromise = new Promise(r => { resolveComplete = r; });

    const { unmount } = render(<Typewriter text={text} speed={0} onComplete={resolveComplete} />);

    await completePromise;
    const end = performance.now();
    console.log(`Time taken: ${(end - start).toFixed(2)}ms`);
    unmount();
  });
});
