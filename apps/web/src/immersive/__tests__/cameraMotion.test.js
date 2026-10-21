import { describe, expect, test } from 'bun:test';
import { advanceCameraMotion, chooseCameraTransition, createCameraMotion, driftPose } from '../cameraMotion.js';

const start = { position: [0, 2, 8], target: [0, 0, 0] };
const end = { position: [2, 3, 5], target: [1, 1, -1] };

describe('camera motion', () => {
  test('starts and finishes at exact authored position and target', () => {
    const motion = createCameraMotion(start, end, 1.2);
    expect(advanceCameraMotion(motion, 0)).toEqual({ ...start, done: false });
    expect(advanceCameraMotion(motion, 1.2)).toEqual({ ...end, done: true });
    expect(advanceCameraMotion(motion, 10)).toEqual({ ...end, done: true });
  });

  test('interpolates both vectors and gives the same pose at equal elapsed time', () => {
    const coarse = createCameraMotion(start, end, 1.2);
    const fine = createCameraMotion(start, end, 1.2);
    const expected = advanceCameraMotion(coarse, 0.6);
    let actual;
    for (let index = 0; index < 36; index++) actual = advanceCameraMotion(fine, 1 / 60);
    for (const vector of ['position', 'target']) {
      expected[vector].forEach((value, index) => {
        expect(actual[vector][index]).toBeCloseTo(value, 10);
        expect(value).toBeCloseTo((start[vector][index] + end[vector][index]) / 2, 10);
      });
    }
  });

  test('ignores invalid frame deltas without moving backwards or poisoning state', () => {
    const motion = createCameraMotion(start, end, 1.2);
    const pose = advanceCameraMotion(motion, 0.4);
    for (const delta of [-1, NaN, Infinity, undefined]) {
      expect(advanceCameraMotion(motion, delta)).toEqual(pose);
    }
    expect(advanceCameraMotion(motion, 1)).toEqual({ ...end, done: true });
  });

  test('zero duration applies final pose immediately and snapshots authored vectors', () => {
    const destination = { position: [...end.position], target: [...end.target] };
    const motion = createCameraMotion(start, destination, 0);
    destination.position[0] = 99;
    expect(advanceCameraMotion(motion, 0)).toEqual({ ...end, done: true });
  });
});

describe('drift around a tour stop', () => {
  const stop = { id: 'archive:wide', kind: 'wide', position: [7, 6, 10], target: [0, 1.6, -1] };
  const archiveLimits = { yawLimit: 0.45, pitchLimit: 0.2 };
  const direction = pose => pose.position.map((value, index) => value - pose.target[index]);
  const distance = pose => Math.hypot(...direction(pose));
  // Signed angle in the xz plane, positive when theta = atan2(x, z) grows.
  const yawFrom = (from, to) => {
    const [a, b] = [direction(from), direction(to)];
    return Math.atan2(b[0] * a[2] - b[2] * a[0], a[0] * b[0] + a[2] * b[2]);
  };
  const elevation = pose => Math.asin(direction(pose)[1] / distance(pose));

  test('drift at elapsed 0, negative, or non-finite time returns the tour stop exactly', () => {
    for (const elapsed of [0, -3, NaN, Infinity, undefined]) {
      const pose = driftPose(stop, elapsed, archiveLimits);
      expect(pose).toEqual({ position: [7, 6, 10], target: [0, 1.6, -1] });
      expect(pose.position).not.toBe(stop.position);
      expect(pose.target).not.toBe(stop.target);
    }
  });

  test('drift reaches the full yaw amplitude and a 0.75% dolly at a quarter period', () => {
    const pose = driftPose(stop, 4, archiveLimits);
    expect(yawFrom(stop, pose)).toBeCloseTo(0.05, 9);
    expect(distance(pose) / distance(stop)).toBeCloseTo(0.9925, 9);
    expect(yawFrom(stop, driftPose(stop, 12, archiveLimits))).toBeCloseTo(-0.05, 9);
  });

  test('drift dollies in by exactly 1.5% at half a period with no yaw', () => {
    const pose = driftPose(stop, 8, archiveLimits);
    expect(yawFrom(stop, pose)).toBeCloseTo(0, 9);
    expect(distance(pose) / distance(stop)).toBeCloseTo(0.985, 9);
  });

  test('drift amplitude shrinks to 0.12 of a small yaw limit', () => {
    expect(yawFrom(stop, driftPose(stop, 4, { yawLimit: 0.4, pitchLimit: 0.2 }))).toBeCloseTo(0.048, 9);
    expect(yawFrom(stop, driftPose(stop, 4, { yawLimit: 0.2, pitchLimit: 0.2 }))).toBeCloseTo(0.024, 9);
  });

  test('drift stays inside the yaw amplitude and 1.5% dolly and never moves the target', () => {
    for (const [limits, amplitude] of [[archiveLimits, 0.05], [{ yawLimit: 0.4, pitchLimit: 0.2 }, 0.048]]) {
      for (let elapsed = 0; elapsed <= 32; elapsed += 0.125) {
        const pose = driftPose(stop, elapsed, limits);
        expect(Math.abs(yawFrom(stop, pose))).toBeLessThanOrEqual(amplitude + 1e-9);
        expect(Math.abs(distance(pose) / distance(stop) - 1)).toBeLessThanOrEqual(0.015 + 1e-12);
        expect(Math.abs(elevation(pose) - elevation(stop))).toBeLessThan(1e-9);
        expect(pose.target).toEqual([0, 1.6, -1]);
      }
    }
  });

  test('drift without room limits only dollies and stays finite', () => {
    const pose = driftPose(stop, 4, undefined);
    for (const value of pose.position) expect(Number.isFinite(value)).toBe(true);
    expect(yawFrom(stop, pose)).toBeCloseTo(0, 9);
  });
});

