import { SCENARIO_SYSTEM_PROMPT } from "./systemPrompt.js";
import { z } from "zod";

const zPlayerSchema = z.object({
  id: z.literal("PLAYER"),
  name: z.literal("Penjelajah"),
  icon: z.literal("🧑🏻‍🚀"),
  desc: z.literal("Masa Depan"),
});

const zNpc1Schema = z.object({
  id: z.literal("NPC_1"),
  name: z.string(),
  icon: z.string(),
  desc: z.string(),
});
const zNpc2Schema = z.object({
  id: z.literal("NPC_2"),
  name: z.string(),
  icon: z.string(),
  desc: z.string(),
});
const zNpc3Schema = z.object({
  id: z.literal("NPC_3"),
  name: z.string(),
  icon: z.string(),
  desc: z.string(),
});
const zNpc4Schema = z.object({
  id: z.literal("NPC_4"),
  name: z.string(),
  icon: z.string(),
  desc: z.string(),
});

const scenarioZodSchema = z.object({
  meta: z.object({
    location: z.string(),
    themeColor: z.string(),
    environmentKey: z.string().optional(),
  }),
  characters: z.object({
    PLAYER: zPlayerSchema,
    NPC_1: zNpc1Schema,
    NPC_2: zNpc2Schema,
    NPC_3: zNpc3Schema,
    NPC_4: zNpc4Schema.optional(),
  }),
  scenes: z.object({
    MAIN: z.object({
      bg: z.string(),
      elements: z.array(z.string()),
    }),
  }),
  script: z.array(
    z.discriminatedUnion("type", [
      z.object({
        type: z.literal("dialogue"),
        speakerId: z.enum(["PLAYER", "NPC_1", "NPC_2", "NPC_3", "NPC_4"]),
        mood: z.string(),
        text: z.string(),
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
            response: z.string(),
          }),
        ),
        explanation: z.string().optional(),
      }),
      z.object({
        type: z.literal("narrator"),
        text: z.string(),
      }),
    ]),
  ),
});

const providerErrorMessage = (data, fallback) => {
  const candidates = [
    data?.message,
    data?.errors?.[0]?.message,
    data?.error,
    data?.error?.message,
  ];
  return (
    candidates.find(
      (message) => typeof message === "string" && message.length > 0,
    ) || fallback
  );
};

const fetchScenarioData = async (
  activeTopic,
  chapterNum,
  historySummary = "",
) => {
  // 1. Basic type validation
  if (
    typeof activeTopic !== "string" ||
    typeof chapterNum !== "number" ||
    typeof historySummary !== "string"
  ) {
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
    return text.replace(/[<>{}[\]]/g, "");
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

  // Single scenario provider (Groq via the Pages Function proxy).
  // max_tokens bounds the output so a foreground-plus-preload pair stays
  // inside the provider per-minute token budget. A full 15-20 slide
  // scenario needs roughly 1500-1800 output tokens.
  const scenarioResponse = await fetch(`/api/scenario`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            SCENARIO_SYSTEM_PROMPT +
            "\nIMPORTANT: You must respond ONLY with valid JSON matching the format requested. Do not include any conversational preamble or markdown code block markers.",
        },
        { role: "user", content: promptText },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2200,
    }),
  });

  let data;
  try {
    data = await scenarioResponse.json();
  } catch (e) {
    console.error("Failed to parse scenario response:", e);
    data = null;
  }

  // If the provider returned a 401 (UNAUTHORIZED), 403 (INSUFFICIENT_POINTS),
  // or 503 (POINTS_UNAVAILABLE), propagate the exact error message directly
  if ([401, 403, 503].includes(scenarioResponse.status)) {
    const defaultMessage = scenarioResponse.status === 401 ? 'Authentication required.'
      : scenarioResponse.status === 403 ? 'INSUFFICIENT_POINTS' : 'POINTS_UNAVAILABLE';
    throw new Error(providerErrorMessage(data, defaultMessage));
  }

  if (!scenarioResponse.ok || data?.success === false) {
    throw new Error(providerErrorMessage(data, "Gagal menghubungi portal AI."));
  }

  rawText = data.result?.response;

  let parsedData;
  if (typeof rawText === "object") {
    parsedData = rawText;
  } else {
    // Extract strictly the JSON part
    const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gagal memproses skenario cerita.");
    }

    const jsonString = jsonMatch[0];
    try {
      parsedData = JSON.parse(jsonString);
    } catch (err) {
      try {
        // Layer 1: Flatten multiline string values by escaping literal newlines, tabs, and carriage returns inside quotes
        const escapes = { "\n": "\\n", "\r": "\\r", "\t": "\\t" };
        let cleaned = jsonString.replace(
          /"([^"\\]*(?:\\.[^"\\]*)*)"/g,
          (match, p1) => {
            if (!/[\n\r\t]/.test(p1)) return match;
            return '"' + p1.replace(/[\n\r\t]/g, (m) => escapes[m]) + '"';
          },
        );

        // Layer 2: Escape unescaped double quotes within string values on a line-by-line basis
        const sanitizedString = cleaned.replace(
          /^(\s*"[a-zA-Z0-9_]+"\s*:\s*")(.*)("\s*,?\s*)$/gm,
          (match, prefix, middle, suffix) => {
            const fixedMiddle = middle.replace(/(?<!\\)"/g, '\\"');
            return prefix + fixedMiddle + suffix;
          },
        );
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
