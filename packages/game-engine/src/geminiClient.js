import { apiKey, GEMINI_SYSTEM_PROMPT, cfApiToken, cfAccountId } from './systemPrompt.js';

  const fetchScenarioData = async (activeTopic, chapterNum) => {
    let promptText = `TOPIK UTAMA: ${activeTopic}`;
    
    if (chapterNum > 1) {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN ${chapterNum}. \nATURAN KHUSUS: \n1. JANGAN ULANGI scene kedatangan. \n2. LANGSUNG diskusi mendalam/lanjutan topik.`;
    } else {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN 1 (AWAL). \nATURAN KHUSUS: \n1. Mulai cerita dengan adegan Penjelajah Waktu BARU SAJA MENDARAT.`;
    }

    let rawText;
    if (apiKey) {
      // Use Gemini API
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
      rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // Fallback to Cloudflare Workers AI using Meta Llama 3.1 8B Instruct (via Pages Function proxy)
      const response = await fetch(`/api/ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: GEMINI_SYSTEM_PROMPT + '\nIMPORTANT: You must respond ONLY with valid JSON matching the format requested. Do not include any conversational preamble or markdown code block markers.' },
            { role: 'user', content: promptText }
          ]
        })
      });

      const data = await response.json();
      if (!data.success) {
        console.error("Cloudflare Workers AI API error:", data.errors);
        throw new Error("Gagal menghubungi portal Cloudflare AI.");
      }
      
      rawText = data.result?.choices?.[0]?.message?.content || data.result?.response;
    }

    let parsedData;
    if (typeof rawText === 'object') {
      parsedData = rawText;
    } else {
      // IMPROVED JSON PARSING: Extract strictly the JSON part
      const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
         console.error("Invalid response format:", rawText);
         throw new Error("Gagal memproses skenario cerita.");
      }
      parsedData = JSON.parse(jsonMatch[0]);
    }

    return parsedData;
  };

export { fetchScenarioData };

