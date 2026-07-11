import { apiKey, GEMINI_SYSTEM_PROMPT } from './systemPrompt.js';

  const fetchScenarioData = async (activeTopic, chapterNum) => {
    let promptText = `TOPIK UTAMA: ${activeTopic}`;
    
    if (chapterNum > 1) {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN ${chapterNum}. \nATURAN KHUSUS: \n1. JANGAN ULANGI scene kedatangan. \n2. LANGSUNG diskusi mendalam/lanjutan topik.`;
    } else {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN 1 (AWAL). \nATURAN KHUSUS: \n1. Mulai cerita dengan adegan Penjelajah Waktu BARU SAJA MENDARAT.`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    // IMPROVED JSON PARSING: Extract strictly the JSON part
    const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       console.error("Invalid response format:", rawText);
       throw new Error("Gagal mengolah data waktu.");
    }
    return JSON.parse(jsonMatch[0]);
  };

export { fetchScenarioData };
