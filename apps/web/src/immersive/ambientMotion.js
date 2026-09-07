export function createAmbientMotion(scene, roomId) {
  const figure = scene.getObjectByName('ambient_figure');
  const prop = scene.getObjectByName('ambient_prop');
  const bases = [figure, prop].filter(Boolean).map(node => ({ node, y: node.position.y, rotation: node.rotation.y }));
  let elapsed = 0;
  return {
    update(delta, enabled) {
      if (!enabled || !Number.isFinite(delta) || delta <= 0) return;
      elapsed += Math.min(delta, 0.1);
      for (const { node, y, rotation } of bases) {
        const phase = node === figure ? elapsed * 0.7 : elapsed * 0.45;
        node.rotation.y = rotation + Math.sin(phase) * 0.025;
        if (node === prop && roomId === 'market-port') node.position.y = y + Math.sin(phase) * 0.015;
      }
    },
    reset() {
      for (const { node, y, rotation } of bases) {
        node.position.y = y;
        node.rotation.y = rotation;
      }
      elapsed = 0;
    },
  };
}
