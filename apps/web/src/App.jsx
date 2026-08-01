import React from 'react';
import StartScreen from './components/StartScreen';
import GameplayScreen from './components/GameplayScreen';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const {
    inputMode,
    topic,
    setTopic,
    isLoading,
    errorMsg,
    errorDetail,
    copied,
    handleCopyError,
    gameData,
    idx,
    isTyping,
    setIsTyping,
    quizMode,
    feedback,
    chapterCount,
    showContinuePrompt,
    isWarpingHome,
    nextGameData,
    isPreloading,
    handleStartAdventure,
    handleContinue,
    handleNext,
    handleAnswer,
    handleFinish
  } = useGameState();

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
