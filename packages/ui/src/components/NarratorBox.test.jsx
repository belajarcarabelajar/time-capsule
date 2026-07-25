import { describe, it, expect, mock, beforeEach, beforeAll, afterAll } from 'bun:test';
import React from 'react';
import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

// Delay import to ensure document is available when the module is parsed
const { render, screen, cleanup } = await import('@testing-library/react');

mock.module('@time-capsule/game-engine', () => ({
  SoundEngine: {
    playNarrator: mock(),
  }
}));

const { SoundEngine } = await import('@time-capsule/game-engine');
const { NarratorBox } = await import('./NarratorBox.jsx');

describe('NarratorBox', () => {
  afterAll(() => {
    GlobalRegistrator.unregister();
  });

  beforeEach(() => {
    SoundEngine.playNarrator.mockClear();
    cleanup();
  });

  it('should play narrator sound on mount', () => {
    const { unmount } = render(<NarratorBox text="Test text" isTyping={false} />);
    expect(SoundEngine.playNarrator).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('should render the provided text when not typing', () => {
    const { container } = render(<NarratorBox text="Historical facts" isTyping={false} />);
    expect(container.textContent).toContain('Historical facts');
  });

  it('should render the typewriter when typing', () => {
    const { container } = render(<NarratorBox text="Historical facts" isTyping={true} />);
    expect(container.innerHTML).not.toContain('Historical facts');
  });

  it('should format text appropriately', () => {
    const { container } = render(<NarratorBox text="**Bold text**" isTyping={false} />);
    const boldElement = container.querySelector('b');
    expect(boldElement).not.toBeNull();
    expect(boldElement.textContent).toBe('Bold text');
  });

  it('should render the title INSIGHT SEJARAH', () => {
    const { getByText } = render(<NarratorBox text="Test text" isTyping={false} />);
    expect(getByText('INSIGHT SEJARAH')).toBeTruthy();
  });
});
