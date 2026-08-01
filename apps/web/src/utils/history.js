export const generateHistorySummary = (pastChaptersData) => {
  let result = '';
  for (let index = 0; index < pastChaptersData.length; index++) {
    const data = pastChaptersData[index];
    if (!data) continue;

    result += `\n--- RINGKASAN BAGIAN ${index + 1} ---\n`;

    if (data.meta?.location) {
      result += `Lokasi: ${data.meta.location}\n`;
    }

    if (data.script && data.script.length > 0) {
      let hasQuiz = false;
      let dialogueCount = 0;
      let quizStr = '';
      let dialogueStr = '';

      for (let i = 0; i < data.script.length; i++) {
        const item = data.script[i];
        if (item.type === 'quiz') {
          if (quizStr !== '') quizStr += '\n';
          quizStr += `- "${item.text}"`;
          hasQuiz = true;
        } else if (item.type === 'dialogue' && dialogueCount < 3) {
          const speaker = item.speakerId || 'Unknown';
          const text = item.text || '';
          if (dialogueStr !== '') dialogueStr += '\n';
          dialogueStr += `- ${speaker}: ${text.slice(0, 60)}...`;
          dialogueCount++;
        }
      }

      if (hasQuiz) {
        result += `Kuis yang sudah ditanyakan:\n${quizStr}\n`;
      }
      if (dialogueCount > 0) {
        result += `Dialog/Narasi singkat:\n${dialogueStr}\n`;
      }
    }
  }

  return result;
};
