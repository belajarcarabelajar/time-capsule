import { GEMINI_SYSTEM_PROMPT } from './systemPrompt.js';
import { z } from 'zod';

const zPlayerSchema = z.object({
  id: z.literal("PLAYER"),
  name: z.literal("Penjelajah"),
  icon: z.literal("🧑🏻‍🚀"),
  desc: z.literal("Masa Depan")
});

const zNpc1Schema = z.object({ id: z.literal("NPC_1"), name: z.string(), icon: z.string(), desc: z.string() });
const zNpc2Schema = z.object({ id: z.literal("NPC_2"), name: z.string(), icon: z.string(), desc: z.string() });
const zNpc3Schema = z.object({ id: z.literal("NPC_3"), name: z.string(), icon: z.string(), desc: z.string() });
const zNpc4Schema = z.object({ id: z.literal("NPC_4"), name: z.string(), icon: z.string(), desc: z.string() });

const scenarioZodSchema = z.object({
  meta: z.object({
    location: z.string(),
    themeColor: z.string()
  }),
  characters: z.object({
    PLAYER: zPlayerSchema,
    NPC_1: zNpc1Schema,
    NPC_2: zNpc2Schema,
    NPC_3: zNpc3Schema,
    NPC_4: zNpc4Schema.optional()
  }),
  scenes: z.object({
    MAIN: z.object({
      bg: z.string(),
      elements: z.array(z.string())
    })
  }),
  script: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("dialogue"),
        speakerId: z.enum(["PLAYER", "NPC_1", "NPC_2", "NPC_3", "NPC_4"]),
        mood: z.string(),
        text: z.string()
      }),
      z.object({
        type: z.literal("quiz"),
        speakerId: z.enum(["PLAYER", "NPC_1", "NPC_2", "NPC_3", "NPC_4"]),
        mood: z.string(),
        text: z.string(),
        choices: z.array(
          z.object({
            text: z.string(),
            correct: z.boolean(),
            response: z.string()
          })
        ),
        explanation: z.string().optional()
      }),
      z.object({
        type: z.literal("narrator"),
        text: z.string()
      })
    ])
  )
});

const playerSchema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: ["PLAYER"] },
    name: { type: "STRING", enum: ["Penjelajah"] },
    icon: { type: "STRING", enum: ["🧑🏻‍🚀"] },
    desc: { type: "STRING", enum: ["Masa Depan"] }
  },
  required: ["id", "name", "icon", "desc"]
};

const createNpcSchema = (id) => ({
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: [id] },
    name: { type: "STRING" },
    icon: { type: "STRING" },
    desc: { type: "STRING" }
  },
  required: ["id", "name", "icon", "desc"]
});

const geminiResponseSchema = {
  type: "OBJECT",
  properties: {
    meta: {
      type: "OBJECT",
      properties: {
        location: { type: "STRING" },
        themeColor: { type: "STRING" }
      },
      required: ["location", "themeColor"]
    },
    characters: {
      type: "OBJECT",
      properties: {
        PLAYER: playerSchema,
        NPC_1: createNpcSchema("NPC_1"),
        NPC_2: createNpcSchema("NPC_2"),
        NPC_3: createNpcSchema("NPC_3"),
        NPC_4: createNpcSchema("NPC_4")
      },
      required: ["PLAYER", "NPC_1", "NPC_2", "NPC_3"]
    },
    scenes: {
      type: "OBJECT",
      properties: {
        MAIN: {
          type: "OBJECT",
          properties: {
            bg: { type: "STRING" },
            elements: {
              type: "ARRAY",
              items: { type: "STRING" }
            }
          },
          required: ["bg", "elements"]
        }
      },
      required: ["MAIN"]
    },
    script: {
      type: "ARRAY",
      items: {
        anyOf: [
          {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", enum: ["dialogue"] },
              speakerId: { type: "STRING", enum: ["PLAYER", "NPC_1", "NPC_2", "NPC_3", "NPC_4"] },
              mood: { type: "STRING" },
              text: { type: "STRING" }
            },
            required: ["type", "speakerId", "mood", "text"]
          },
          {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", enum: ["quiz"] },
              speakerId: { type: "STRING", enum: ["PLAYER", "NPC_1", "NPC_2", "NPC_3", "NPC_4"] },
              mood: { type: "STRING" },
              text: { type: "STRING" },
              choices: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    text: { type: "STRING" },
                    correct: { type: "BOOLEAN" },
                    response: { type: "STRING" }
                  },
                  required: ["text", "correct", "response"]
                }
              },
              explanation: { type: "STRING" }
            },
            required: ["type", "speakerId", "mood", "text", "choices"]
          },
          {
            type: "OBJECT",
            properties: {
              type: { type: "STRING", enum: ["narrator"] },
              text: { type: "STRING" }
            },
            required: ["type", "text"]
          }
        ]
      }
    }
  },
  required: ["meta", "characters", "scenes", "script"]
};

