import { getUserFromRequest } from "./auth/_utils.js";
import {
  checkUserPoints,
  deductPointsAndSaveStory,
  PointsError,
  pointsErrorResponse,
} from "./_ai_utils.js";
import {
  buildScenarioPrompt,
  parseScenarioRequest,
} from "../../packages/game-engine/src/scenarioPrompt.js";

const DEFAULT_PROVIDER_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_PROVIDER_MODEL = "openai/gpt-oss-120b";
const STORY_WORKER_URL = "https://time-capsule-story/v1/story";
const MAX_BODY_BYTES = 16384;
const COST = 10;

const PAYLOAD_TOO_LARGE = {
  error: "PAYLOAD_TOO_LARGE",
  message: "Permintaan cerita terlalu besar.",
};
const INVALID_REQUEST = {
  error: "INVALID_REQUEST",
  message: "Permintaan cerita tidak valid. Muat ulang halaman lalu coba lagi.",
};
const REFUSED = {
  error: "REFUSED",
  message: "Topik ini tidak dapat diproses. Coba topik sejarah lain.",
};
const RATE_LIMITED = {
  error: "RATE_LIMITED",
  message: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
};
const STORY_UNAVAILABLE = {
  error: "STORY_UNAVAILABLE",
  message: "Portal waktu sedang sibuk. Coba lagi sebentar lagi.",
};

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function failure(status, { error, message }) {
  return jsonResponse(status, { success: false, error, message });
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

const isFilledString = (value) => typeof value === "string" && value.length > 0;

// Only a reason code shape is logged, so no other Worker text reaches the logs.
const reasonCode = (reason) =>
  typeof reason === "string" && /^[a-z_]{1,40}$/.test(reason) ? reason : "unknown";

// Resolves to { response } on success, { fallback: reason } when the fallback
// provider may run, or { outcome } holding the terminal reply.
async function askStoryWorker(binding, payload) {
  let reply;
  try {
    reply = await binding.fetch(STORY_WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    console.error("Scenario story Worker call failed");
    return { outcome: failure(502, STORY_UNAVAILABLE) };
  }
  const data = await readJson(reply);
  if (reply.status === 200 && data?.success === true && isFilledString(data.response)) {
    return { response: data.response };
  }
  if (reply.status === 422 && data?.error === "REFUSED") {
    return { outcome: failure(422, REFUSED) };
  }
  if (reply.status === 429 && data?.error === "RATE_LIMITED") {
    return { outcome: failure(429, RATE_LIMITED) };
  }
  if (reply.status === 502 && data?.error === "PRIMARY_UNAVAILABLE") {
    return { fallback: reasonCode(data.reason) };
  }
  console.error("Scenario story Worker unexpected reply:", reply.status);
  return { outcome: failure(502, STORY_UNAVAILABLE) };
}

// Resolves to the scenario JSON string, or null on any failure.
async function askFallbackProvider(env, scenario) {
  const key = env.PROVIDER_API_KEY;
  if (!key) {
    console.error("Scenario fallback provider not configured: PROVIDER_API_KEY");
    return null;
  }
  const { system, user } = buildScenarioPrompt(scenario);
  let reply;
  try {
    reply = await fetch(env.PROVIDER_URL || DEFAULT_PROVIDER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.PROVIDER_MODEL || DEFAULT_PROVIDER_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: { type: "json_object" },
        max_tokens: 3000,
      }),
    });
  } catch {
    console.error("Scenario fallback provider request failed");
    return null;
  }
  const data = reply.ok ? await readJson(reply) : null;
  const content = data?.choices?.[0]?.message?.content;
  if (!isFilledString(content)) {
    console.error("Scenario fallback provider error:", reply.status);
    return null;
  }
  return content;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const authUser = await getUserFromRequest(request, env);

    if (!authUser) {
      return jsonResponse(401, {
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required to use this endpoint.",
      });
    }

    const raw = await request.text();
    if (new TextEncoder().encode(raw).length > MAX_BODY_BYTES) {
      return failure(413, PAYLOAD_TOO_LARGE);
    }

    let parsed;
    try {
      parsed = parseScenarioRequest(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (!parsed?.ok) return failure(400, INVALID_REQUEST);
    const { topic, chapter, history } = parsed.value;

    const pointCheck = await checkUserPoints(authUser, env, COST);
    if (!pointCheck.success) return pointCheck.errorResponse;

    const binding = env.STORY_WORKER;
    if (typeof binding?.fetch !== "function") {
      console.error("Scenario story Worker binding STORY_WORKER is missing");
      return failure(500, STORY_UNAVAILABLE);
    }

    const primary = await askStoryWorker(binding, {
      userId: authUser.sub,
      topic,
      chapter,
      history,
    });
    if (primary.outcome) return primary.outcome;

    let provider = "claude";
    let response = primary.response;
    if (primary.fallback) {
      console.warn("Scenario primary provider unavailable:", primary.fallback);
      response = await askFallbackProvider(env, { topic, chapter, history });
      if (!response) return failure(502, STORY_UNAVAILABLE);
      provider = "fallback";
    }

    await deductPointsAndSaveStory({
      authUser,
      env,
      cost: COST,
      transactionDescription: "Generasi cerita time capsule",
      storyTitle: "Time Capsule Chapter",
      promptSnippet: `${topic} (bagian ${chapter})`,
      contentStr: JSON.stringify({ provider, response }),
    });

    return jsonResponse(200, { success: true, result: { response } });
  } catch (err) {
    if (err instanceof PointsError) return pointsErrorResponse(err);
    console.error("Scenario request failed unexpectedly");
    return failure(500, STORY_UNAVAILABLE);
  }
}