describe('camera transition choice', () => {
  const base = {
    initialized: true, motionEnabled: true, arriving: false, arrivalPending: false,
    arrivalDuration: 1.2, wasArrival: false, viewChanged: true, tourAdvance: false,
  };

  test('a pending arrival with motion plays the arrival shot, even on first mount', () => {
    expect(chooseCameraTransition({ ...base, arriving: true, arrivalPending: true })).toEqual({ kind: 'arrival', duration: 1.2 });
    expect(chooseCameraTransition({ ...base, initialized: false, arriving: true, arrivalPending: true, arrivalDuration: 2 }))
      .toEqual({ kind: 'arrival', duration: 2 });
  });

  test('a tour stop change with motion glides for 2.4 seconds', () => {
    expect(chooseCameraTransition({ ...base, tourAdvance: true })).toEqual({ kind: 'glide', duration: 2.4 });
  });

  test('a new line during the arrival shot glides from the current pose to the tour stop', () => {
    expect(chooseCameraTransition({ ...base, wasArrival: true, viewChanged: true, tourAdvance: true }))
      .toEqual({ kind: 'glide', duration: 2.4 });
  });

  test('an explore or inspect view change with motion glides for 0.45 seconds', () => {
    expect(chooseCameraTransition(base)).toEqual({ kind: 'glide', duration: 0.45 });
  });

  test('motion off cuts instead of gliding or playing the arrival', () => {
    expect(chooseCameraTransition({ ...base, motionEnabled: false, tourAdvance: true })).toEqual({ kind: 'cut', duration: 0 });
    expect(chooseCameraTransition({ ...base, motionEnabled: false, arriving: true, arrivalPending: true })).toEqual({ kind: 'cut', duration: 0 });
  });

  test('the first mount without a pending arrival cuts', () => {
    expect(chooseCameraTransition({ ...base, initialized: false, tourAdvance: true })).toEqual({ kind: 'cut', duration: 0 });
  });

  test('an arrival ended by the skip button without a view change cuts', () => {
    expect(chooseCameraTransition({ ...base, wasArrival: true, viewChanged: false })).toEqual({ kind: 'cut', duration: 0 });
  });

  test('an arrival already consumed while still arriving cuts', () => {
    expect(chooseCameraTransition({ ...base, arriving: true, arrivalPending: false, tourAdvance: true })).toEqual({ kind: 'cut', duration: 0 });
  });
});
