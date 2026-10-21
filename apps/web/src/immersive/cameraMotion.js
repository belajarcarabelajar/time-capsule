import { Spherical, Vector3 } from 'three';

export const TOUR_GLIDE_SECONDS = 2.4;
const DRIFT_PERIOD_SECONDS = 16;
const orbitTarget = new Vector3();
const orbitPosition = new Vector3();
const orbitSpherical = new Spherical();

export function createCameraMotion(from, to, duration) {
  return {
    from: { position: [...from.position], target: [...from.target] },
    to: { position: [...to.position], target: [...to.target] },
    duration: Math.max(0, duration),
    elapsed: 0,
  };
}

export function advanceCameraMotion(motion, delta) {
  if (Number.isFinite(delta) && delta > 0) motion.elapsed += delta;
  const progress = motion.duration === 0 ? 1 : Math.min(1, motion.elapsed / motion.duration);
  const eased = progress * progress * (3 - 2 * progress);
  const interpolate = key => motion.from[key].map((value, index) =>
    value + (motion.to[key][index] - value) * eased);
  return {
    position: interpolate('position'),
    target: interpolate('target'),
    done: progress === 1,
  };
}

// Same orbit as RoomCamera applyView: spherical offset around the target, phi kept off the poles.
export function orbitPose(view, yaw, pitch, scale = 1) {
  orbitTarget.fromArray(view.target);
  orbitSpherical.setFromVector3(orbitPosition.fromArray(view.position).sub(orbitTarget));
  orbitSpherical.theta += yaw;
  orbitSpherical.phi += pitch;
  orbitSpherical.radius *= scale;
  orbitSpherical.makeSafe();
  return { position: orbitPosition.setFromSpherical(orbitSpherical).add(orbitTarget).toArray(), target: [...view.target] };
}

export function driftPose(stop, elapsed, limits) {
  if (!Number.isFinite(elapsed) || elapsed <= 0) return { position: [...stop.position], target: [...stop.target] };
  const phase = 2 * Math.PI * elapsed / DRIFT_PERIOD_SECONDS;
  const amplitude = Number.isFinite(limits?.yawLimit) ? Math.min(0.05, 0.12 * limits.yawLimit) : 0;
  return orbitPose(stop, amplitude * Math.sin(phase), 0, 1 - 0.015 * (1 - Math.cos(phase)) / 2);
}

export function chooseCameraTransition({ initialized, motionEnabled, arriving, arrivalPending, arrivalDuration, wasArrival, viewChanged, tourAdvance }) {
  if (arriving && motionEnabled && arrivalPending) return { kind: 'arrival', duration: arrivalDuration };
  if (initialized && motionEnabled && !arriving && (!wasArrival || viewChanged)) {
    return { kind: 'glide', duration: tourAdvance ? TOUR_GLIDE_SECONDS : 0.45 };
  }
  return { kind: 'cut', duration: 0 };
}

export function shouldSettle({ wasDrifting, drift, motionEnabled, exploring, selectedObject, moving }) {
  return Boolean(wasDrifting && !drift && motionEnabled && !exploring && !selectedObject && !moving);
}
