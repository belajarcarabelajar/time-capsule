import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Spherical } from 'three';
import { clampView } from './renderPolicy.js';
import { advanceCameraMotion, chooseCameraTransition, createCameraMotion, driftPose, shouldApplyLookOffset, shouldSettle } from './cameraMotion.js';

export default function RoomCamera({ room, visit, arriving, onArrivalComplete, exploring, selectedObject, motionEnabled, viewOffset, tourStop, drift }) {
  const { camera, gl, invalidate } = useThree();
  const offset = useRef({ yaw: 0, pitch: 0 });
  const last = useRef(null);
  const motion = useRef(null);
  const consumedArrival = useRef(null);
  const previousViewOffset = useRef(viewOffset);
  const initialized = useRef(false);
  const previousView = useRef(null);
  const previousTourStop = useRef(tourStop);
  const driftTime = useRef(0);
  const previousDrift = useRef(drift);
  const completion = useRef(onArrivalComplete);
  completion.current = onArrivalComplete;
  const targets = useMemo(() => ({ position: new Vector3(), target: new Vector3(), direction: new Vector3(), spherical: new Spherical() }), []);
  const view = selectedObject?.view || tourStop || visit?.camera || room.camera;

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
    driftTime.current = 0;
    const wasArrival = Boolean(motion.current?.arrival);
    const viewChanged = previousView.current !== null && previousView.current !== view;
    const tourAdvance = previousTourStop.current !== tourStop && !selectedObject;
    previousView.current = view;
    previousTourStop.current = tourStop;
    motion.current = null;
    const transition = chooseCameraTransition({
      initialized: initialized.current, motionEnabled, arriving,
      arrivalPending: Boolean(visit?.arrival) && consumedArrival.current !== visit.id,
      arrivalDuration: visit?.arrival?.duration, wasArrival, viewChanged, tourAdvance,
    });
    if (transition.kind === 'arrival') {
      consumedArrival.current = visit.id;
      applyPose(visit.arrival);
      motion.current = { ...createCameraMotion(visit.arrival, view, visit.arrival.duration), arrival: true };
    } else if (transition.kind === 'glide') {
      // Starting from the current pose retargets a glide in flight instead of queueing it.
      motion.current = createCameraMotion({ position: camera.position.toArray(), target: targets.target.toArray() }, view, transition.duration);
    } else {
      applyView();
      if (arriving && !motionEnabled) {
        consumedArrival.current = visit?.id;
        completion.current?.();
      }
    }
    initialized.current = true;
    invalidate();
  }, [view, visit, arriving, exploring, motionEnabled, tourStop, selectedObject, applyPose, applyView, camera, targets, invalidate]);

  // Declared after the view effect, so a glide it starts in the same commit counts as moving.
  useEffect(() => {
    const wasDrifting = previousDrift.current;
    previousDrift.current = drift;
    if (!shouldSettle({ wasDrifting, drift, motionEnabled, exploring, selectedObject, moving: Boolean(motion.current) })) return;
    motion.current = createCameraMotion({ position: camera.position.toArray(), target: targets.target.toArray() }, view, 0.45);
    invalidate();
  }, [drift, motionEnabled, exploring, selectedObject, view, camera, targets, invalidate]);

  useEffect(() => {
    const previous = previousViewOffset.current;
    previousViewOffset.current = viewOffset;
    if (!shouldApplyLookOffset({ previous, next: viewOffset, exploring })) return;
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
    if (motion.current) {
      const current = motion.current;
      const pose = advanceCameraMotion(current, delta);
      applyPose(pose);
      if (pose.done) {
        motion.current = null;
        driftTime.current = 0;
        if (current.arrival) completion.current?.();
      } else invalidate();
      return;
    }
    // The frameloop is 'always' whenever motion is enabled, so drift needs no invalidate.
    if (!drift || !motionEnabled || exploring || selectedObject) return;
    if (Number.isFinite(delta) && delta > 0) driftTime.current += delta;
    applyPose(driftPose(view, driftTime.current, room.camera));
  });
  return null;
}
