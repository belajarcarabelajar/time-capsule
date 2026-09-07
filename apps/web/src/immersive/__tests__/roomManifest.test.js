import { expect, test } from 'bun:test';
import { roomManifest } from '../rooms.js';

test('every authored environment provides local media and accessible inspection views', () => {
  expect(Object.keys(roomManifest)).toEqual(['archive', 'ww1-field-station', 'ww2-radio-room']);
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
});
