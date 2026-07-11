import React from 'react';

const DynamicBackground = ({ scene, currentMood }) => {
  const getMoodGradient = (mood) => {
    const m = mood || '';
    if (m.match(/😠|😡|💢|⚔️/)) return 'from-red-900 via-orange-900 to-black'; 
    if (m.match(/😱|😲|😨|⚡/)) return 'from-amber-900 via-orange-950 to-black animate-pulse'; 
    if (m.match(/😢|😭|🌧️/)) return 'from-slate-800 via-stone-900 to-black'; 
    if (m.match(/😂|😄|👋/)) return 'from-sky-700 via-emerald-800 to-black'; 
    if (m.match(/🤔|🧐/)) return 'from-stone-800 via-amber-950 to-black'; 
    return null; 
  };

  const activeGradient = getMoodGradient(currentMood) || (scene?.bg || 'from-stone-900 to-black');
  
  const getMoodParticles = (mood) => {
    const m = mood || '';
    if (m.match(/⚔️|🛡️/)) return '⚔️';
    if (m.match(/😠|😡|🔥/)) return '🔥';
    if (m.match(/✨|👋|😄/)) return '✨';
    if (m.match(/🌧️|😢/)) return '💧';
    if (m.match(/👑|🤴/)) return '🪙';
    return null; 
  };
  
  const particleIcon = getMoodParticles(currentMood) || '⚪';

  return (
    <div className={`absolute inset-0 transition-colors duration-1000 bg-gradient-to-b ${activeGradient} overflow-hidden`}>
      {/* UPDATE: 
          1. Opacity dinaikkan dari 20 ke 50 agar lebih jelas.
          2. mix-blend-overlay dihapus agar warna emoji asli terlihat.
          3. Posisi top diatur ke range 5% - 40% agar selalu di atas (tidak tertutup dialog).
      */}
      {scene?.elements?.map((el, i) => (
        <div key={`el-${i}`} className="absolute text-8xl md:text-[12rem] transition-all duration-1000 select-none pointer-events-none opacity-50 animate-float-slow" style={{
          left: i % 2 === 0 ? `${Math.random() * 30}%` : 'auto',
          right: i % 2 !== 0 ? `${Math.random() * 30}%` : 'auto',
          top: `${5 + (Math.random() * 35)}%`, 
          animationDelay: `${i * 2}s`
        }}>
          {typeof el === 'string' ? el : '🏛️'}
        </div>
      ))}
      {[...Array(12)].map((_, i) => (
        <div key={`mood-p-${i}`} className="absolute text-2xl md:text-4xl opacity-30 animate-rise" style={{
           left: `${Math.random() * 100}%`,
           bottom: '-50px',
           animationDuration: `${3 + Math.random() * 5}s`,
           animationDelay: `${Math.random() * 2}s`
        }}>
          {particleIcon}
        </div>
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 pointer-events-none"></div>
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none"></div>
    </div>
  );
};

export { DynamicBackground };
