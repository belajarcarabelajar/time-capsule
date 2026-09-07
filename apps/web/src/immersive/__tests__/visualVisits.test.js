import { expect, test } from 'bun:test';
import { roomManifest } from '../rooms.js';
import { resolveVisit } from '../visualVisits.js';

test('every room alternates authored compositions across successive chapters', () => {
  for (const room of Object.values(roomManifest)) {
    const visits = Array.from({ length: 12 }, (_, i) => resolveVisit(room.id, i + 1));
    for (let i = 1; i < visits.length; i++) {
      expect(visits[i].id).not.toBe(visits[i - 1].id);
      expect(visits[i].camera.position).not.toEqual(visits[i - 1].camera.position);
    }
    expect(resolveVisit(room.id, 2)).toEqual(visits[1]);
    expect(visits[0].posterUrl).toBe(room.posterUrl);
    expect(visits[1].posterUrl).toBe(`/history/${room.id}/poster-detail.webp`);
    for (const visit of visits) {
      expect(visit.arrival.duration).toBeLessThanOrEqual(1.2);
      expect(room.objects.some(o => o.id === visit.focusObjectId)).toBe(true);
      expect(visit.arrival.position).not.toEqual(visit.camera.position);
    }
  }
});

test('untrusted room and invalid chapter input use the authored initial visit', () => {
  for (const invalid of [NaN, Infinity, -1, 0, 2.5, '2', undefined]) {
    expect(resolveVisit('archive', invalid)).toEqual(resolveVisit('archive', 1));
  }
  for (const id of ['https://example.com/model.glb', '__proto__', null]) {
    expect(resolveVisit(id, 1)).toEqual(resolveVisit('archive', 1));
  }
});
