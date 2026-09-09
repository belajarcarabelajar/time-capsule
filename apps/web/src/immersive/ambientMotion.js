const propProfiles = {
  archive: { axis: 'y', speed: 0.45, amplitude: 0.025 },
  'ww1-field-station': { axis: 'x', speed: 0.55, amplitude: 0.018 },
  'ww2-radio-room': { axis: 'z', speed: 0.8, amplitude: 0.012 },
  'kingdom-court': { axis: 'z', speed: 0.4, amplitude: 0.02 },
  'market-port': { axis: 'z', speed: 0.45, amplitude: 0.025, lift: 0.015 },
  'rural-village': { axis: 'x', speed: 0.35, amplitude: 0.022 },
  'resistance-outpost': { axis: 'z', speed: 0.6, amplitude: 0.015 },
  'ancient-library': { axis: 'y', speed: 0.3, amplitude: 0.018 },
};

export function createAmbientMotion(scene, roomId) {
  const profile = Object.hasOwn(propProfiles, roomId) ? propProfiles[roomId] : propProfiles.archive;
  const figure = scene.getObjectByName('ambient_figure');
  const prop = scene.getObjectByName('ambient_prop');
  const bases = [figure, prop].filter(Boolean).map(node => {
    const motion = node === figure ? { axis: 'y', speed: 0.7, amplitude: 0.025 } : profile;
    return { node, motion, y: node.position.y, rotation: node.rotation[motion.axis] };
  });
  let elapsed = 0;
  return {
    update(delta, enabled) {
      if (!enabled || !Number.isFinite(delta) || delta <= 0) return;
      elapsed += Math.min(delta, 0.1);
      for (const { node, motion, y, rotation } of bases) {
        const wave = Math.sin(elapsed * motion.speed);
        node.rotation[motion.axis] = rotation + wave * motion.amplitude;
        if (motion.lift) node.position.y = y + wave * motion.lift;
      }
    },
    reset() {
      for (const { node, motion, y, rotation } of bases) {
        node.position.y = y;
        node.rotation[motion.axis] = rotation;
      }
      elapsed = 0;
    },
  };
}
