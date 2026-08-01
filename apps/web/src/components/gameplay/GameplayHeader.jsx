import React from 'react';
import { MapPin, LogOut } from 'lucide-react';
import UserBar from '../UserBar';

export default function GameplayHeader({ gameData, chapterCount, handleFinish }) {
  return (
    <div className="absolute top-0 left-0 w-full p-4 z-40 flex justify-between items-start pointer-events-none">
      <div className="flex flex-col gap-1 items-start">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
          <MapPin className="w-3 h-3 text-red-500 animate-pulse" />
          <span className="text-[10px] md:text-xs font-bold text-white tracking-wider uppercase">
            {gameData?.meta?.location || "Unknown"}
          </span>
        </div>
        {chapterCount > 1 && (
          <div className="bg-indigo-600/80 px-2 py-0.5 rounded text-[10px] text-white font-bold tracking-widest">
            BAGIAN {chapterCount}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pointer-events-auto">
        <UserBar />
        <button
          onClick={(e) => { e.stopPropagation(); handleFinish(); }}
          className="p-2 bg-black/40 rounded-full text-white/50 hover:bg-red-900/80 hover:text-white transition-colors border border-white/5 cursor-pointer"
          title="Keluar ke Menu Utama"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
