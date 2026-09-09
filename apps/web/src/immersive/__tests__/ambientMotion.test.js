import { expect, test } from 'bun:test';
import { Group } from 'three';
import { createAmbientMotion } from '../ambientMotion.js';
import { roomManifest } from '../rooms.js';

const propAxes = {
  archive: 'y',
  'ww1-field-station': 'x',
  'ww2-radio-room': 'z',
  'kingdom-court': 'z',
  'market-port': 'z',
  'rural-village': 'x',
  'resistance-outpost': 'z',
  'ancient-library': 'y',
};

function fixture(roomId) {
  const root = new Group();
  const figure = new Group(); figure.name = 'ambient_figure';
  const prop = new Group(); prop.name = 'ambient_prop';
  const child = new Group(); child.name = 'authored-detail';
  const other = new Group(); other.name = 'telephone';
  prop.add(child);
  root.add(figure, prop, other);
  for (const node of [root, figure, prop, child, other]) {
    node.position.set(1, 2, 3);
    node.rotation.set(0.2, 0.4, -0.3, 'ZYX');
    node.scale.set(2, 3, 4);
  }
  return { root, figure, prop, child, other, motion: createAmbientMotion(root, roomId) };
}

function transform(node) {
  return [node.position.toArray(), node.rotation.toArray(), node.scale.toArray()];
}

test('motion coverage includes all eight registered rooms', () => {
  expect(Object.keys(propAxes).sort()).toEqual(Object.keys(roomManifest).sort());
  expect(Object.keys(propAxes)).toHaveLength(8);
});

for (const [roomId, axis] of Object.entries(propAxes)) {
  test(`${roomId} moves its authored prop axis within bounds and isolates scenes`, () => {
    const f = fixture(roomId);
    const untouched = fixture(roomId);
    const bases = [f.root, f.figure, f.prop, f.child, f.other].map(transform);
    const propBase = f.prop.rotation[axis];
    f.motion.update(0.1, true);
    expect(f.prop.rotation[axis]).not.toBe(propBase);
    expect(f.figure.rotation.y).not.toBe(0.4);
    if (roomId === 'market-port') expect(f.prop.position.y).not.toBe(2);
    for (let i = 0; i < 1000; i++) {
      f.motion.update(0.1, true);
      expect(Math.abs(f.prop.rotation[axis] - propBase)).toBeLessThanOrEqual(0.025 + 1e-12);
      expect(Math.abs(f.figure.rotation.y - 0.4)).toBeLessThanOrEqual(0.025 + 1e-12);
      expect(Math.abs(f.prop.position.y - 2)).toBeLessThanOrEqual(0.02 + 1e-12);
    }
    for (const otherAxis of ['x', 'y', 'z'].filter(value => value !== axis)) {
      expect(f.prop.rotation[otherAxis]).toBe(untouched.prop.rotation[otherAxis]);
    }
    expect(f.figure.position.toArray()).toEqual([1, 2, 3]);
    expect(f.figure.rotation.x).toBe(0.2);
    expect(f.figure.rotation.z).toBe(-0.3);
    expect(f.prop.position.x).toBe(1);
    expect(f.prop.position.z).toBe(3);
    if (roomId !== 'market-port') expect(f.prop.position.y).toBe(2);
    expect(transform(f.root)).toEqual(bases[0]);
    expect(transform(f.child)).toEqual(bases[3]);
    expect(transform(f.other)).toEqual(bases[4]);
    expect(transform(untouched.figure)).toEqual(bases[1]);
    expect(transform(untouched.prop)).toEqual(bases[2]);
    f.motion.reset();
    expect([f.root, f.figure, f.prop, f.child, f.other].map(transform)).toEqual(bases);
    // A remounted controller starts from the authored transform and time zero.
    const remounted = createAmbientMotion(f.root, roomId);
    remounted.update(0.1, true);
    untouched.motion.update(0.1, true);
    expect(transform(f.prop)).toEqual(transform(untouched.prop));
    expect(transform(f.figure)).toEqual(transform(untouched.figure));
  });

  test(`${roomId} clamps delta, pauses without hidden time, and resets its clock`, () => {
    const f = fixture(roomId);
    const control = fixture(roomId);
    const initial = [transform(f.figure), transform(f.prop)];
    f.motion.update(100, false);
    for (const delta of [NaN, Infinity, -Infinity, -1, 0, undefined, null, '0.1']) f.motion.update(delta, true);
    expect([transform(f.figure), transform(f.prop)]).toEqual(initial);
    f.motion.update(100, true);
    control.motion.update(0.1, true);
    expect(transform(f.prop)).toEqual(transform(control.prop));
    expect(transform(f.figure)).toEqual(transform(control.figure));
    const paused = [transform(f.figure), transform(f.prop)];
    f.motion.update(100, false);
    expect([transform(f.figure), transform(f.prop)]).toEqual(paused);
    f.motion.update(0.04, true);
    control.motion.update(0.04, true);
    expect(transform(f.prop)).toEqual(transform(control.prop));
    expect(transform(f.figure)).toEqual(transform(control.figure));
    f.motion.reset();
    f.motion.reset();
    expect([transform(f.figure), transform(f.prop)]).toEqual(initial);
    control.motion.reset();
    f.motion.update(0.04, true);
    control.motion.update(0.04, true);
    expect(transform(f.prop)).toEqual(transform(control.prop));
    expect(transform(f.figure)).toEqual(transform(control.figure));
  });
}

test('all room prop profiles have distinct motion signatures', () => {
  const signatures = Object.keys(propAxes).map(roomId => {
    const f = fixture(roomId);
    for (let i = 0; i < 10; i++) f.motion.update(0.1, true);
    return JSON.stringify(transform(f.prop));
  });
  expect(new Set(signatures).size).toBe(8);
});

test('untrusted room IDs fall back to archive motion', () => {
  const archive = fixture('archive');
  archive.motion.update(0.1, true);
  for (const roomId of ['missing', '__proto__', 'constructor', null, undefined]) {
    const f = fixture(roomId);
    f.motion.update(0.1, true);
    expect(transform(f.prop)).toEqual(transform(archive.prop));
  }
});

test('only authored nodes move, and pausing never accumulates hidden time', () => {
  const root = new Group();
  const figure = new Group(); figure.name = 'ambient_figure'; figure.rotation.y = 0.4;
  const prop = new Group(); prop.name = 'ambient_prop'; prop.position.y = 2;
  const other = new Group(); other.name = 'telephone';
  root.add(figure, prop, other);
  const motion = createAmbientMotion(root, 'archive');
  motion.update(0.5, true);
  expect(figure.rotation.y).not.toBe(0.4);
  expect(prop.rotation.y).not.toBe(0);
  const before = figure.rotation.y;
  motion.update(100, false);
  expect(figure.rotation.y).toBe(before);
  expect(other.rotation.y).toBe(0);
  for (let i = 0; i < 500; i++) motion.update(0.1, true);
  expect(Math.abs(figure.rotation.y - 0.4)).toBeLessThanOrEqual(0.025);
  motion.reset();
  expect(figure.rotation.y).toBe(0.4);
  expect(prop.position.y).toBe(2);
});

test('missing nodes and invalid time never damage the scene', () => {
  const root = new Group();
  const motion = createAmbientMotion(root, 'market-port');
  for (const delta of [NaN, Infinity, -1, 0, 500]) motion.update(delta, true);
  motion.reset();
  expect(root.position.toArray()).toEqual([0, 0, 0]);
});
