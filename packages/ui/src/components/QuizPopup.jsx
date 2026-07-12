import React from 'react';
import { ChevronRight } from 'lucide-react';
import { formatText } from '../utils/formatText.js';

const QuizPopup = ({ data, onAnswer, charData }) => {
  // Support both choices and options properties for resilience
  const choices = data?.choices || data?.options || [];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
      <div className="bg-stone-900 border-2 border-amber-600 rounded-2xl w-full max-w-lg p-6 shadow-[0_0_50px_rgba(217,119,6,0.3)] relative overflow-hidden flex flex-col items-center text-center">
        
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent"></div>
        
        <div className="w-20 h-20 rounded-full border-4 border-amber-600 bg-stone-800 flex items-center justify-center shadow-xl -mt-10 mb-4 z-10 relative">
           <span className="text-4xl filter drop-shadow-md">{charData?.icon || "👤"}</span>
           <div className="absolute -bottom-2 bg-amber-700 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-500">
             {charData?.name || "???"}
           </div>
        </div>

        <div className="mb-6 space-y-2">
            <h3 className="text-xs uppercase tracking-wider text-amber-500/80 font-mono">
              Pertanyaan / Kuis
            </h3>
            {data?.text && (
              <p 
                className="text-amber-50 text-base md:text-lg font-serif italic leading-relaxed" 
                dangerouslySetInnerHTML={{ __html: formatText(data.text) }}
              ></p>
            )}
        </div>

        <div className="w-full space-y-3">
          {choices.map((c, i) => (
            <button
              key={i}
              onClick={() => onAnswer(c)}
              className="w-full p-4 bg-stone-800 hover:bg-amber-900/50 border border-stone-600 hover:border-amber-500 rounded-xl font-medium text-amber-50 text-left transition-all group flex items-center gap-3 active:scale-95"
            >
              <span className="bg-stone-700 text-amber-500 group-hover:bg-amber-500 group-hover:text-stone-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors border border-stone-600">
                {String.fromCharCode(65+i)}
              </span>
              <span className="flex-1 text-sm md:text-base" dangerouslySetInnerHTML={{ __html: formatText(c.text || c.option || c.choice || "") }}></span>
              <ChevronRight className="w-5 h-5 text-stone-500 group-hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
          {choices.length === 0 && (
            <div className="text-stone-500 text-xs py-4 font-mono">Tidak ada pilihan respon yang ditemukan.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export { QuizPopup };
