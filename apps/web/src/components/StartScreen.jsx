import React from 'react';
import { Zap, Search, Loader2, Hourglass, AlertTriangle } from 'lucide-react';
import { LoadingPanel } from '@time-capsule/ui';

export default function StartScreen({
  isLoading,
  errorMsg,
  errorDetail,
  handleCopyError,
  copied,
  topic,
  setTopic,
  handleStartAdventure
}) {
  return (
    <div className="min-h-screen bg-black text-amber-50 font-serif flex items-center justify-center p-6 relative overflow-hidden">
      {isLoading && <LoadingPanel text="MEMBUKA PORTAL SEJARAH..." />}

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-amber-900/40 via-stone-950 to-black animate-pulse"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-20"></div>

      <div className="w-full max-w-md relative z-10 text-center space-y-8">
        <div className="flex justify-center mb-4">
           <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600 to-orange-700 flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-float-slow border-4 border-amber-800">
              <Hourglass className="w-12 h-12 text-amber-100" />
           </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-5xl font-black tracking-tighter text-amber-500 drop-shadow-md font-serif">
            TIME CAPSULE
          </h1>
          <p className="text-amber-200/60 text-sm px-8 italic font-sans">
            "Menyelami masa lalu, memahami masa depan."
          </p>
        </div>

        {errorMsg && (
          <div className="flex flex-col gap-1 w-full max-w-xs mx-auto animate-shake">
            <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-xs flex items-center gap-2 justify-center">
               <AlertTriangle className="w-4 h-4" /> {errorMsg}
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

        <form onSubmit={handleStartAdventure} className="relative group px-4">
          <div className="absolute inset-x-4 inset-y-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-xl blur opacity-25 group-hover:opacity-75 transition duration-1000"></div>
          <div className="relative">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ketik Peristiwa Sejarah..."
              className="w-full bg-stone-900 text-amber-50 p-4 pr-12 rounded-xl border-2 border-amber-900 focus:border-amber-500 outline-none text-center font-bold placeholder-amber-700 transition-colors font-sans"
              disabled={isLoading}
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-amber-700 w-5 h-5" />
          </div>

          <button
            type="submit"
            disabled={isLoading || !topic}
            className={`mt-4 w-full py-4 rounded-xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 font-sans relative z-20
              ${isLoading ? 'bg-stone-800 text-stone-500 cursor-not-allowed' : 'bg-amber-600 text-stone-900 hover:bg-amber-500 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] cursor-pointer'}
            `}
          >
            {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Zap className="w-4 h-4 fill-stone-900" />}
            {isLoading ? 'Membuka Portal...' : 'Mulai Petualangan'}
          </button>
        </form>
      </div>
    </div>
  );
}
