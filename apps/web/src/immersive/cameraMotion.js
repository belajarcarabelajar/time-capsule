export function createCameraMotion(from, to, duration) {
  return {
    from: { position: [...from.position], target: [...from.target] },
    to: { position: [...to.position], target: [...to.target] },
    duration: Math.max(0, duration),
    elapsed: 0,
  };
}

export function advanceCameraMotion(motion, delta) {
  if (Number.isFinite(delta) && delta > 0) motion.elapsed += delta;
  const progress = motion.duration === 0 ? 1 : Math.min(1, motion.elapsed / motion.duration);
  const eased = progress * progress * (3 - 2 * progress);
  const interpolate = key => motion.from[key].map((value, index) =>
    value + (motion.to[key][index] - value) * eased);
  return {
    position: interpolate('position'),
    target: interpolate('target'),
    done: progress === 1,
  };
}
