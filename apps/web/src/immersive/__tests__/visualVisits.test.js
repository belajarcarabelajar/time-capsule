import { expect, test } from 'bun:test';
import { roomManifest } from '../rooms.js';
import { resolveVisit } from '../visualVisits.js';

const legacyDetails = {
  archive: { position: [6, 5, 9], target: [-0.6, 1.6, -1] },
  'ww1-field-station': { position: [5.5, 4.7, 9], target: [-0.5, 1.5, -1] },
  'ww2-radio-room': { position: [5, 4.5, 9], target: [0, 1.5, -1.2] },
  'kingdom-court': { position: [6, 4.8, 10], target: [-0.6, 1.6, -1] },
  'market-port': { position: [7, 4.2, 11], target: [-0.5, 1.2, -2] },
  'rural-village': { position: [8, 5.4, 9.5], target: [-0.4, 1.1, -1.5] },
  'resistance-outpost': { position: [8.5, 5.8, 10], target: [-0.4, 1.4, -1.5] },
  'ancient-library': { position: [6, 5, 9], target: [-0.6, 1.6, -1] },
};

for (const room of Object.values(roomManifest)) {
  test(`${room.id} cycles reveal, focus, context with compatible first two views`, () => {
    const visits = Array.from({ length: 12 }, (_, i) => resolveVisit(room.id, i + 1));
    expect(visits.slice(0, 3).map(visit => visit.id)).toEqual(
      ['reveal', 'focus', 'context'].map(beat => `${room.id}-${beat}`),
    );
    expect(visits[0].camera).toEqual(room.camera);
    expect(visits[0].arrival).toEqual({ ...legacyDetails[room.id], duration: 1.2 });
    expect(visits[1].camera).toEqual(legacyDetails[room.id]);
    expect(visits[1].arrival).toEqual({
      position: room.camera.position, target: room.camera.target, duration: 1.2,
    });
    expect(visits[2].camera).toEqual(room.objects[2].view);
    expect(visits[2].arrival).toEqual({ ...legacyDetails[room.id], duration: 1.2 });
    expect(visits.slice(0, 3).map(visit => visit.focusObjectId)).toEqual(room.objects.map(object => object.id));
    expect(visits[2].posterUrl).toBe(`/history/${room.id}/poster-context.webp`);
    for (let i = 3; i < visits.length; i++) expect(visits[i]).toEqual(visits[i % 3]);
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
  });
}

test('untrusted room and invalid chapter input use the authored initial visit', () => {
  for (const invalid of [NaN, Infinity, -Infinity, -1, 0, 2.5, '2', undefined, null, Number.MAX_SAFE_INTEGER + 1]) {
    expect(resolveVisit('archive', invalid)).toEqual(resolveVisit('archive', 1));
  }
  for (const id of ['https://example.com/model.glb', '__proto__', null]) {
    expect(resolveVisit(id, 1)).toEqual(resolveVisit('archive', 1));
  }
});
