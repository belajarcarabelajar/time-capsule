import React from 'react';
import {
  LoadingPanel,
  DynamicBackground,
  QuizPopup,
  NarratorBox,
  DialogueBox,
} from '@time-capsule/ui';
import GameplayHeader from "./gameplay/GameplayHeader";
import ContinuePrompt from "./gameplay/ContinuePrompt";
import WarpingOverlay from "./gameplay/WarpingOverlay";

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

        {isWarpingHome && <WarpingOverlay />}

        <GameplayHeader
          gameData={gameData}
          chapterCount={chapterCount}
          handleFinish={handleFinish}
        />

        <DynamicBackground scene={gameData?.scenes?.MAIN} currentMood={displayMood} />

        {showContinuePrompt && !isWarpingHome && !isLoading && (
          <ContinuePrompt
            chapterCount={chapterCount}
            errorMsg={errorMsg}
            errorDetail={errorDetail}
            copied={copied}
            handleCopyError={handleCopyError}
            nextGameData={nextGameData}
            isPreloading={isPreloading}
            handleContinue={handleContinue}
            handleFinish={handleFinish}
          />
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
