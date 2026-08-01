import React from 'react';
import StartScreen from './components/StartScreen';
import GameplayScreen from './components/GameplayScreen';
import AuthModal from './components/AuthModal';
import { useGameState } from './hooks/useGameState';

export default function App() {
  const {
    inputMode,
    topic,
    setTopic,
    isLoading,
    showAuthModal,
    setShowAuthModal,
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

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      {inputMode ? (
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
      ) : (
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
      )}
    </>
  );
}
