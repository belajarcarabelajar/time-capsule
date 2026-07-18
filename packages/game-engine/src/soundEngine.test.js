import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from 'bun:test';
import { SoundEngine } from './soundEngine.js';

describe('SoundEngine', () => {
  let mockAudioContext;
  let mockOscillator;
  let mockGain;

  beforeEach(() => {
    // Reset SoundEngine state
    SoundEngine.ctx = null;
    global.window = {};

    mockOscillator = {
      type: 'sine',
      frequency: {
        setValueAtTime: mock(),
        exponentialRampToValueAtTime: mock()
      },
      connect: mock(),
      start: mock(),
      stop: mock()
    };

    mockGain = {
      gain: {
        setValueAtTime: mock(),
        exponentialRampToValueAtTime: mock(),
        linearRampToValueAtTime: mock()
      },
      connect: mock()
    };

    mockAudioContext = {
      state: 'running',
      currentTime: 100,
      destination: {},
      createOscillator: mock(() => mockOscillator),
      createGain: mock(() => mockGain),
      resume: mock(() => Promise.resolve())
    };

    global.window.AudioContext = mock(() => mockAudioContext);
  });

  afterEach(() => {
    delete global.window;
  });

  describe('init', () => {
    it('initializes AudioContext if not present', () => {
      expect(SoundEngine.ctx).toBeNull();
      SoundEngine.init();
      expect(global.window.AudioContext).toHaveBeenCalled();
      expect(SoundEngine.ctx).toBe(mockAudioContext);
    });

    it('uses webkitAudioContext if AudioContext is not available', () => {
      delete global.window.AudioContext;
      global.window.webkitAudioContext = mock(() => mockAudioContext);
      SoundEngine.init();
      expect(global.window.webkitAudioContext).toHaveBeenCalled();
      expect(SoundEngine.ctx).toBe(mockAudioContext);
    });

    it('resumes AudioContext if suspended', async () => {
      mockAudioContext.state = 'suspended';
      SoundEngine.init();
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('does not create a new context if one already exists', () => {
      SoundEngine.ctx = mockAudioContext;
      SoundEngine.init();
      expect(global.window.AudioContext).not.toHaveBeenCalled();
    });
  });

  describe('playTone', () => {
    it('does nothing if context is not initialized', () => {
      SoundEngine.playTone(440, 'sine', 1);
      // If it tried to do anything, it would throw because ctx is null
      expect(SoundEngine.ctx).toBeNull();
    });

    it('creates and connects oscillator and gain nodes', () => {
      SoundEngine.init();
      SoundEngine.playTone(440, 'square', 0.5, 0.2);

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockAudioContext.createGain).toHaveBeenCalled();

      expect(mockOscillator.type).toBe('square');
      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(440, 100);

      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 100);
      expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.01, 100.5);

      expect(mockOscillator.connect).toHaveBeenCalledWith(mockGain);
      expect(mockGain.connect).toHaveBeenCalledWith(mockAudioContext.destination);

      expect(mockOscillator.start).toHaveBeenCalled();
      expect(mockOscillator.stop).toHaveBeenCalledWith(100.5);
    });
  });

  describe('pre-defined sounds', () => {
    beforeEach(() => {
      SoundEngine.init();
      spyOn(SoundEngine, 'playTone').mockImplementation(() => {});
    });

    afterEach(() => {
      SoundEngine.playTone.mockRestore();
    });

    it('playClick calls playTone with correct arguments', () => {
      SoundEngine.playClick();
      expect(SoundEngine.playTone).toHaveBeenCalledWith(600, 'sine', 0.05, 0.05);
    });

    it('playNarrator calls playTone and sets timeout', () => {
      spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
      SoundEngine.playNarrator();
      expect(SoundEngine.playTone).toHaveBeenCalledWith(200, 'sine', 1.0, 0.2);
      expect(SoundEngine.playTone).toHaveBeenCalledWith(300, 'sine', 1.0, 0.1);
      global.setTimeout.mockRestore();
    });

    it('playCorrect calls playTone and sets timeout', () => {
      spyOn(global, 'setTimeout').mockImplementation((cb) => cb());
      SoundEngine.playCorrect();
      expect(SoundEngine.playTone).toHaveBeenCalledWith(523.25, 'sine', 0.1, 0.1);
      expect(SoundEngine.playTone).toHaveBeenCalledWith(659.25, 'sine', 0.1, 0.1);
      global.setTimeout.mockRestore();
    });

    it('playWrong calls playTone with correct arguments', () => {
      SoundEngine.playWrong();
      expect(SoundEngine.playTone).toHaveBeenCalledWith(150, 'sawtooth', 0.3, 0.1);
    });
  });

  describe('complex playback methods', () => {
    beforeEach(() => {
      SoundEngine.init();
    });

    it('playType creates unique sound pattern', () => {
      SoundEngine.playType();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();
      expect(mockOscillator.type).toBe('triangle');
      // The frequency is randomized between 800 and 900
      const setFreqCall = mockOscillator.frequency.setValueAtTime.mock.calls[0];
      expect(setFreqCall[0]).toBeGreaterThanOrEqual(800);
      expect(setFreqCall[0]).toBeLessThan(900);
      expect(setFreqCall[1]).toBe(100);

      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.05, 100);
      expect(mockGain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, 100.03);
    });

    it('playType does nothing if ctx is missing', () => {
      SoundEngine.ctx = null;
      SoundEngine.playType();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });

    it('playWarp creates sweeping sound pattern', () => {
      SoundEngine.playWarp();

      expect(mockAudioContext.createOscillator).toHaveBeenCalled();

      expect(mockOscillator.frequency.setValueAtTime).toHaveBeenCalledWith(100, 100);
      expect(mockOscillator.frequency.exponentialRampToValueAtTime).toHaveBeenCalledWith(600, 101.5);

      expect(mockGain.gain.setValueAtTime).toHaveBeenCalledWith(0.2, 100);
      expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 101.5);
    });

    it('playWarp does nothing if ctx is missing', () => {
      SoundEngine.ctx = null;
      SoundEngine.playWarp();
      expect(mockAudioContext.createOscillator).not.toHaveBeenCalled();
    });
  });
});
