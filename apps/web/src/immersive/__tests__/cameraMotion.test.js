import { describe, expect, test } from 'bun:test';
import { advanceCameraMotion, createCameraMotion } from '../cameraMotion.js';

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
