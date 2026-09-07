import { expect, test, mock } from 'bun:test';
import { BoxGeometry, Mesh, MeshStandardMaterial, Group, Texture } from 'three';
import { disposeRoomResources } from '../roomResources.js';
import { createFrameMonitor, clampView } from '../renderPolicy.js';

test('shared model resources are released once when their owner leaves the room', () => {
  const geometry = new BoxGeometry();
  const texture = new Texture();
  const imageClose = mock(() => {});
  texture.image = { close: imageClose };
  const material = new MeshStandardMaterial({ map: texture, roughnessMap: texture });
  const disposed = { geometry: 0, material: 0, texture: 0 };
  geometry.addEventListener('dispose', () => disposed.geometry++);
  material.addEventListener('dispose', () => disposed.material++);
  texture.addEventListener('dispose', () => disposed.texture++);
  const scene = new Group();
  scene.add(new Mesh(geometry, material), new Mesh(geometry, material));
  disposeRoomResources(scene);
  expect(disposed).toEqual({ geometry: 1, material: 1, texture: 1 });
  expect(imageClose).toHaveBeenCalledTimes(1);
});

test('camera input stays finite and within the authored bounds', () => {
  expect(clampView({ yaw: 10, pitch: -10 }, { yawLimit: 0.4, pitchLimit: 0.2 }))
    .toEqual({ yaw: 0.4, pitch: -0.2 });
  expect(clampView({ yaw: NaN, pitch: Infinity }, { yawLimit: 0.4, pitchLimit: 0.2 }))
    .toEqual({ yaw: 0, pitch: 0 });
});

test('sustained poor pacing downgrades, then falls back instead of looping', () => {
  const monitor = createFrameMonitor();
  const actions = [];
  for (let i = 0; i < 150; i++) {
    const action = monitor.sample(50);
    if (action) actions.push(action);
  }
  expect(actions).toEqual(['lower', 'poster']);
});

test('one long frame or good steady pacing does not trigger a downgrade', () => {
  const monitor = createFrameMonitor();
  expect(monitor.sample(500)).toBe(null);
  const actions = Array.from({ length: 500 }, () => monitor.sample(16)).filter(Boolean);
  expect(actions).toEqual([]);
});
