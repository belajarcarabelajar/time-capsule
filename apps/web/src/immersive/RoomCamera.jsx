import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Spherical } from 'three';
import { clampView } from './renderPolicy.js';

export default function RoomCamera({ room, exploring, selectedObject, motionEnabled, viewOffset }) {
  const { camera, gl, invalidate } = useThree();
  const offset = useRef({ yaw: 0, pitch: 0 });
  const last = useRef(null);
  const targets = useMemo(() => ({ position: new Vector3(), target: new Vector3(), direction: new Vector3(), spherical: new Spherical() }), []);
  const view = selectedObject?.view || room.camera;

  const applyView = (immediate = false) => {
    targets.target.fromArray(view.target);
    targets.position.fromArray(view.position);
    targets.direction.copy(targets.position).sub(targets.target);
    targets.spherical.setFromVector3(targets.direction);
    targets.spherical.theta += offset.current.yaw;
    targets.spherical.phi += offset.current.pitch;
    targets.spherical.makeSafe();
    targets.position.setFromSpherical(targets.spherical).add(targets.target);
    if (immediate || !motionEnabled) camera.position.copy(targets.position);
    else camera.position.lerp(targets.position, 0.09);
    camera.lookAt(targets.target);
  };

  useEffect(() => {
    offset.current = { yaw: 0, pitch: 0 };
    applyView(true);
    invalidate();
  }, [view, exploring, motionEnabled]); // Authored view changes reset free-look.

  useEffect(() => {
    if (!viewOffset) return;
    offset.current = clampView(viewOffset, room.camera);
    applyView(true);
    invalidate();
  }, [viewOffset]);

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
      applyView(!motionEnabled);
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
  }, [exploring, view, motionEnabled, room.camera, gl]);

  useFrame(() => applyView());
  return null;
}
