export const generateHistorySummary = (pastChaptersData) => {
  return pastChaptersData.reduce((summary, data, index) => {
    if (!data) return summary;

    let currentSummary = summary + `\n--- RINGKASAN BAGIAN ${index + 1} ---\n`;

    if (data.meta?.location) {
      currentSummary += `Lokasi: ${data.meta.location}\n`;
    }

    if (data.script && data.script.length > 0) {
      let hasQuiz = false;
      let dialogueCount = 0;
      let quizStr = "";
      let dialogueStr = "";

      for (let i = 0; i < data.script.length; i++) {
        const item = data.script[i];
        if (item.type === 'quiz') {
          quizStr += `- "${item.text}"\n`;
          hasQuiz = true;
        } else if (item.type === 'dialogue' && dialogueCount < 3) {
          dialogueStr += `- ${item.speakerId}: ${item.text.slice(0, 60)}...\n`;
          dialogueCount++;
        }
      }

      if (hasQuiz) {
        currentSummary += `Kuis yang sudah ditanyakan:\n${quizStr}`;
      }
      if (dialogueCount > 0) {
        currentSummary += `Dialog/Narasi singkat:\n${dialogueStr}`;
      }
    }

    return currentSummary;
  }, "");
};
