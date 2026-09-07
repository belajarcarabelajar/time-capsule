import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, SRGBColorSpace } from 'three';
import RoomModel from './RoomModel.jsx';
import RoomCamera from './RoomCamera.jsx';
import { createFrameMonitor } from './renderPolicy.js';

function RenderHealth({ active, onError }) {
  const { gl, setDpr } = useThree();
  const monitor = useMemo(createFrameMonitor, [active]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = event => { event.preventDefault(); onError(new Error('Graphics context lost')); };
    canvas.addEventListener('webglcontextlost', lost);
    return () => canvas.removeEventListener('webglcontextlost', lost);
  }, [gl, onError]);
  useFrame((_, delta) => {
    if (!active) return;
    const action = monitor.sample(delta * 1000);
    if (action === 'lower') setDpr(0.75);
    if (action === 'poster') onError(new Error('Graphics performance fallback'));
  });
  return null;
}

function AmbientDust({ enabled }) {
  const points = useRef();
  const positions = useMemo(() => {
    const values = new Float32Array(72);
    for (let i = 0; i < 24; i++) {
      values[i * 3] = Math.sin(i * 7.13) * 3;
      values[i * 3 + 1] = 1 + (i % 9) * 0.3;
      values[i * 3 + 2] = Math.cos(i * 4.37) * 3;
    }
    return values;
  }, []);
  useFrame((_, delta) => {
    if (enabled && points.current) points.current.rotation.y += delta * 0.008;
  });
  if (!enabled) return null;
  return <points ref={points}>
    <bufferGeometry><bufferAttribute attach="attributes-position" count={24} array={positions} itemSize={3} /></bufferGeometry>
    <pointsMaterial color="#e5d3a8" size={0.025} transparent opacity={0.25} depthWrite={false} />
  </points>;
}

export default function RoomCanvas({ room, visit, arriving, onArrivalComplete, mood, motionEnabled, exploring, selectedObject, onReady, onError, viewOffset }) {
  const [ready, setReady] = useState(false);
  const loaded = useCallback(() => { setReady(true); onReady(); }, [onReady]);
  const muted = /😢|😭|🌧/.test(mood || '');
  return <div className="history-canvas" style={{ opacity: ready ? 1 : 0 }}>
    <Canvas camera={{ position: room.camera.position, fov: 32, near: 0.1, far: 60 }}
      dpr={[1, window.innerWidth < 900 ? 1 : 1.5]} frameloop={motionEnabled ? 'always' : 'demand'}
      gl={{ antialias: true, alpha: false, powerPreference: 'low-power' }}
      onCreated={({ gl }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.15;
        gl.outputColorSpace = SRGBColorSpace;
      }}>
      <color attach="background" args={['#202821']} />
      <hemisphereLight args={['#d4deef', '#735033', 2]} />
      <directionalLight position={[2, 7, 4]} color={muted ? '#d5dbe5' : '#ffe0ae'} intensity={3} />
      <directionalLight position={[-4, 4, 2]} color="#b0c9eb" intensity={1} />
      <pointLight position={[1, 2.2, 0]} color="#ffca76" intensity={8} distance={8} decay={2} />
      <RoomModel key={room.id} url={room.modelUrl} roomId={room.id} motionEnabled={motionEnabled && !exploring}
        onReady={loaded} onError={onError} />
      <RoomCamera room={room} visit={visit} arriving={ready && arriving} onArrivalComplete={onArrivalComplete}
        exploring={exploring} selectedObject={selectedObject}
        motionEnabled={motionEnabled} viewOffset={viewOffset} />
      <AmbientDust enabled={motionEnabled && !exploring} />
      <RenderHealth active={motionEnabled && ready} onError={onError} />
    </Canvas>
  </div>;
}
