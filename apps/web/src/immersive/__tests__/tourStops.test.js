import { describe, expect, test } from 'bun:test';
import { roomManifest } from '../rooms.js';
import { resolveVisit } from '../visualVisits.js';
import { TOUR_GLIDE_SECONDS, buildTour, tourStopAt } from '../tourStops.js';

const archive = roomManifest.archive;
const rooms = Object.values(roomManifest);
const chapters = [1, 2, 3];
const direction = view => view.position.map((value, index) => value - view.target[index]);
const length = vector => Math.hypot(...vector);
// Signed angle in the xz plane, positive when theta = atan2(x, z) grows.
const horizontalAngle = (from, to) => Math.atan2(to[0] * from[2] - to[2] * from[0], from[0] * to[0] + from[2] * to[2]);
const angleBetween = (from, to) => Math.acos(Math.min(1, from.reduce((sum, value, index) => sum + value * to[index], 0) / (length(from) * length(to))));
const samePose = (a, b) => JSON.stringify([a.position, a.target]) === JSON.stringify([b.position, b.target]);
const stopById = (tour, id) => tour.find(stop => stop.id === id);

describe('auto-tour stops', () => {
  test('glide length is 2.4 seconds', () => {
    expect(TOUR_GLIDE_SECONDS).toBe(2.4);
  });

  test('archive chapter 1 tour visits every tour stop in the base order from the wide view', () => {
    const tour = buildTour(archive, resolveVisit('archive', 1));
    expect(tour.map(stop => stop.id)).toEqual([
      'archive:wide', 'archive:sweep-left', 'archive:close-instrument', 'archive:detail',
      'archive:close-map', 'archive:sweep-right', 'archive:close-cabinet', 'archive:overview',
    ]);
    expect(tour.map(stop => stop.kind)).toEqual(['wide', 'orbit', 'close', 'wide', 'close', 'orbit', 'close', 'orbit']);
    expect(tour[0].position).toEqual([7, 6, 10]);
    expect(tour[0].target).toEqual([0, 1.6, -1]);
    expect(stopById(tour, 'archive:close-map')).toMatchObject({ position: [2, 3.7, 4], target: [0, 1, 0] });
  });

  test('chapter 2 tour starts at the detail stop and chapter 3 at the cabinet close-up', () => {
    const second = buildTour(archive, resolveVisit('archive', 2));
    expect(second[0]).toMatchObject({ id: 'archive:detail', position: [6, 5, 9], target: [-0.6, 1.6, -1] });
    expect(second.map(stop => stop.id).slice(0, 3)).toEqual(['archive:detail', 'archive:close-map', 'archive:sweep-right']);
    const third = buildTour(archive, resolveVisit('archive', 3));
    expect(third[0]).toMatchObject({ id: 'archive:close-cabinet', position: [1, 2.8, 4], target: [-3, 2, -3] });
    expect(third.at(-1).id).toBe('archive:sweep-right');
  });

  for (const room of rooms) {
    for (const chapter of chapters) {
      test(`${room.id} chapter ${chapter} tour starts at the visit camera and never repeats a pose or two close-ups in a row`, () => {
        const tour = buildTour(room, resolveVisit(room.id, chapter));
        const camera = resolveVisit(room.id, chapter).camera;
        expect(tour).toHaveLength(8);
        expect(tour[0].position).toEqual(camera.position);
        expect(tour[0].target).toEqual(camera.target);
        expect(new Set(tour.map(stop => stop.id)).size).toBe(8);
        tour.forEach((stop, index) => {
          const next = tour[(index + 1) % tour.length];
          expect(samePose(stop, next)).toBe(false);
          expect(stop.kind === 'close' && next.kind === 'close').toBe(false);
          expect(stop.id.startsWith(`${room.id}:`)).toBe(true);
          for (const value of [...stop.position, ...stop.target]) expect(Number.isFinite(value)).toBe(true);
        });
      });
    }

    test(`${room.id} sweep tour stops orbit the wide view by 0.8 of the yaw limit at the same distance`, () => {
      const tour = buildTour(room, resolveVisit(room.id, 1));
      const base = direction(room.camera);
      for (const [name, sign] of [['sweep-left', -1], ['sweep-right', 1]]) {
        const stop = stopById(tour, `${room.id}:${name}`);
        expect(stop.kind).toBe('orbit');
        expect(stop.target).toEqual(room.camera.target);
        expect(Math.abs(length(direction(stop)) - length(base))).toBeLessThan(1e-9);
        expect(Math.abs(horizontalAngle(base, direction(stop)) - sign * 0.8 * room.camera.yawLimit)).toBeLessThan(1e-6);
        expect(Math.abs(stop.position[1] - room.camera.position[1])).toBeLessThan(1e-9);
      }
    });

    test(`${room.id} overview tour stop lifts the detail view by 0.8 of the pitch limit at the same distance`, () => {
      const tour = buildTour(room, resolveVisit(room.id, 1));
      const detail = resolveVisit(room.id, 2).camera;
      const stop = stopById(tour, `${room.id}:overview`);
      expect(stop.kind).toBe('orbit');
      expect(stop.target).toEqual(detail.target);
      expect(Math.abs(length(direction(stop)) - length(direction(detail)))).toBeLessThan(1e-9);
      expect(Math.abs(horizontalAngle(direction(detail), direction(stop)))).toBeLessThan(1e-9);
      expect(Math.abs(angleBetween(direction(detail), direction(stop)) - 0.8 * room.camera.pitchLimit)).toBeLessThan(1e-6);
      expect(stop.position[1]).toBeGreaterThan(detail.position[1]);
    });
  }

  test('a visit camera outside the base tour becomes tour stop 0 and the tour keeps 8 stops', () => {
    const visit = { id: 'custom', camera: { position: [3, 4, 5], target: [0, 1, 0] } };
    const tour = buildTour(archive, visit);
    expect(tour).toHaveLength(8);
    expect(tour[0]).toEqual({ id: 'archive:visit', kind: 'wide', position: [3, 4, 5], target: [0, 1, 0] });
    expect(tour.slice(1).map(stop => stop.id)).toEqual([
      'archive:wide', 'archive:sweep-left', 'archive:close-instrument', 'archive:detail',
      'archive:close-map', 'archive:sweep-right', 'archive:close-cabinet',
    ]);
  });

  test('a missing visit starts the tour at the wide view', () => {
    expect(buildTour(archive, null)[0].id).toBe('archive:wide');
  });

  test('an unknown room id takes its detail tour stop from the archive fallback visit', () => {
    const tour = buildTour({ ...archive, id: 'unknown-room' }, resolveVisit('unknown-room', 1));
    expect(stopById(tour, 'unknown-room:detail')).toMatchObject({ position: [6, 5, 9], target: [-0.6, 1.6, -1] });
  });

  test('tour stops are fresh copies that never share arrays with the manifest', () => {
    const first = buildTour(archive, resolveVisit('archive', 1));
    const second = buildTour(archive, resolveVisit('archive', 1));
    expect(second).toEqual(first);
    expect(second[0]).not.toBe(first[0]);
    expect(first[0].position).not.toBe(archive.camera.position);
    expect(stopById(first, 'archive:close-map').target).not.toBe(archive.objects[1].view.target);
    first.forEach(stop => {
      stop.position[0] = 99;
      stop.target[0] = 99;
    });
    expect(archive.camera.position).toEqual([7, 6, 10]);
    expect(archive.objects[1].view.target).toEqual([0, 1, 0]);
    expect(resolveVisit('archive', 2).camera.position).toEqual([6, 5, 9]);
  });
});

describe('tourStopAt', () => {
  const tour = Array.from({ length: 8 }, (_, index) => ({ id: `stop-${index}` }));

  test('each dialogue step maps to the next tour stop and wraps after 8', () => {
    for (let step = 0; step < 8; step++) expect(tourStopAt(tour, step)).toBe(tour[step]);
    expect(tourStopAt(tour, 8)).toBe(tour[0]);
    expect(tourStopAt(tour, 17)).toBe(tour[1]);
  });

  test('a negative, fractional, or non-finite step returns tour stop 0', () => {
    for (const step of [-1, 1.5, NaN, Infinity, -Infinity, undefined]) expect(tourStopAt(tour, step)).toBe(tour[0]);
  });

  test('an empty or missing tour returns null', () => {
    expect(tourStopAt([], 0)).toBeNull();
    expect(tourStopAt(null, 3)).toBeNull();
  });
});
