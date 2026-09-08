import { expect, test } from 'bun:test';
import { roomManifest } from '../rooms.js';

test('every authored environment provides local media and accessible inspection views', () => {
  expect(Object.keys(roomManifest)).toEqual(['archive', 'ww1-field-station', 'ww2-radio-room', 'kingdom-court', 'market-port', 'rural-village', 'resistance-outpost', 'ancient-library']);
  for (const [id, room] of Object.entries(roomManifest)) {
    expect(room.id).toBe(id);
    expect(room.modelUrl).toBe(`/history/${id}/room.glb`);
    expect(room.posterUrl).toBe(`/history/${id}/poster.webp`);
    expect(room.scopeLabel.length).toBeGreaterThan(15);
    expect(room.objects).toHaveLength(3);
    expect(new Set(room.objects.map(object => object.id)).size).toBe(3);
    for (const object of room.objects) {
      expect(object.label.length).toBeGreaterThan(3);
      expect(object.description.length).toBeGreaterThan(40);
      expect(object.view.position.every(Number.isFinite)).toBe(true);
      expect(object.view.target.every(Number.isFinite)).toBe(true);
    }
  }
  expect(roomManifest['kingdom-court'].objects.map(object => object.id)).toEqual([
    'ceremonial-seat',
    'manuscript-table',
    'courtyard-gate',
  ]);
  expect(roomManifest['market-port'].objects.map(object => object.id)).toEqual([
    'dock',
    'market-stall',
    'cargo',
  ]);
  expect(roomManifest['rural-village'].objects.map(object => object.id)).toEqual([
    'sawah',
    'lumbung',
    'irigasi',
  ]);
  expect(roomManifest['resistance-outpost'].objects.map(object => object.id)).toEqual([
    'palisade',
    'watch-post',
    'signal-fire',
  ]);
  expect(roomManifest['ancient-library'].objects.map(object => object.id)).toEqual([
    'scroll-table',
    'astrolabe',
    'manuscript-shelf',
  ]);
});

test('ancient library provides a valid camera and three-dimensional inspection views', () => {
  const room = roomManifest['ancient-library'];
  expect(room).toBeDefined();
  expect(room.label).toBe('Perpustakaan kuno');
  for (const view of [room.camera, ...room.objects.map(object => object.view)]) {
    for (const vector of [view.position, view.target]) {
      expect(vector).toHaveLength(3);
      expect(vector.every(Number.isFinite)).toBe(true);
    }
  }
  expect(room.camera.yawLimit).toBeGreaterThan(0);
  expect(room.camera.pitchLimit).toBeGreaterThan(0);
});