const fetchScenarioData = async (activeTopic, chapterNum, historySummary = "") => {
  // 1. Basic type validation
  if (typeof activeTopic !== 'string' || typeof chapterNum !== 'number' || typeof historySummary !== 'string') {
    throw new Error("Invalid input types.");
  }

  // 2. Length validation
  if (activeTopic.length > 200) {
    activeTopic = activeTopic.substring(0, 200);
  }
  if (historySummary.length > 5000) {
    historySummary = historySummary.substring(historySummary.length - 5000);
  }

  // 3. Basic sanitization to prevent gross injection/breaking prompt structure
  const sanitizeText = (text) => {
    return text.replace(/[<>{}[\]]/g, '');
  };

  const cleanTopic = sanitizeText(activeTopic);
  const cleanHistory = sanitizeText(historySummary);

  let promptText = `TOPIK UTAMA: ${cleanTopic}`;
  
  if (chapterNum > 1) {
    promptText += `\n\nKONTEKS: Ini adalah BAGIAN ${chapterNum}.`;
    if (cleanHistory) {
      promptText += `\n\nRIWAYAT CERITA/MATERI SEBELUMNYA (JANGAN ULANGI TOPIK/KUIS INI):\n${cleanHistory}`;
    }
    promptText += `\n\nATURAN KHUSUS: \n1. JANGAN ULANGI scene kedatangan. \n2. LANGSUNG diskusi mendalam/lanjutan topik. \n3. Lanjutkan materi ke sub-topik baru yang lebih mendalam dan berbeda dari bagian sebelumnya. \n4. Buat pertanyaan kuis yang sepenuhnya baru.`;
  } else {
    promptText += `\n\nKONTEKS: Ini adalah BAGIAN 1 (AWAL). \nATURAN KHUSUS: \n1. Mulai cerita dengan adegan Penjelajah Waktu BARU SAJA MENDARAT.`;
  }

  let rawText;

  // Attempt to use Gemini API via proxy first
  const geminiResponse = await fetch(`/api/gemini`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: geminiResponseSchema
      }
    })
  });

  if (geminiResponse.ok) {
    const data = await geminiResponse.json();
    rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  } else {
    console.warn("Gemini API proxy failed or is not configured. Falling back to Cloudflare Workers AI...", await geminiResponse.text().catch(() => ''));
    // Fallback to Cloudflare Workers AI using Meta Llama 3.1 8B Instruct (via Pages Function proxy)
    const aiResponse = await fetch(`/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: GEMINI_SYSTEM_PROMPT + '\nIMPORTANT: You must respond ONLY with valid JSON matching the format requested. Do not include any conversational preamble or markdown code block markers.' },
          { role: 'user', content: promptText }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!aiResponse.ok) {
      throw new Error("Gagal menghubungi portal Cloudflare AI.");
    }
    
    const data = await aiResponse.json();
    if (data.success === false) {
      throw new Error("Gagal menghubungi portal Cloudflare AI.");
    }
    
    rawText = data.result?.choices?.[0]?.message?.content || data.result?.response;
  }

  let parsedData;
  if (typeof rawText === 'object') {
    parsedData = rawText;
  } else {
    // Extract strictly the JSON part
    const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
       console.error("Invalid response format:", rawText);
       throw new Error("Gagal memproses skenario cerita.");
    }
    
    const jsonString = jsonMatch[0];
    try {
      parsedData = JSON.parse(jsonString);
    } catch (err) {
      console.warn("Standard JSON parse failed, attempting sanitization...", err);
      try {
        // Layer 1: Flatten multiline string values by escaping literal newlines, tabs, and carriage returns inside quotes
        const escapes = { '\n': '\\n', '\r': '\\r', '\t': '\\t' };
        let cleaned = jsonString.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"/g, (match, p1) => {
          if (!/[\n\r\t]/.test(p1)) return match;
          return '"' + p1.replace(/[\n\r\t]/g, m => escapes[m]) + '"';
        });

        // Layer 2: Escape unescaped double quotes within string values on a line-by-line basis
        const sanitizedString = cleaned.replace(/^(\s*"[a-zA-Z0-9_]+"\s*:\s*")(.*)("\s*,?\s*)$/gm, (match, prefix, middle, suffix) => {
          const fixedMiddle = middle.replace(/(?<!\\)"/g, '\\"');
          return prefix + fixedMiddle + suffix;
        });
        parsedData = JSON.parse(sanitizedString);
      } catch (sanitizeErr) {
        console.error("JSON parsing and sanitization failed:", sanitizeErr);
        throw new Error("Gagal memproses skenario cerita.");
      }
    }
  }

  // Validate using Zod instead of relying solely on loose parsing
  try {
    parsedData = scenarioZodSchema.parse(parsedData);
  } catch (err) {
    console.error("Data validation failed:", err);
    throw new Error("Gagal memproses skenario cerita.");
  }

  return parsedData;
};

export { fetchScenarioData, scenarioZodSchema };
