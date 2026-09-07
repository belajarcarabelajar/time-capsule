import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Spherical } from 'three';
import { clampView } from './renderPolicy.js';
import { advanceCameraMotion, createCameraMotion } from './cameraMotion.js';

export default function RoomCamera({ room, visit, arriving, onArrivalComplete, exploring, selectedObject, motionEnabled, viewOffset }) {
  const { camera, gl, invalidate } = useThree();
  const offset = useRef({ yaw: 0, pitch: 0 });
  const last = useRef(null);
  const motion = useRef(null);
  const consumedArrival = useRef(null);
  const previousViewOffset = useRef(viewOffset);
  const initialized = useRef(false);
  const completion = useRef(onArrivalComplete);
  completion.current = onArrivalComplete;
  const targets = useMemo(() => ({ position: new Vector3(), target: new Vector3(), direction: new Vector3(), spherical: new Spherical() }), []);
  const view = selectedObject?.view || visit?.camera || room.camera;

  const applyPose = useCallback(pose => {
    camera.position.fromArray(pose.position);
    targets.target.fromArray(pose.target);
    camera.lookAt(targets.target);
  }, [camera, targets]);

  const applyView = useCallback(() => {
    targets.target.fromArray(view.target);
    targets.position.fromArray(view.position);
    targets.direction.copy(targets.position).sub(targets.target);
    targets.spherical.setFromVector3(targets.direction);
    targets.spherical.theta += offset.current.yaw;
    targets.spherical.phi += offset.current.pitch;
    targets.spherical.makeSafe();
    targets.position.setFromSpherical(targets.spherical).add(targets.target);
    camera.position.copy(targets.position);
    camera.lookAt(targets.target);
  }, [camera, targets, view]);

  useEffect(() => {
    offset.current = { yaw: 0, pitch: 0 };
    last.current = null;
    const wasArrival = motion.current?.arrival;
    motion.current = null;
    if (arriving && motionEnabled && visit?.arrival && consumedArrival.current !== visit.id) {
      consumedArrival.current = visit.id;
      applyPose(visit.arrival);
      motion.current = { ...createCameraMotion(visit.arrival, view, visit.arrival.duration), arrival: true };
    } else if (initialized.current && motionEnabled && !wasArrival && !arriving) {
      motion.current = createCameraMotion({ position: camera.position.toArray(), target: targets.target.toArray() }, view, 0.45);
    } else {
      applyView();
      if (arriving && !motionEnabled) {
        consumedArrival.current = visit?.id;
        completion.current?.();
      }
    }
    initialized.current = true;
    invalidate();
  }, [view, visit, arriving, exploring, motionEnabled, applyPose, applyView, camera, targets, invalidate]);

  useEffect(() => {
    const previous = previousViewOffset.current;
    previousViewOffset.current = viewOffset;
    if (!viewOffset || (previous?.yaw === viewOffset.yaw && previous?.pitch === viewOffset.pitch)) return;
    offset.current = clampView(viewOffset, room.camera);
    motion.current = null;
    applyView();
    invalidate();
  }, [viewOffset]); // Only explicit keyboard navigation interrupts a transition.

  useEffect(() => {
    const element = gl.domElement;
    const down = event => {
      if (!exploring) return;
      last.current = { x: event.clientX, y: event.clientY };
      element.setPointerCapture?.(event.pointerId);
    };
    const move = event => {
      if (!exploring || !last.current) return;
      offset.current = clampView({
        yaw: offset.current.yaw - (event.clientX - last.current.x) * 0.003,
        pitch: offset.current.pitch - (event.clientY - last.current.y) * 0.003,
      }, room.camera);
      last.current = { x: event.clientX, y: event.clientY };
      motion.current = null;
      applyView();
      invalidate();
    };
    const up = () => { last.current = null; };
    element.addEventListener('pointerdown', down);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerup', up);
    element.addEventListener('pointercancel', up);
    return () => {
      up();
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerup', up);
      element.removeEventListener('pointercancel', up);
    };
  }, [exploring, applyView, room.camera, gl, invalidate]);

  useFrame((_, delta) => {
    if (!motion.current) return;
    const current = motion.current;
    const pose = advanceCameraMotion(current, delta);
    applyPose(pose);
    if (pose.done) {
      motion.current = null;
      if (current.arrival) completion.current?.();
    } else invalidate();
  });
  return null;
}
