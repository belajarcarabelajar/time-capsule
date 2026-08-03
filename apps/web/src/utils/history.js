export const generateHistorySummary = (pastChaptersData) => {
  const result = [];
  for (let index = 0; index < pastChaptersData.length; index++) {
    const data = pastChaptersData[index];
    if (!data) continue;

    result.push(`\n--- RINGKASAN BAGIAN ${index + 1} ---\n`);

    if (data.meta?.location) {
      result.push(`Lokasi: ${data.meta.location}\n`);
    }

    if (data.script && data.script.length > 0) {
      const quizArr = [];
      const dialogueArr = [];

      for (let i = 0; i < data.script.length; i++) {
        const item = data.script[i];
        if (item.type === 'quiz') {
          quizArr.push(`- "${item.text}"`);
        } else if (item.type === 'dialogue' && dialogueArr.length < 3) {
          const speaker = item.speakerId || 'Unknown';
          const text = item.text || '';
          dialogueArr.push(`- ${speaker}: ${text.slice(0, 60)}...`);
        }
      }

      if (quizArr.length > 0) {
        result.push(`Kuis yang sudah ditanyakan:\n${quizArr.join('\n')}\n`);
      }
      if (dialogueArr.length > 0) {
        result.push(`Dialog/Narasi singkat:\n${dialogueArr.join('\n')}\n`);
      }
    }
  }

  return result.join('');
};
