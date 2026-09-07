import React from 'react';

export default function EnvironmentControls({ exploring, onExploreChange, motionEnabled,
  onMotionChange, audioEnabled, onAudioChange, audioAvailable, audioFailed, objects,
  onInspect, selectedObject, mode, onModeChange, failed, onRetry, exploreRef, motionLocked, onLook }) {
  return <div className="history-controls" onClick={event => event.stopPropagation()}
    onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') onExploreChange(false); }}>
    <div className="history-controls__bar">
      <button ref={exploreRef} type="button" aria-expanded={exploring}
        aria-label={exploring ? 'Kembali belajar' : 'Jelajahi ruang'}
        onClick={() => onExploreChange(!exploring)}><span aria-hidden="true" className="history-controls__icon">{exploring ? '📖' : '🧭'}</span><span className="history-controls__label">{exploring ? 'Kembali belajar' : 'Jelajahi ruang'}</span></button>
      <button type="button" aria-label={mode === '3d' ? 'Gunakan gambar' : 'Aktifkan 3D'}
        onClick={() => onModeChange(mode === '3d' ? 'static' : '3d')}>
        <span aria-hidden="true" className="history-controls__icon">{mode === '3d' ? '🖼️' : '✨'}</span><span className="history-controls__label">{mode === '3d' ? 'Gunakan gambar' : 'Aktifkan 3D'}</span></button>
      {failed && <button type="button" onClick={onRetry}>Coba 3D lagi</button>}
    </div>
    {exploring && <div className="history-inspection">
      <p className="history-inspection__hint">{mode === '3d' ? 'Geser untuk melihat sekeliling. Pilih benda untuk melihat lebih dekat.' : 'Pilih benda untuk menelusuri ceritanya.'}</p>
      {mode === '3d' && <div className="history-objects" role="group" aria-label="Arah pandangan">
        <button type="button" aria-label="Lihat ke kiri" onClick={() => onLook(-0.12, 0)}>←</button>
        <button type="button" aria-label="Lihat ke kanan" onClick={() => onLook(0.12, 0)}>→</button>
        <button type="button" aria-label="Lihat ke atas" onClick={() => onLook(0, -0.08)}>↑</button>
        <button type="button" aria-label="Lihat ke bawah" onClick={() => onLook(0, 0.08)}>↓</button>
      </div>}
      <div className="history-objects" role="group" aria-label="Benda dalam ruang">
        {objects.map(object => <button type="button" key={object.id}
          aria-pressed={selectedObject?.id === object.id} onClick={() => onInspect(object)}>{object.label}</button>)}
      </div>
      {selectedObject && <div className="history-object-detail" role="status">
        <strong>{selectedObject.label}</strong><p>{selectedObject.description}</p>
      </div>}
      <div className="history-controls__preferences">
        {mode === '3d' && !motionLocked && <button type="button" aria-pressed={motionEnabled}
          onClick={() => onMotionChange(!motionEnabled)}>{motionEnabled ? 'Jeda gerakan' : 'Aktifkan gerakan'}</button>}
        {audioAvailable && <button type="button" aria-pressed={audioEnabled}
          onClick={() => onAudioChange(!audioEnabled)}>{audioEnabled ? 'Matikan suasana suara' : 'Aktifkan suasana suara'}</button>}
      </div>
      {audioFailed && <p role="status">Suara belum tersedia. Kamu tetap bisa menjelajah.</p>}
      <span className="history-inspection__hint">Esc untuk kembali belajar</span>
    </div>}
  </div>;
}
