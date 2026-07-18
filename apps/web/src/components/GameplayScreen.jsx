import React from 'react';
import { MapPin, LogOut, ArrowRight, Loader2, Zap } from 'lucide-react';
import {
  LoadingPanel,
  DynamicBackground,
  QuizPopup,
  NarratorBox,
  DialogueBox,
} from '@time-capsule/ui';

export default function GameplayScreen({
  gameData,
  idx,
  isLoading,
  isWarpingHome,
  chapterCount,
  showContinuePrompt,
  errorMsg,
  errorDetail,
  copied,
  handleCopyError,
  nextGameData,
  isPreloading,
  quizMode,
  feedback,
  isTyping,
  setIsTyping,
  handleNext,
  handleFinish,
  handleContinue,
  handleAnswer,
}) {
  const currentScript = gameData?.script?.[idx];
  const activeCharId = currentScript?.speakerId;
  const isPlayerTurn = activeCharId === 'PLAYER';
  const isNarrator = currentScript?.type === 'narrator';

  const speakingCharData = gameData?.characters[activeCharId];
  const speakerName = speakingCharData?.name || activeCharId || "System";
  const speakerDesc = speakingCharData?.desc || "";
  const speakerIcon = speakingCharData?.icon || (isPlayerTurn ? "🧑‍🚀" : "👤");

  const displayMood = feedback ? feedback.mood : currentScript?.mood;
  const displayText = feedback ? feedback.text : currentScript?.text;

  const finalSpeakerName = speakerName;
  const finalSpeakerIcon = speakerIcon;
  const finalSpeakerDesc = speakerDesc;

  return (
    <div className="fixed inset-0 overflow-hidden bg-black font-sans flex items-center justify-center select-none" onClick={handleNext}>
      <div className="relative w-full h-full md:max-w-6xl md:h-[95vh] md:rounded-2xl overflow-hidden shadow-2xl bg-black border border-white/10">

        {isLoading && <LoadingPanel text="MENYIAPKAN BABAK BERIKUTNYA..." />}

        {isWarpingHome && (
          <div className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
             <div className="w-32 h-32 bg-indigo-500 rounded-full blur-[100px] animate-pulse"></div>
             <p className="text-white font-mono tracking-widest mt-8 animate-pulse">WARPING TO PRESENT DAY...</p>
          </div>
        )}

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

          <button
            onClick={(e) => { e.stopPropagation(); handleFinish(); }}
            className="pointer-events-auto p-2 bg-black/40 rounded-full text-white/50 hover:bg-red-900/80 hover:text-white transition-colors border border-white/5"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <DynamicBackground scene={gameData?.scenes?.MAIN} currentMood={displayMood} />

        {showContinuePrompt && !isWarpingHome && !isLoading && (
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
        )}

        {/* --- MAIN CONTENT LAYERS --- */}

        {/* 1. QUIZ LAYER (FULL SCREEN CENTER) */}
        {quizMode && !feedback && !showContinuePrompt && !isLoading && (
          <QuizPopup
            data={currentScript}
            onAnswer={handleAnswer}
            charData={speakingCharData}
          />
        )}

        {/* 2. NARRATOR LAYER (FULL SCREEN CENTER) */}
        {isNarrator && !showContinuePrompt && !isLoading && (
          <NarratorBox
            text={displayText}
            isTyping={isTyping}
            onComplete={() => setIsTyping(false)}
          />
        )}

        {/* 3. DIALOGUE LAYER (BOTTOM) */}
        {!isNarrator && !showContinuePrompt && !isLoading && (
          <div className="absolute bottom-0 left-0 w-full z-30 p-4 pb-24 md:px-10 md:pb-24 flex flex-col justify-end min-h-[50%] bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none">
              <div className={`w-full flex ${isPlayerTurn ? 'justify-end' : 'justify-start'} pointer-events-auto`}>
                 <DialogueBox
                   key={activeCharId + idx}
                   text={displayText}
                   mood={displayMood}
                   isPlayer={isPlayerTurn}
                   isTyping={isTyping}
                   onComplete={() => setIsTyping(false)}
                   charName={finalSpeakerName}
                   charDesc={finalSpeakerDesc}
                   charIcon={finalSpeakerIcon}
                 />
              </div>
          </div>
        )}

      </div>
    </div>
  );
}
