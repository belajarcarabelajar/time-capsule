import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Typewriter } from './Typewriter.jsx';
import { formatText } from '../utils/formatText.js';
import DOMPurify from 'isomorphic-dompurify';

const DialogueBox = ({ text, mood, isPlayer, isTyping, onComplete, charName, charDesc, charIcon }) => {
  const boxStyle = isPlayer
    ? "bg-slate-900/95 border-blue-500 rounded-2xl rounded-tr-none ml-auto mr-0 text-blue-50 font-sans border-2 shadow-[0_0_30px_rgba(59,130,246,0.3)]"
    : "bg-[#2c241b]/95 border-amber-600 rounded-2xl rounded-tl-none mr-auto ml-0 text-amber-50 font-serif border-4 border-double shadow-[0_0_30px_rgba(217,119,6,0.2)]";

  const avatarPos = isPlayer
    ? "-top-14 -right-6 bg-blue-600 border-blue-400"
    : "-top-14 -left-6 bg-amber-700 border-amber-500";

  const safeText = typeof text === 'string' ? text : String(text || '');

  return (
    <div className={`relative w-[90%] md:w-[600px] p-5 md:p-8 mt-10 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 zoom-in-95 ${boxStyle}`}>
      
      <div className={`absolute ${avatarPos} w-28 h-28 rounded-full border-4 flex items-center justify-center shadow-2xl z-50 transform hover:scale-110 transition-transform bg-slate-800`}>
         <span className="text-6xl select-none filter drop-shadow-md">{charIcon}</span>
      </div>

      <div className={`flex items-center justify-between border-b pb-2 mb-3 ${isPlayer ? "border-blue-500/30 flex-row-reverse" : "border-amber-600/30"}`}>
        <div className={`flex flex-col ${isPlayer ? "items-end mr-20" : "items-start ml-20"}`}>
           <div className="flex flex-col">
             <span className={`text-xs font-bold uppercase tracking-widest ${isPlayer ? "text-blue-400" : "text-amber-400"}`}>
               {charName}
             </span>
             {!isPlayer && charDesc && (
               <span className="text-[10px] text-stone-400 italic">
                 ({charDesc})
               </span>
             )}
           </div>
        </div>
        <span className="text-3xl animate-bounce filter drop-shadow-md">{mood}</span>
      </div>

      <div className="text-sm md:text-xl leading-relaxed min-h-[60px] font-medium">
        {isTyping ? <Typewriter text={safeText} onComplete={onComplete} /> : <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formatText(text)) }} />}
      </div>

      {!isTyping && (
        <div className={`absolute bottom-3 ${isPlayer ? "right-4" : "right-4"} animate-pulse`}>
          <ChevronRight className={`w-6 h-6 ${isPlayer ? 'text-blue-400' : 'text-amber-500'}`} />
        </div>
      )}
    </div>
  );
};

export { DialogueBox };
