import { TOUR_GLIDE_SECONDS, orbitPose } from './cameraMotion.js';
import { clampView } from './renderPolicy.js';
import { resolveVisit } from './visualVisits.js';

export { TOUR_GLIDE_SECONDS };

const copyPose = view => ({ position: [...view.position], target: [...view.target] });
const samePose = (a, b) => ['position', 'target'].every(key =>
  a[key].length === b[key].length && a[key].every((value, index) => value === b[key][index]));

export function buildTour(room, visit) {
  const orbit = (view, yaw, pitch) => {
    const offset = clampView({ yaw, pitch }, room.camera);
    return orbitPose(view, offset.yaw, offset.pitch);
  };
  const detail = resolveVisit(room.id, 2).camera;
  const [first, second, third] = room.objects;
  const stops = [
    ['wide', 'wide', copyPose(room.camera)],
    ['sweep-left', 'orbit', orbit(room.camera, -0.8 * room.camera.yawLimit, 0)],
    [`close-${first.id}`, 'close', copyPose(first.view)],
    ['detail', 'wide', copyPose(detail)],
    [`close-${second.id}`, 'close', copyPose(second.view)],
    ['sweep-right', 'orbit', orbit(room.camera, 0.8 * room.camera.yawLimit, 0)],
    [`close-${third.id}`, 'close', copyPose(third.view)],
    ['overview', 'orbit', orbit(detail, 0, -0.8 * room.camera.pitchLimit)],
  ].map(([name, kind, pose]) => ({ id: `${room.id}:${name}`, kind, ...pose }));
  const camera = visit?.camera || room.camera;
  const start = stops.findIndex(stop => samePose(stop, camera));
  if (start < 0) return [{ id: `${room.id}:visit`, kind: 'wide', ...copyPose(camera) }, ...stops.slice(0, -1)];
  return [...stops.slice(start), ...stops.slice(0, start)];
}

export function tourStopAt(tour, step) {
  if (!tour?.length) return null;
  return tour[Number.isSafeInteger(step) && step > 0 ? step % tour.length : 0];
}
