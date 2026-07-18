import React, { useState, useEffect, useCallback } from 'react';
import { SoundEngine, fetchScenarioData } from '@time-capsule/game-engine';
import StartScreen from './components/StartScreen';
import GameplayScreen from './components/GameplayScreen';

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
      summary += "\n--- RINGKASAN BAGIAN " + (index + 1) + " ---\n";
      if (data.meta?.location) {
        summary += "Lokasi: " + data.meta.location + "\n";
      }

      const script = data.script;
      if (script && script.length > 0) {
        let hasQuiz = false;
        let dialogueCount = 0;
        let quizStr = "";
        let dialogueStr = "";

        for (let i = 0; i < script.length; i++) {
          const item = script[i];
          if (item.type === 'quiz') {
            quizStr += '- "' + item.text + '"\n';
            hasQuiz = true;
          } else if (item.type === 'dialogue' && dialogueCount < 3) {
            dialogueStr += '- ' + item.speakerId + ': ' + item.text.slice(0, 60) + '...\n';
            dialogueCount++;
          }
        }

        if (hasQuiz) {
          summary += "Kuis yang sudah ditanyakan:\n" + quizStr;
        }
        if (dialogueCount > 0) {
          summary += "Dialog/Narasi singkat:\n" + dialogueStr;
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

  const currentScript = gameData?.script?.[idx];

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

  // --- RENDER INPUT ---
  if (inputMode) {
    return (
      <StartScreen
        isLoading={isLoading}
        errorMsg={errorMsg}
        errorDetail={errorDetail}
        handleCopyError={handleCopyError}
        copied={copied}
        topic={topic}
        setTopic={setTopic}
        handleStartAdventure={handleStartAdventure}
      />
    );
  }

  // --- RENDER GAMEPLAY ---
  return (
    <GameplayScreen
      gameData={gameData}
      idx={idx}
      isLoading={isLoading}
      isWarpingHome={isWarpingHome}
      chapterCount={chapterCount}
      showContinuePrompt={showContinuePrompt}
      errorMsg={errorMsg}
      errorDetail={errorDetail}
      copied={copied}
      handleCopyError={handleCopyError}
      nextGameData={nextGameData}
      isPreloading={isPreloading}
      quizMode={quizMode}
      feedback={feedback}
      isTyping={isTyping}
      setIsTyping={setIsTyping}
      handleNext={handleNext}
      handleFinish={handleFinish}
      handleContinue={handleContinue}
      handleAnswer={handleAnswer}
    />
  );
}
