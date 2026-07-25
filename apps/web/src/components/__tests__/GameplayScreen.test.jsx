import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) {
  try {
    GlobalRegistrator.register();
  } catch (e) {
    // Already registered
  }
}

import React from 'react';
import { test, expect, describe, afterEach, mock } from 'bun:test';
import { render, cleanup, fireEvent, screen } from '@testing-library/react';
import GameplayScreen from '../GameplayScreen';

describe('GameplayScreen', () => {
  afterEach(() => {
    cleanup();
  });

  const mockGameData = {
    meta: { location: 'Test Location' },
    characters: {
      PLAYER: { name: 'Player', desc: 'The player', icon: '🧑‍🚀' },
      NPC1: { name: 'NPC One', desc: 'A test NPC', icon: '👤' },
    },
    scenes: { MAIN: 'Test Scene' },
    script: [
      { speakerId: 'PLAYER', text: 'Hello world', type: 'dialogue' },
      { speakerId: 'NPC1', text: 'Hi there', type: 'dialogue' },
      { type: 'narrator', text: 'A narrator speaks' }
    ]
  };

  test('renders loading state when isLoading is true', () => {
    const { getByText } = render(<GameplayScreen isLoading={true} />);
    expect(getByText('MENYIAPKAN BABAK BERIKUTNYA...')).toBeTruthy();
  });

  test('renders warping home state', () => {
    const { getByText } = render(<GameplayScreen isWarpingHome={true} />);
    expect(getByText('WARPING TO PRESENT DAY...')).toBeTruthy();
  });

  test('renders continue prompt when showContinuePrompt is true', () => {
    const handleContinue = mock(() => {});
    const handleFinish = mock(() => {});

    const { getByText } = render(
      <GameplayScreen
        showContinuePrompt={true}
        chapterCount={2}
        handleContinue={handleContinue}
        handleFinish={handleFinish}
      />
    );

    expect(getByText('Selesai!')).toBeTruthy();
    expect(getByText(/Eksplorasi di bagian ini telah tuntas/)).toBeTruthy();
    expect(getByText('Ya, lanjutkan!')).toBeTruthy();
    expect(getByText('Pulang ke Masa Depan')).toBeTruthy();

    // Simulate clicks
    fireEvent.click(getByText('Ya, lanjutkan!'));
    expect(handleContinue).toHaveBeenCalledTimes(1);

    fireEvent.click(getByText('Pulang ke Masa Depan'));
    expect(handleFinish).toHaveBeenCalledTimes(1);
  });

  test('renders error message in continue prompt', () => {
    const handleCopyError = mock(() => {});
    const { getByText } = render(
      <GameplayScreen
        showContinuePrompt={true}
        chapterCount={1}
        errorMsg="Test Error Message"
        errorDetail="Test Stack Trace"
        handleCopyError={handleCopyError}
      />
    );

    expect(getByText('Test Error Message')).toBeTruthy();
    const copyButton = getByText('Salin Detail Eror');
    expect(copyButton).toBeTruthy();
    fireEvent.click(copyButton);
    expect(handleCopyError).toHaveBeenCalledTimes(1);
  });

  test('calls handleNext when clicked anywhere on the screen', () => {
    const handleNext = mock(() => {});

    const { getByText } = render(
      <GameplayScreen
        handleNext={handleNext}
        gameData={mockGameData}
        idx={0}
      />
    );

    fireEvent.click(getByText('Test Location').parentElement.parentElement.parentElement);
    expect(handleNext).toHaveBeenCalledTimes(1);
  });

  test('renders preloaded next chapter indicator and preloading state indicator', () => {
    const { getByText, rerender } = render(
      <GameplayScreen
        showContinuePrompt={true}
        chapterCount={1}
        nextGameData={{ meta: { location: 'Location 2' } }}
      />
    );

    expect(getByText(/DATA BAGIAN 2 SIAP!/i)).toBeTruthy();

    rerender(
      <GameplayScreen
        showContinuePrompt={true}
        chapterCount={1}
        isPreloading={true}
      />
    );

    expect(getByText(/SEDANG MENYUSUN DATA.../i)).toBeTruthy();
  });
});
