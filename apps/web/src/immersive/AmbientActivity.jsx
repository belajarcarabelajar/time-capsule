import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { createAmbientMotion } from './ambientMotion.js';

export default function AmbientActivity({ scene, roomId, enabled }) {
  const motion = useMemo(() => createAmbientMotion(scene, roomId), [scene, roomId]);
  useEffect(() => () => motion.reset(), [motion]);
  useFrame((_, delta) => motion.update(delta, enabled));
  return null;
}
