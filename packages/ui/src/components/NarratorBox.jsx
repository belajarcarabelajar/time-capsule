import React, { useEffect } from 'react';
import { ChevronRight, Lightbulb } from 'lucide-react';
import { SoundEngine } from '@time-capsule/game-engine';
import { Typewriter } from './Typewriter.jsx';
import { formatText } from '../utils/formatText.js';

const NarratorBox = ({ text, onComplete, isTyping }) => {
  useEffect(() => {
    SoundEngine.playNarrator();
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      {/* UPDATE: max-w-2xl diubah menjadi max-w-lg md:max-w-4xl agar lebih lebar di desktop */}
      <div className="bg-stone-900 border-2 border-amber-600 rounded-2xl w-full max-w-lg md:max-w-4xl p-6 md:p-12 text-center shadow-[0_0_60px_rgba(217,119,6,0.3)] relative overflow-hidden flex flex-col items-center">
        
        {/* Header Decoration */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>

        {/* CENTERED ICON - Ukuran disesuaikan sedikit di mobile agar proporsional */}
        <div className="w-16 h-16 md:w-24 md:h-24 rounded-full border-4 border-amber-600 bg-stone-800 flex items-center justify-center shadow-2xl mb-4 md:mb-6 relative z-10">
           <Lightbulb className="w-8 h-8 md:w-12 md:h-12 text-amber-400 animate-pulse filter drop-shadow-md" />
        </div>

        {/* TITLE - Font size mobile diperkecil */}
        <div className="mb-4 md:mb-6 border-b border-amber-600/30 pb-2 md:pb-4 w-full">
          <span className="text-amber-500 font-serif font-bold tracking-widest uppercase text-[10px] md:text-sm">
            INSIGHT SEJARAH
          </span>
        </div>
        
        {/* TEXT CONTENT - Font size mobile 2x lebih kecil (text-xs vs text-2xl) */}
        <div className="text-xs md:text-2xl text-amber-50 font-serif leading-relaxed italic opacity-90">
          {isTyping ? <Typewriter text={formatText(text)} onComplete={onComplete} speed={30} /> : <span dangerouslySetInnerHTML={{ __html: formatText(text) }} />}
        </div>

        {!isTyping && (
          <div className="mt-6 md:mt-8 animate-bounce text-amber-500/50">
            <ChevronRight className="w-6 h-6 md:w-8 md:h-8 mx-auto" />
          </div>
        )}
      </div>
    </div>
  );
};

export { NarratorBox };
