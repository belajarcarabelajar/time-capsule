import { GlobalRegistrator } from '@happy-dom/global-registrator';
if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register();
import React from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { PerspectiveCamera, Vector3 } from 'three';
import { roomManifest } from '../rooms.js';
import { resolveVisit } from '../visualVisits.js';
import { buildTour } from '../tourStops.js';
import { orbitPose } from '../cameraMotion.js';

// mock.module lasts for the whole bun process, so the web test script runs this file in its own process.
const frames = { current: null };
let state;
mock.module('@react-three/fiber', () => ({
  useThree: () => state,
  useFrame: callback => { frames.current = callback; },
}));
const { default: RoomCamera } = await import('../RoomCamera.jsx');

const archive = roomManifest.archive;
const visit = resolveVisit('archive', 1);
const tour = buildTour(archive, visit);
const wide = { position: [7, 6, 10], target: [0, 1.6, -1] };
const sweepLeft = { position: tour[1].position, target: [0, 1.6, -1] };

const vector = values => new Vector3().fromArray(values);
const distanceTo = position => state.camera.position.distanceTo(vector(position));

function tick(seconds, step = 1 / 60) {
  const steps = Math.round(seconds / step);
  for (let index = 0; index < steps; index++) frames.current(state, step);
}

function expectPose(pose) {
  expect(distanceTo(pose.position)).toBeLessThan(1e-6);
  const looking = state.camera.getWorldDirection(new Vector3());
  const wanted = vector(pose.target).sub(vector(pose.position)).normalize();
  expect(looking.distanceTo(wanted)).toBeLessThan(1e-6);
}

function mount(props = {}) {
  const element = extra => (
    <RoomCamera room={archive} visit={visit} arriving={false} exploring={false} selectedObject={null}
      motionEnabled drift={false} {...props} {...extra} />
  );
  const view = render(element());
  return { rerender: extra => view.rerender(element(extra)) };
}

beforeEach(() => {
  frames.current = null;
  state = {
    camera: new PerspectiveCamera(),
    gl: { domElement: document.createElement('canvas') },
    invalidate: mock(),
  };
});

afterEach(() => { cleanup(); });

describe('RoomCamera', () => {
  test('harness: a tour stop change glides 2.4 s', () => {
    const view = mount({ tourStop: tour[0] });
    expectPose(wide);
    view.rerender({ tourStop: tour[1] });
    tick(1.2);
    expect(distanceTo(wide.position)).toBeGreaterThan(0.05);
    expect(distanceTo(sweepLeft.position)).toBeGreaterThan(0.05);
    tick(1.3);
    expectPose(sweepLeft);
  });

  test('harness: motion off cuts to the stop', () => {
    const view = mount({ tourStop: tour[0], motionEnabled: false });
    expectPose(wide);
    view.rerender({ tourStop: tour[1] });
    expectPose(sweepLeft);
  });

  test('settles: pausing the tour glides onto the exact stop', () => {
    const view = mount({ tourStop: tour[0], drift: true });
    tick(4);
    expect(distanceTo(wide.position)).toBeGreaterThan(1e-3);
    view.rerender({ drift: false });
    tick(0.2);
    expect(distanceTo(wide.position)).toBeGreaterThan(1e-3);
    tick(0.3);
    expectPose(wide);
  });

  test('keyboard look-around while exploring applies immediately', () => {
    const view = mount({ tourStop: tour[0], exploring: true, viewOffset: { yaw: 0, pitch: 0 } });
    expectPose(wide);
    view.rerender({ viewOffset: { yaw: 0.2, pitch: 0 } });
    expectPose(orbitPose(wide, 0.2, 0));
  });

  test('exit glide: leaving explore after keyboard look glides back', () => {
    const view = mount({ tourStop: tour[0], exploring: true, viewOffset: { yaw: 0, pitch: 0 } });
    view.rerender({ viewOffset: { yaw: 0.2, pitch: 0 } });
    const looked = state.camera.position.toArray();
    expect(distanceTo(wide.position)).toBeGreaterThan(0.05);
    // One rerender for both props, the way HistoricalEnvironment.leaveExplore batches its state updates.
    view.rerender({ exploring: false, viewOffset: { yaw: 0, pitch: 0 } });
    tick(0.2);
    expect(distanceTo(looked)).toBeGreaterThan(0.05);
    expect(distanceTo(wide.position)).toBeGreaterThan(0.05);
    tick(0.3);
    expectPose(wide);
  });
});
