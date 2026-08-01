import React from 'react';

export default function WarpingOverlay() {
  return (
    <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
      <div className="w-32 h-32 bg-indigo-500 rounded-full blur-[100px] animate-pulse"></div>
      <p className="text-white font-mono tracking-widest mt-8 animate-pulse">WARPING TO PRESENT DAY...</p>
    </div>
  );
}
