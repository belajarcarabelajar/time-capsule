import { apiKey, GEMINI_SYSTEM_PROMPT, cfApiToken, cfAccountId } from './systemPrompt.js';
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

const npc1Schema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: ["NPC_1"] },
    name: { type: "STRING" },
    icon: { type: "STRING" },
    desc: { type: "STRING" }
  },
  required: ["id", "name", "icon", "desc"]
};

const npc2Schema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: ["NPC_2"] },
    name: { type: "STRING" },
    icon: { type: "STRING" },
    desc: { type: "STRING" }
  },
  required: ["id", "name", "icon", "desc"]
};

const npc3Schema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: ["NPC_3"] },
    name: { type: "STRING" },
    icon: { type: "STRING" },
    desc: { type: "STRING" }
  },
  required: ["id", "name", "icon", "desc"]
};

const npc4Schema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING", enum: ["NPC_4"] },
    name: { type: "STRING" },
    icon: { type: "STRING" },
    desc: { type: "STRING" }
  },
  required: ["id", "name", "icon", "desc"]
};

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
        NPC_1: npc1Schema,
        NPC_2: npc2Schema,
        NPC_3: npc3Schema,
        NPC_4: npc4Schema
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
    let promptText = `TOPIK UTAMA: ${activeTopic}`;
    
    if (chapterNum > 1) {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN ${chapterNum}.`;
      if (historySummary) {
        promptText += `\n\nRIWAYAT CERITA/MATERI SEBELUMNYA (JANGAN ULANGI TOPIK/KUIS INI):\n${historySummary}`;
      }
      promptText += `\n\nATURAN KHUSUS: \n1. JANGAN ULANGI scene kedatangan. \n2. LANGSUNG diskusi mendalam/lanjutan topik. \n3. Lanjutkan materi ke sub-topik baru yang lebih mendalam dan berbeda dari bagian sebelumnya. \n4. Buat pertanyaan kuis yang sepenuhnya baru.`;
    } else {
      promptText += `\n\nKONTEKS: Ini adalah BAGIAN 1 (AWAL). \nATURAN KHUSUS: \n1. Mulai cerita dengan adegan Penjelajah Waktu BARU SAJA MENDARAT.`;
    }

    let rawText;
    if (apiKey) {
      // Use Gemini API with strict structured schema validation
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
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
          ],
          response_format: { type: "json_object" }
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
        console.error("JSON parsing failed:", err);
        throw new Error("Gagal memproses skenario cerita.");
      }
    }

    // Validate using Zod instead of relying on parsing
    try {
      parsedData = scenarioZodSchema.parse(parsedData);
    } catch (err) {
      console.error("Data validation failed:", err);
      throw new Error("Gagal memproses skenario cerita.");
    }

    return parsedData;
  };

export { fetchScenarioData };

