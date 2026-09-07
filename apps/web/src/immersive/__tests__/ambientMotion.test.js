import { expect, test } from 'bun:test';
import { Group } from 'three';
import { createAmbientMotion } from '../ambientMotion.js';

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
