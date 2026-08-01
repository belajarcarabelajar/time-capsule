import React from 'react';
import { ArrowRight, Loader2, Zap } from 'lucide-react';

export default function ContinuePrompt({
  chapterCount,
  errorMsg,
  errorDetail,
  copied,
  handleCopyError,
  nextGameData,
  isPreloading,
  handleContinue,
  handleFinish,
}) {
  return (
    <div className="absolute inset-0 z-[60] bg-stone-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-10 pointer-events-none"></div>

      <div className="relative bg-stone-900 border-2 border-amber-700 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(217,119,6,0.3)]">
        <h2 className="text-3xl font-bold text-amber-500 mb-2 font-serif tracking-widest">Selesai!</h2>
        <p className="text-amber-200/70 mb-4 font-sans">
          Eksplorasi di bagian ini telah tuntas. Mau lanjut eksplorasi ke bagian {chapterCount + 1}?
        </p>

        {errorMsg && (
          <div className="flex flex-col gap-1 w-full mx-auto mb-4 animate-pulse">
            <div className="p-2 bg-red-900/60 border border-red-500 rounded text-red-200 text-xs text-center">
              {errorMsg}
            </div>
            {errorDetail && (
              <button
                type="button"
                onClick={handleCopyError}
                className="text-[10px] text-amber-500/85 hover:text-amber-400 underline transition-colors cursor-pointer self-center"
              >
                {copied ? "Detail Eror Tersalin!" : "Salin Detail Eror"}
              </button>
            )}
          </div>
        )}

        {nextGameData ? (
          <div className="mb-6 text-xs text-emerald-400 flex items-center justify-center gap-2 font-mono bg-emerald-900/30 py-2 rounded border border-emerald-500/30 animate-pulse">
            <Zap className="w-3 h-3" /> DATA BAGIAN {chapterCount + 1} SIAP!
          </div>
        ) : isPreloading ? (
          <div className="mb-6 text-xs text-amber-300 flex items-center justify-center gap-2 font-mono bg-amber-900/30 py-2 rounded border border-amber-500/30">
            <Loader2 className="w-3 h-3 animate-spin" /> SEDANG MENYUSUN DATA...
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <button
            onClick={(e) => { e.stopPropagation(); handleContinue(); }}
            className="w-full py-4 bg-amber-600 hover:bg-amber-500 text-stone-900 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 shadow-lg"
          >
            <ArrowRight className="w-5 h-5" />
            Ya, lanjutkan!
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleFinish(); }}
            className="w-full py-3 bg-transparent border-2 border-stone-600 hover:border-amber-600 hover:text-amber-500 text-stone-400 rounded-xl font-semibold transition-all"
          >
            Pulang ke Masa Depan
          </button>
        </div>
      </div>
    </div>
  );
}
