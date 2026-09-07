export function clampView(view, camera) {
  const clamp = (value, limit) => Math.max(-limit, Math.min(limit, Number.isFinite(value) ? value : 0));
  return { yaw: clamp(view.yaw, camera.yawLimit), pitch: clamp(view.pitch, camera.pitchLimit) };
}

export function createFrameMonitor() {
  let samples = [];
  let elapsed = 0;
  let level = 0;
  return {
    sample(milliseconds) {
      if (level === 2 || !Number.isFinite(milliseconds) || milliseconds <= 0) return null;
      samples.push(milliseconds);
      elapsed += milliseconds;
      if (elapsed < 3000) return null;
      const sorted = [...samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      samples = [];
      elapsed = 0;
      if (median <= 40) return null;
      level++;
      return level === 1 ? 'lower' : 'poster';
    },
  };
}
