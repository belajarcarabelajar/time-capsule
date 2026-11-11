import { getUserFromRequest } from "./auth/_utils.js";
import {
  PointsError,
  pointsErrorResponse,
  refundPoints,
  reservePoints,
  saveStory,
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
    return { outcome: failure(422, REFUSED), spent: true };
  }
  if (reply.status === 429 && data?.error === "RATE_LIMITED") {
    return { outcome: failure(429, RATE_LIMITED) };
  }
  if (reply.status === 502 && data?.error === "PRIMARY_UNAVAILABLE") {
    return { fallback: reasonCode(data.reason), spent: data.tokens_spent === true };
  }
  console.error("Scenario story Worker unexpected reply:", reply.status);
  return { outcome: failure(502, STORY_UNAVAILABLE) };
}

// Resolves to the scenario JSON string, or null on any failure. Sets
// usage.spent once the provider answered with an OK reply, since that reply
// was generated even when its content is unusable.
async function askFallbackProvider(env, scenario, usage) {
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
  if (reply.ok) usage.spent = true;
  const data = reply.ok ? await readJson(reply) : null;
  const choice = data?.choices?.[0];
  const content = choice?.message?.content;
  if (!isFilledString(content)) {
    console.error("Scenario fallback provider error:", reply.status);
    return null;
  }
  // json_object mode carries no schema, so a cut-off or non-JSON reply is the
  // only unusable output that can be told apart here.
  if (choice.finish_reason === "length") {
    console.error("Scenario fallback provider output rejected:", "truncated");
    return null;
  }
  try {
    JSON.parse(content);
  } catch {
    console.error("Scenario fallback provider output rejected:", "invalid_json");
    return null;
  }
  return content;
}

// Resolves to the body text, null when the request has no body, or
// { tooLarge: true } once the stream passes the byte cap.
async function readCappedBody(request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { tooLarge: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

// Runs after the reservation. Sets usage.spent once a provider returned a
// model message and clears it again when saving the story fails; the caller
// refunds a failure only while it is false.
async function generateAndSave({ authUser, env, binding, scenario, usage }) {
  const { topic, chapter } = scenario;
  const primary = await askStoryWorker(binding, { userId: authUser.sub, ...scenario });
  if (primary.spent || primary.response) usage.spent = true;
  if (primary.outcome) return primary.outcome;

  let provider = "claude";
  let response = primary.response;
  if (primary.fallback) {
    console.warn("Scenario primary provider unavailable:", primary.fallback);
    response = await askFallbackProvider(env, scenario, usage);
    if (!response) return failure(502, STORY_UNAVAILABLE);
    provider = "fallback";
  }

  try {
    await saveStory({
      authUser,
      env,
      cost: COST,
      transactionDescription: "Generasi cerita time capsule",
      storyTitle: "Time Capsule Chapter",
      promptSnippet: `${topic} (bagian ${chapter})`,
      contentStr: JSON.stringify({ provider, response }),
    });
  } catch (err) {
    // Owner decision 2026-11-11: a story lost by our own database is refunded
    // even though the provider already spent tokens on it.
    usage.spent = false;
    throw err;
  }

  return jsonResponse(200, { success: true, result: { response } });
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

    // Refuses a declared oversized body before reading it; the streamed read
    // below still covers a missing or unparsable header.
    const declaredLength = request.headers.get("Content-Length") ?? "";
    if (/^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) {
      return failure(413, PAYLOAD_TOO_LARGE);
    }

    const raw = await readCappedBody(request);
    if (raw?.tooLarge) return failure(413, PAYLOAD_TOO_LARGE);

    let parsed;
    try {
      parsed = parseScenarioRequest(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (!parsed?.ok) return failure(400, INVALID_REQUEST);
    const { topic, chapter, history } = parsed.value;

    // Checked before the reservation so a missing binding needs no refund.
    const binding = env.STORY_WORKER;
    if (typeof binding?.fetch !== "function") {
      console.error("Scenario story Worker binding STORY_WORKER is missing");
      return failure(500, STORY_UNAVAILABLE);
    }

    // The points leave the balance before any paid call, so parallel or
    // cancelled requests cannot generate for free.
    const reservation = await reservePoints(authUser, env, COST);

    // Owner decision 2026-11-11: tokens a provider already spent stay paid, so
    // only a failure before any model message comes back, or a failure to save
    // the story, is refunded.
    const usage = { spent: false };
    let outcome;
    try {
      outcome = await generateAndSave({
        authUser,
        env,
        binding,
        scenario: { topic, chapter, history },
        usage,
      });
    } catch (err) {
      if (err instanceof PointsError) {
        outcome = pointsErrorResponse(err);
      } else {
        console.error("Scenario request failed unexpectedly");
        outcome = failure(500, STORY_UNAVAILABLE);
      }
    }
    if (outcome.status !== 200 && !usage.spent && !reservation.unlimited) {
      await refundPoints(authUser, env, COST);
    }
    return outcome;
  } catch (err) {
    if (err instanceof PointsError) return pointsErrorResponse(err);
    console.error("Scenario request failed unexpectedly");
    return failure(500, STORY_UNAVAILABLE);
  }
}
