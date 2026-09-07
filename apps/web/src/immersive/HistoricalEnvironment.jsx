import React, { useCallback, useEffect, useRef, useState } from 'react';
import { roomManifest } from './rooms.js';
import { resolveRoom } from './resolveRoom.js';
import EnvironmentBoundary from './EnvironmentBoundary.jsx';
import EnvironmentControls from './EnvironmentControls.jsx';
import useAmbientAudio from './useAmbientAudio.js';
import { clampView } from './renderPolicy.js';
import './immersive.css';

const loadCanvas = () => import('./RoomCanvas.jsx');
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const initialMode = () => {
  try {
    const stored = sessionStorage.getItem('history-render-mode');
    if (stored === 'static' || stored === '3d') return stored;
  } catch { /* Storage can be unavailable in private embedded contexts. */ }
  // 3D is the default background. Only data-saver mode starts on the poster.
  // Reduced motion keeps 3D with paused animation; load failures fall back.
  return navigator.connection?.saveData ? 'static' : '3d';
};

export default function HistoricalEnvironment({ topic = '', location = '', environmentKey = '', mood = '',
  blocked = false, startScreen = false, loadRenderer = loadCanvas }) {
  const { roomId } = resolveRoom({
    topic: startScreen ? '' : topic,
    location: startScreen ? '' : location,
    environmentKey: startScreen ? '' : environmentKey,
  });
  const room = roomManifest[roomId] || roomManifest.archive;
  const [mode, setMode] = useState(initialMode);
  const [attempt, setAttempt] = useState(0);
  const [renderer, setRenderer] = useState(null);
  const [status, setStatus] = useState('poster');
  const [exploring, setExploring] = useState(false);
  const [selectedObject, setSelectedObject] = useState(null);
  const [motionEnabled, setMotionEnabled] = useState(() => !reducedMotion());
  const [motionLocked, setMotionLocked] = useState(reducedMotion);
  const [viewOffset, setViewOffset] = useState({ yaw: 0, pitch: 0 });
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const exploreRef = useRef(null);
  const audioFailed = useAmbientAudio(room.audioUrl, audioEnabled, visible && !blocked);

  const leaveExplore = useCallback(() => {
    setExploring(false);
    setSelectedObject(null);
    setViewOffset({ yaw: 0, pitch: 0 });
    exploreRef.current?.focus();
  }, []);

  useEffect(() => {
    setExploring(false);
    setSelectedObject(null);
  }, [room.id, blocked]);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const preference = () => setMotionLocked(Boolean(query?.matches));
    const visibility = () => setVisible(!document.hidden);
    query?.addEventListener?.('change', preference);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      query?.removeEventListener?.('change', preference);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  useEffect(() => {
    let active = true;
    let timeout;
    setRenderer(null);
    setStatus(mode === '3d' ? 'loading' : 'poster');
    const fail = error => {
      if (!active) return;
      if (import.meta.env?.DEV) console.warn('Historical environment fallback:', error?.message || 'Room loading timed out');
      active = false;
      clearTimeout(timeout);
      setRenderer(null);
      setStatus('failed');
    };
    const ready = () => {
      if (!active) return;
      clearTimeout(timeout);
      setStatus('ready');
    };
    if (mode === '3d') {
      timeout = setTimeout(fail, 10000);
      Promise.resolve().then(loadRenderer).then(module => {
        if (active) setRenderer({ Component: module.default, roomId: room.id, ready, fail });
      }).catch(fail);
    }
    return () => { active = false; clearTimeout(timeout); };
  }, [room.id, mode, attempt, loadRenderer]);

  const changeMode = next => {
    setMode(next);
    try { sessionStorage.setItem('history-render-mode', next); } catch { /* Optional preference. */ }
  };
  const Component = renderer?.roomId === room.id ? renderer.Component : null;
  return <div className={`history-environment${exploring && !blocked ? ' is-exploring' : ''}${startScreen ? ' is-start' : ''}`}
    data-room={room.id} data-render-state={status}>
    <div className="history-environment__scene" aria-hidden="true"
      onClick={event => { if (exploring) event.stopPropagation(); }}
      onKeyDown={event => { if (exploring) { event.stopPropagation(); if (event.key === 'Escape') leaveExplore(); } }}>
      <img key={room.id} data-testid="environment-poster" className="history-environment__poster"
        src={room.posterUrl} alt="" onError={event => { event.currentTarget.style.visibility = 'hidden'; }} />
      {mode === '3d' && Component && <EnvironmentBoundary key={`${room.id}-${attempt}`} onError={renderer.fail}>
        <Component room={room} mood={mood} motionEnabled={motionEnabled && !motionLocked && visible}
          exploring={exploring && !blocked} selectedObject={selectedObject}
          viewOffset={viewOffset}
          onReady={renderer.ready} onError={renderer.fail} onExitExplore={leaveExplore} />
      </EnvironmentBoundary>}
      <div className="history-environment__shade" />
    </div>
    {!blocked && <p className="history-scope">{room.scopeLabel}</p>}
    {!blocked && <EnvironmentControls exploring={exploring} onExploreChange={value => value ? setExploring(true) : leaveExplore()}
      motionEnabled={motionEnabled} onMotionChange={setMotionEnabled} audioEnabled={audioEnabled}
      motionLocked={motionLocked} onLook={(yaw, pitch) => setViewOffset(previous => clampView({ yaw: previous.yaw + yaw, pitch: previous.pitch + pitch }, room.camera))}
      onAudioChange={setAudioEnabled} audioAvailable={Boolean(room.audioUrl)} audioFailed={audioFailed}
      objects={room.objects} selectedObject={selectedObject} onInspect={setSelectedObject}
      mode={mode} onModeChange={changeMode} failed={status === 'failed'}
      onRetry={() => { setMode('3d'); setAttempt(value => value + 1); }} exploreRef={exploreRef} />}
  </div>;
}
