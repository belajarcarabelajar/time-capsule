import React, { useCallback, useEffect, useRef, useState } from 'react';
import { roomManifest } from './rooms.js';
import { resolveRoom } from './resolveRoom.js';
import EnvironmentBoundary from './EnvironmentBoundary.jsx';
import EnvironmentControls from './EnvironmentControls.jsx';
import useAmbientAudio from './useAmbientAudio.js';
import { clampView } from './renderPolicy.js';
import { resolveVisit } from './visualVisits.js';
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
  blocked = false, startScreen = false, chapterCount = 1, storyStep = 0, loadRenderer = loadCanvas }) {
  const { roomId } = resolveRoom({
    topic: startScreen ? '' : topic,
    location: startScreen ? '' : location,
    environmentKey: startScreen ? '' : environmentKey,
  });
  const room = roomManifest[roomId] || roomManifest.archive;
  const visit = resolveVisit(room.id, startScreen ? 1 : chapterCount);
  const visitKey = `${topic}:${chapterCount}:${visit.id}`;
  const [finishedVisit, setFinishedVisit] = useState(null);
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
  const allowMotion = motionEnabled && !motionLocked && visible && !blocked;
  const finishArrival = useCallback(() => setFinishedVisit(visitKey), [visitKey]);
  const arriving = !startScreen && status === 'ready' && mode === '3d' && allowMotion && !exploring && finishedVisit !== visitKey;
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
    setViewOffset({ yaw: 0, pitch: 0 });
  }, [visitKey, blocked]);
  const prevArriving = useRef(false);
  useEffect(() => {
    // Persistent motion-off states consume the arrival: no replay when motion
    // returns. Transient states (blocked/loading/quiz/narrator, hidden tab)
    // only defer it; cancelling happens only if the arrival actually started.
    if (!motionEnabled || motionLocked || mode !== '3d') finishArrival();
  }, [motionEnabled, motionLocked, mode, finishArrival]);
  useEffect(() => {
    if (arriving) prevArriving.current = true;
    else if (prevArriving.current && (blocked || exploring)) {
      prevArriving.current = false;
      finishArrival();
    }
  }, [arriving, blocked, exploring, finishArrival]);
  useEffect(() => {
    if (storyStep > 0) finishArrival();
  }, [storyStep, finishArrival]);
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
    data-room={room.id} data-visit={visit.id} data-journey={arriving ? 'arrival' : 'reading'} data-render-state={status}>
    <div className="history-environment__scene" aria-hidden="true"
      onClick={event => { if (exploring) event.stopPropagation(); }}
      onKeyDown={event => { if (exploring) { event.stopPropagation(); if (event.key === 'Escape') leaveExplore(); } }}>
      <img key={visit.id} data-testid="environment-poster" className="history-environment__poster"
        src={visit.posterUrl} alt="" onError={event => {
          if (event.currentTarget.getAttribute('src') !== room.posterUrl) event.currentTarget.src = room.posterUrl;
          else event.currentTarget.style.visibility = 'hidden';
        }} />
      {mode === '3d' && Component && <EnvironmentBoundary key={`${room.id}-${attempt}`} onError={renderer.fail}>
        <Component room={room} visit={visit} arriving={arriving} onArrivalComplete={finishArrival}
          mood={mood} motionEnabled={allowMotion}
          exploring={exploring && !blocked} selectedObject={selectedObject}
          viewOffset={viewOffset}
          onReady={renderer.ready} onError={renderer.fail} onExitExplore={leaveExplore} />
      </EnvironmentBoundary>}
      <div className="history-environment__shade" />
    </div>
    {arriving && <div className="history-arrival history-controls" onClick={event => event.stopPropagation()}
      onKeyDown={event => event.stopPropagation()}>
      <button type="button" onClick={() => { finishArrival(); exploreRef.current?.focus(); }}>Lewati perjalanan</button>
    </div>}
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
