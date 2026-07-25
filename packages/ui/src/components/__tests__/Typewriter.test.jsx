import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';

// Bun requires mock.module to be called *before* the import if we want to mock it.
// Also we must define it at the top level.
const playTypeMock = mock(() => {});
mock.module('@time-capsule/game-engine', () => ({
  SoundEngine: {
    playType: playTypeMock,
  }
}));

import React from 'react';
import { render, act, cleanup, waitFor } from '@testing-library/react';
import { Typewriter } from '../Typewriter';
import { SoundEngine } from '@time-capsule/game-engine';

describe('Typewriter Component', () => {

  beforeEach(() => {
    playTypeMock.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders initial state correctly with no text', () => {
    const { container } = render(<Typewriter text="" />);
    expect(container.innerHTML).toBe('<span></span>');
  });

  it('handles null or undefined text gracefully', () => {
    const { container: containerNull } = render(<Typewriter text={null} />);
    expect(containerNull.innerHTML).toBe('<span></span>');

    cleanup();

    const { container: containerUndefined } = render(<Typewriter text={undefined} />);
    expect(containerUndefined.innerHTML).toBe('<span></span>');
  });

  it('renders plain text completely after animation', async () => {
    const onCompleteMock = mock(() => {});
    const { container } = render(<Typewriter text="Hello" speed={0} onComplete={onCompleteMock} />);

    await waitFor(() => {
      expect(container.textContent).toBe('Hello');
    });

    expect(onCompleteMock).toHaveBeenCalledTimes(1);

    // Total chars = 5. Sound is played when visibleCount % 2 === 0.
    // 0 % 2 === 0 -> play (H typed)
    // 1 % 2 !== 0 -> (e typed)
    // 2 % 2 === 0 -> play (l typed)
    // 3 % 2 !== 0 -> (l typed)
    // 4 % 2 === 0 -> play (o typed)
    // Then loop exits because visibleCount (5) < totalChars (5) is false.
    // Total 3 plays.
    expect(playTypeMock).toHaveBeenCalledTimes(3);
  });

  it('renders bold and italic formatting correctly', async () => {
    const { container } = render(<Typewriter text="<b>Bold</b> and <i>Italic</i>" speed={0} />);

    await waitFor(() => {
        expect(container.textContent).toBe('Bold and Italic');
    });

    const b = container.querySelector('b');
    const i = container.querySelector('i');

    expect(b).not.toBeNull();
    expect(b.textContent).toBe('Bold');
    expect(b.className).toContain('font-bold');
    expect(b.className).toContain('text-amber-300');

    expect(i).not.toBeNull();
    expect(i.textContent).toBe('Italic');
    expect(i.className).toContain('italic');
    expect(i.className).toContain('text-sky-300');
  });

  it('calls onComplete only once after typing finishes', async () => {
    const onCompleteMock = mock(() => {});
    render(<Typewriter text="abc" speed={0} onComplete={onCompleteMock} />);

    await waitFor(() => {
        expect(onCompleteMock).toHaveBeenCalledTimes(1);
    });

    await new Promise((r) => setTimeout(r, 50)); // wait more

    expect(onCompleteMock).toHaveBeenCalledTimes(1); // should still be 1
  });

  it('updates ref to latest onComplete if changed mid-typing', async () => {
    const firstOnComplete = mock(() => {});
    const secondOnComplete = mock(() => {});

    // High speed but still delayed
    const { rerender } = render(<Typewriter text="long text" speed={10} onComplete={firstOnComplete} />);

    // update the callback before it can possibly finish typing (long text requires 9 ticks, 90ms)
    rerender(<Typewriter text="long text" speed={10} onComplete={secondOnComplete} />);

    await waitFor(() => {
        expect(secondOnComplete).toHaveBeenCalledTimes(1);
    }, { timeout: 1000 }); // give it time to finish

    expect(firstOnComplete).not.toHaveBeenCalled();
  });
});
