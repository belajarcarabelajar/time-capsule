import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Search, Loader2, MapPin, LogOut, ArrowRight, Hourglass, AlertTriangle } from 'lucide-react';
import {
  Typewriter,
  LoadingPanel,
  DynamicBackground,
  QuizPopup,
  NarratorBox,
  DialogueBox,
} from '@time-capsule/ui';
import { SoundEngine, fetchScenarioData, GEMINI_SYSTEM_PROMPT } from '@time-capsule/game-engine';

export default function App() {
  const [inputMode, setInputMode] = useState(true);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null); // New state for errors
  const [errorDetail, setErrorDetail] = useState(null); // Detailed logs for user copying
  const [copied, setCopied] = useState(false);

  const handleCopyError = () => {
    if (!errorDetail) return;
    const logText = `=== TIME CAPSULE ERROR LOG ===
Time: ${errorDetail.time}
Topic: ${errorDetail.topic}
Chapter: ${errorDetail.chapter}
Error Message: ${errorDetail.message}
Stack Trace:
${errorDetail.stack || "N/A"}
=============================`;
    navigator.clipboard.writeText(logText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  const [historyList, setHistoryList] = useState([]); // List of gameData for previous chapters

  const generateHistorySummary = (pastChaptersData) => {
    let summary = "";
    pastChaptersData.forEach((data, index) => {
      if (!data) return;
      summary += `\n--- RINGKASAN BAGIAN ${index + 1} ---\n`;
      if (data.meta?.location) {
        summary += `Lokasi: ${data.meta.location}\n`;
      }
      const quizzes = [];
      const dialogues = [];

      if (data.script) {
        for (let i = 0; i < data.script.length; i++) {
          const item = data.script[i];
          if (item.type === 'quiz') {
            quizzes.push(item.text);
          } else if (item.type === 'dialogue' && dialogues.length < 3) {
            dialogues.push(`${item.speakerId}: ${item.text.slice(0, 60)}...`);
          }
        }
      }

      if (quizzes.length > 0) {
        summary += `Kuis yang sudah ditanyakan:\n`;
        for (let i = 0; i < quizzes.length; i++) {
          summary += `- "${quizzes[i]}"\n`;
        }
      }

      if (dialogues.length > 0) {
        summary += `Dialog/Narasi singkat:\n`;
        for (let i = 0; i < dialogues.length; i++) {
          summary += `- ${dialogues[i]}\n`;
        }
      }
    });
    return summary;
  };

  const [gameData, setGameData] = useState(null);
  const [idx, setIdx] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const [quizMode, setQuizMode] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [chapterCount, setChapterCount] = useState(1);
  const [showContinuePrompt, setShowContinuePrompt] = useState(false);
  const [isWarpingHome, setIsWarpingHome] = useState(false);

  const [nextGameData, setNextGameData] = useState(null);
  const [isPreloading, setIsPreloading] = useState(false);

  const currentScript = gameData?.script?.[idx];
  const activeCharId = currentScript?.speakerId;
  const isPlayerTurn = activeCharId === 'PLAYER';
  const isNarrator = currentScript?.type === 'narrator';
  const isQuiz = currentScript?.type === 'quiz';

  const handleStartAdventure = async (e) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    SoundEngine.init();
    SoundEngine.playWarp();
    setErrorMsg(null);
    setHistoryList([]); // Reset history

    try {
      const data = await fetchScenarioData(topic, 1, "");
      setGameData(data);
      setChapterCount(1);
      
      setInputMode(false);
      setShowContinuePrompt(false); 
      setIdx(0);
      setIsTyping(true);
      setFeedback(null);
      setQuizMode(false);
      
      // Clear old preloaded data to avoid stale content
      setNextGameData(null); 
      preloadNextChapter(topic, 2, [data]);

    } catch (err) {
      console.error(err);
      setErrorMsg("Gagal membuka portal. Coba lagi.");
      setErrorDetail({
        message: err.message,
        stack: err.stack,
        time: new Date().toISOString(),
        topic: topic,
        chapter: 1
      });
    } finally {
      setIsLoading(false);
    }
  };

  const preloadNextChapter = async (activeTopic, nextChapterNum, currentHistory = []) => {
    if (isPreloading) return;
    setIsPreloading(true);
    try {
      const historySummary = generateHistorySummary(currentHistory);
      const data = await fetchScenarioData(activeTopic, nextChapterNum, historySummary);
      setNextGameData(data);
    } catch (e) {
      console.error("[SMART PRELOAD] Gagal:", e);
    } finally {
      setIsPreloading(false);
    }
  };

  const handleContinue = async () => {
    const nextChapterNum = chapterCount + 1;
    setErrorMsg(null);

    const updatedHistory = [...historyList, gameData];
    setHistoryList(updatedHistory);

    if (nextGameData) {
      setGameData(nextGameData);
      setNextGameData(null);
      setChapterCount(nextChapterNum);
      
      setShowContinuePrompt(false);
      setIdx(0);
      setIsTyping(true);
      setFeedback(null);
      setQuizMode(false);

      preloadNextChapter(topic, nextChapterNum + 1, [...updatedHistory, nextGameData]);
    } else {
      setIsLoading(true);
      try {
        const historySummary = generateHistorySummary(updatedHistory);
        const data = await fetchScenarioData(topic, nextChapterNum, historySummary);
        setGameData(data);
        setChapterCount(nextChapterNum);
        
        setShowContinuePrompt(false);
        setIdx(0);
        setIsTyping(true);
        setFeedback(null);
        setQuizMode(false);

        preloadNextChapter(topic, nextChapterNum + 1, [...updatedHistory, data]);
      } catch (err) {
        console.error(err);
        setErrorMsg("Koneksi terputus. Mohon coba lagi.");
        setErrorDetail({
          message: err.message,
          stack: err.stack,
          time: new Date().toISOString(),
          topic: topic,
          chapter: nextChapterNum
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNext = useCallback(() => {
    if (isLoading || inputMode || showContinuePrompt) return;
    if (isTyping) { setIsTyping(false); return; }

    SoundEngine.playClick();

    if (idx >= (gameData?.script?.length || 0) - 1 && !quizMode && !feedback) {
      setShowContinuePrompt(true);
      return;
    }

    if (feedback) {
      setFeedback(null);
      setIdx(prev => prev + 1);
      setIsTyping(true);
      return;
    }

    // Jika skrip saat ini adalah kuis, aktifkan mode kuis (popup akan muncul)
    if (currentScript?.type === 'quiz' && !quizMode) {
      setQuizMode(true);
      return;
    }

    if (!quizMode) {
      setIdx(prev => prev + 1);
      setIsTyping(true);
    } 
  }, [isLoading, inputMode, isTyping, feedback, currentScript, quizMode, idx, gameData, showContinuePrompt]);

  const handleAnswer = (choice) => {
    setQuizMode(false);
    choice.correct ? SoundEngine.playCorrect() : SoundEngine.playWrong();
    
    // Feedback akan ditangani oleh render DialogueBox di bawah.
    // speakerId akan tetap mengacu pada currentScript.speakerId (NPC),
    // sehingga box yang muncul adalah box NPC.
    setFeedback({
      text: choice.response || (choice.correct ? "Tepat sekali!" : "Kurang tepat."),
      mood: choice.correct ? '🎉' : '🤔',
      correct: choice.correct
    });
    setIsTyping(true);
  };

  const handleFinish = () => {
    setIsWarpingHome(true);
    setShowContinuePrompt(false);
    SoundEngine.playWarp();
    setTimeout(() => {
       setIsWarpingHome(false);
       setInputMode(true);
       setTopic('');
       setChapterCount(1);
       setNextGameData(null);
       setErrorMsg(null);
       setHistoryList([]); // Reset history on exit
    }, 2500);
  };

  // --- KEYBOARD SHORTCUT LISTENER (NEW) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Pastikan hanya mendeteksi Enter saat tidak dalam mode input awal
      if (e.key === 'Enter' && !inputMode) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, inputMode]);

  const speakingCharData = gameData?.characters[activeCharId];
  const speakerName = speakingCharData?.name || activeCharId || "System";
  const speakerDesc = speakingCharData?.desc || ""; 
  const speakerIcon = speakingCharData?.icon || (isPlayerTurn ? "🧑‍🚀" : "👤");
  const displayMood = feedback ? feedback.mood : currentScript?.mood;
  const displayText = feedback ? feedback.text : currentScript?.text;
  
  const finalSpeakerName = speakerName;
  const finalSpeakerIcon = speakerIcon;
  const finalSpeakerDesc = speakerDesc;

  // --- RENDER INPUT ---
  if (inputMode) {
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

  // --- RENDER GAMEPLAY ---
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
              {/* Tambahan tekstur agar senada dengan homepage */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')] opacity-10 pointer-events-none"></div>

              <div className="relative bg-stone-900 border-2 border-amber-700 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(217,119,6,0.3)]">
                  {/* UPDATE: Judul dan pesan diubah sesuai request */}
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
                  
                  {/* VISUAL INDIKATOR BACKGROUND GEN */}
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
        {/* PERBAIKAN: Hapus "!quizMode" agar dialog tetap muncul di belakang popup saat kuis berlangsung */}
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
