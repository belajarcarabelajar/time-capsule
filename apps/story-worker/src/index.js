import {
  SCENARIO_JSON_SCHEMA,
  buildScenarioPrompt,
  parseScenarioRequest,
} from "../../../packages/game-engine/src/scenarioPrompt.js";
import { generateWithClaude } from "./claude.js";

const USER_ID_MAX = 128;

export async function handleStoryRequest(request, env, deps = {}) {
  const started = Date.now();
  const reply = (status, body, log = {}) => {
    console.log(
      JSON.stringify({ event: "story", ...log, status, ms: Date.now() - started }),
    );
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };

  const { pathname } = new URL(request.url);
  if (request.method !== "POST" || pathname !== "/v1/story") {
    return reply(404, { success: false, error: "NOT_FOUND" }, { outcome: "not_found" });
  }

  const invalid = () =>
    reply(400, { success: false, error: "INVALID_REQUEST" }, { outcome: "invalid_request" });

  let body;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return invalid();

  const { userId, ...scenarioRequest } = body;
  const parsed = parseScenarioRequest(scenarioRequest);
  if (!parsed.ok) return invalid();
  if (typeof userId !== "string" || userId.length === 0 || userId.length > USER_ID_MAX) {
    return invalid();
  }

  // Fail closed: a broken limiter must stop generation, never skip the limit.
  let limited;
  try {
    limited =
      !(await env.STORY_USER_LIMIT.limit({ key: `u:${userId}` })).success ||
      !(await env.STORY_GLOBAL_LIMIT.limit({ key: "global" })).success;
  } catch {
    return reply(500, { success: false, error: "INVALID_CONFIG" }, { outcome: "invalid_config" });
  }
  if (limited) {
    return reply(429, { success: false, error: "RATE_LIMITED" }, { outcome: "rate_limited" });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return reply(
      502,
      { success: false, error: "PRIMARY_UNAVAILABLE", reason: "not_configured" },
      { outcome: "primary_unavailable", reason: "not_configured" },
    );
  }

  const { system, user } = buildScenarioPrompt(parsed.value);
  const result = await generateWithClaude({
    apiKey: env.ANTHROPIC_API_KEY,
    system,
    user,
    schema: SCENARIO_JSON_SCHEMA,
    fetch: deps.fetch,
  });
  const tokens = {
    input_tokens: result.usage?.input_tokens,
    output_tokens: result.usage?.output_tokens,
  };

  if (result.ok) {
    return reply(
      200,
      { success: true, provider: "claude", response: result.response },
      { outcome: "ok", ...tokens },
    );
  }
  if (result.refused) {
    return reply(422, { success: false, error: "REFUSED" }, { outcome: "refused", ...tokens });
  }
  return reply(
    502,
    { success: false, error: "PRIMARY_UNAVAILABLE", reason: result.reason },
    { outcome: "primary_unavailable", reason: result.reason, ...tokens },
  );
}

export default {
  fetch: (request, env) => handleStoryRequest(request, env),
};
