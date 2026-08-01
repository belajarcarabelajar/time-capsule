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
      const quizArr = [];
      const dialogueArr = [];

      for (let i = 0; i < data.script.length; i++) {
        const item = data.script[i];
        if (item.type === 'quiz') {
          quizArr.push(`- "${item.text}"`);
          hasQuiz = true;
        } else if (item.type === 'dialogue' && dialogueCount < 3) {
          const speaker = item.speakerId || 'Unknown';
          const text = item.text || '';
          dialogueArr.push(`- ${speaker}: ${text.slice(0, 60)}...`);
          dialogueCount++;
        }
      }

      if (hasQuiz) {
        currentSummary += `Kuis yang sudah ditanyakan:\n${quizArr.join('\n')}\n`;
      }
      if (dialogueCount > 0) {
        currentSummary += `Dialog/Narasi singkat:\n${dialogueArr.join('\n')}\n`;
      }
    }

    return currentSummary;
  }, "");
};
