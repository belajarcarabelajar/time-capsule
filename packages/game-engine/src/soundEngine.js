const SoundEngine = {
  ctx: null,
  init: () => {
    if (!SoundEngine.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      SoundEngine.ctx = new AudioContext();
    }
    if (SoundEngine.ctx.state === 'suspended') SoundEngine.ctx.resume().catch(() => {});
  },
  playTone: (freq, type, duration, vol=0.1) => {
    if (!SoundEngine.ctx) return;
    const osc = SoundEngine.ctx.createOscillator();
    const gain = SoundEngine.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, SoundEngine.ctx.currentTime);
    gain.gain.setValueAtTime(vol, SoundEngine.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, SoundEngine.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(SoundEngine.ctx.destination);
    osc.start();
    osc.stop(SoundEngine.ctx.currentTime + duration);
  },
  playClick: () => SoundEngine.playTone(600, 'sine', 0.05, 0.05),
  playType: () => {
    if (!SoundEngine.ctx) return;
    const osc = SoundEngine.ctx.createOscillator();
    const gain = SoundEngine.ctx.createGain();
    const freq = 800 + Math.random() * 100; 
    osc.frequency.setValueAtTime(freq, SoundEngine.ctx.currentTime);
    osc.type = 'triangle'; 
    gain.gain.setValueAtTime(0.05, SoundEngine.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, SoundEngine.ctx.currentTime + 0.03);
    osc.connect(gain);
    gain.connect(SoundEngine.ctx.destination);
    osc.start();
    osc.stop(SoundEngine.ctx.currentTime + 0.03);
  },
  playWarp: () => {
     if (!SoundEngine.ctx) return;
     const osc = SoundEngine.ctx.createOscillator();
     const gain = SoundEngine.ctx.createGain();
     osc.frequency.setValueAtTime(100, SoundEngine.ctx.currentTime);
     osc.frequency.exponentialRampToValueAtTime(600, SoundEngine.ctx.currentTime + 1.5);
     gain.gain.setValueAtTime(0.2, SoundEngine.ctx.currentTime);
     gain.gain.linearRampToValueAtTime(0, SoundEngine.ctx.currentTime + 1.5);
     osc.connect(gain);
     gain.connect(SoundEngine.ctx.destination);
     osc.start();
     osc.stop(SoundEngine.ctx.currentTime + 1.5);
  },
  playNarrator: () => {
    SoundEngine.playTone(200, 'sine', 1.0, 0.2);
    setTimeout(() => SoundEngine.playTone(300, 'sine', 1.0, 0.1), 200);
  },
  playCorrect: () => { 
    SoundEngine.playTone(523.25, 'sine', 0.1, 0.1); 
    setTimeout(() => SoundEngine.playTone(659.25, 'sine', 0.1, 0.1), 100); 
  },
  playWrong: () => { 
    SoundEngine.playTone(150, 'sawtooth', 0.3, 0.1); 
  }
};

export { SoundEngine };
