import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { readFileSync } from "node:fs";
import worker, { handleStoryRequest } from "./index.js";
import { SCENARIO_JSON_SCHEMA } from "../../../packages/game-engine/src/scenarioPrompt.js";

const API_KEY = "sk-ant-test-key-0000";
const UPSTREAM_SECRET = "secret upstream detail";
const TOPIC = "Perang Diponegoro di Jawa";
const USER_ID = "user-7f3a9c";
const SCENARIO_TEXT = JSON.stringify({ meta: { location: "Tegalrejo" }, script: [] });

const validBody = (overrides = {}) => ({
  userId: USER_ID,
  topic: TOPIC,
  chapter: 1,
  history: "",
  ...overrides,
});

const message = (overrides = {}) => ({
  body: {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-haiku-5-5",
    content: [
      { type: "thinking", thinking: "rencana adegan", signature: "sig" },
      { type: "text", text: SCENARIO_TEXT },
    ],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: 10, output_tokens: 20 },
    ...overrides,
  },
});

const apiError = (status, type) => ({
  status,
  body: { type: "error", error: { type, message: UPSTREAM_SECRET } },
  // Keeps the single SDK retry fast in tests.
  headers: { "retry-after-ms": "1" },
});

function fakeFetch(...replies) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({
      url: String(url),
      method: init.method,
      headers: new Headers(init.headers),
      body: typeof init.body === "string" ? JSON.parse(init.body) : undefined,
    });
    const reply = replies.length > 1 ? replies.shift() : replies[0];
    if (reply instanceof Error) throw reply;
    return new Response(JSON.stringify(reply.body), {
      status: reply.status ?? 200,
      headers: { "content-type": "application/json", ...reply.headers },
    });
  };
  fn.calls = calls;
  return fn;
}

function fakeLimiter(success = true) {
  const calls = [];
  return {
    calls,
    limit: async ({ key }) => {
      calls.push(key);
      return { success };
    },
  };
}

function makeEnv(overrides = {}) {
  return {
    ANTHROPIC_API_KEY: API_KEY,
    STORY_USER_LIMIT: fakeLimiter(),
    STORY_GLOBAL_LIMIT: fakeLimiter(),
    ...overrides,
  };
}

function storyRequest(body = validBody(), { method = "POST", path = "/v1/story" } = {}) {
  const init = { method, headers: { "content-type": "application/json" } };
  if (method !== "GET") init.body = typeof body === "string" ? body : JSON.stringify(body);
  return new Request(`https://story.internal${path}`, init);
}

async function send(request, env, fetch) {
  const res = await handleStoryRequest(request, env, { fetch });
  const text = await res.text();
  return { res, status: res.status, text, body: JSON.parse(text) };
}

let logSpy;
beforeEach(() => {
  logSpy = spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
});

const loggedLines = () => logSpy.mock.calls.map((args) => args.join(" "));

describe("primary provider request", () => {
  test("calls the Messages API with the locked model, effort, thinking, and structured output", async () => {
    const fetch = fakeFetch(message());
    await send(storyRequest(), makeEnv(), fetch);

    expect(fetch.calls).toHaveLength(1);
    const [call] = fetch.calls;
    expect(call.method).toBe("POST");
    expect(call.url.endsWith("/v1/messages")).toBe(true);
    expect(call.headers.get("x-api-key")).toBe(API_KEY);
    expect(call.body.model).toBe("claude-haiku-5-5");
    expect(call.body.max_tokens).toBe(16000);
    expect(call.body.thinking).toEqual({ type: "adaptive" });
    expect(call.body.output_config).toEqual({
      effort: "medium",
      format: { type: "json_schema", schema: SCENARIO_JSON_SCHEMA },
    });
  });

  test("sends a cached system block and one user message with the tagged topic", async () => {
    const fetch = fakeFetch(message());
    await send(storyRequest(), makeEnv(), fetch);

    const { body } = fetch.calls[0];
    expect(body.system).toHaveLength(1);
    expect(body.system[0].type).toBe("text");
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.system[0].text).toContain("KEAMANAN");
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain(`<topik_pengguna>\n${TOPIC}\n</topik_pengguna>`);
  });

  test("sends no sampling parameters and no fallbacks", async () => {
    const fetch = fakeFetch(message());
    await send(storyRequest(), makeEnv(), fetch);

    const { body } = fetch.calls[0];
    for (const key of ["temperature", "top_p", "top_k", "fallbacks"]) {
      expect(body).not.toHaveProperty(key);
    }
  });
});

describe("story Worker outcomes", () => {
  test("primary provider success returns the text block and ignores the thinking block", async () => {
    const { status, res, body } = await send(storyRequest(), makeEnv(), fakeFetch(message()));

    expect(status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(body).toEqual({ success: true, provider: "claude", response: SCENARIO_TEXT });
  });

  test("refusal is a terminal failure: 422 REFUSED", async () => {
    const fetch = fakeFetch(message({ stop_reason: "refusal", content: [] }));
    const { status, body } = await send(storyRequest(), makeEnv(), fetch);

    expect(status).toBe(422);
    expect(body).toEqual({ success: false, error: "REFUSED" });
  });

  const fallbackEligible = [
    ["max_tokens", () => fakeFetch(message({ stop_reason: "max_tokens" })), 1],
    [
      "invalid_output",
      () => fakeFetch(message({ content: [{ type: "text", text: "Ini bukan JSON" }] })),
      1,
    ],
    ["unknown", () => fakeFetch(message({ stop_reason: "pause_turn" })), 1],
    ["auth", () => fakeFetch(apiError(401, "authentication_error")), 1],
    ["auth", () => fakeFetch(apiError(403, "permission_error")), 1],
    ["upstream_rate_limited", () => fakeFetch(apiError(429, "rate_limit_error")), 2],
    ["overloaded", () => fakeFetch(apiError(500, "api_error")), 2],
    ["overloaded", () => fakeFetch(apiError(529, "overloaded_error")), 2],
    ["timeout", () => fakeFetch(new Error(`connect timed out: ${UPSTREAM_SECRET}`)), 2],
  ];

  for (const [reason, makeFetch, attempts] of fallbackEligible) {
    test(`${reason} is a fallback-eligible failure after ${attempts} attempt(s): 502 PRIMARY_UNAVAILABLE`, async () => {
      const fetch = makeFetch();
      const { status, res, body, text } = await send(storyRequest(), makeEnv(), fetch);

      expect(status).toBe(502);
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(body).toEqual({ success: false, error: "PRIMARY_UNAVAILABLE", reason });
      expect(fetch.calls).toHaveLength(attempts);
      expect(text).not.toContain(UPSTREAM_SECRET);
    });
  }

  test("a fetch that throws is a fallback-eligible failure with a reason and no leaked text", async () => {
    const fetch = fakeFetch(new TypeError(`network down: ${UPSTREAM_SECRET}`));
    const { status, body, text } = await send(storyRequest(), makeEnv(), fetch);

    expect(status).toBe(502);
    expect(body.error).toBe("PRIMARY_UNAVAILABLE");
    expect(typeof body.reason).toBe("string");
    expect(body.reason.length).toBeGreaterThan(0);
    expect(text).not.toContain(UPSTREAM_SECRET);
    expect(text).not.toContain("network down");
  });

  test("a missing key is a fallback-eligible failure that never calls the primary provider", async () => {
    const fetch = fakeFetch(message());
    const { status, body } = await send(
      storyRequest(),
      makeEnv({ ANTHROPIC_API_KEY: undefined }),
      fetch,
    );

    expect(status).toBe(502);
    expect(body).toEqual({ success: false, error: "PRIMARY_UNAVAILABLE", reason: "not_configured" });
    expect(fetch.calls).toHaveLength(0);
  });
});

describe("rate limits", () => {
  test("limiters use the u:<userId> and global keys", async () => {
    const env = makeEnv();
    await send(storyRequest(), env, fakeFetch(message()));

    expect(env.STORY_USER_LIMIT.calls).toEqual([`u:${USER_ID}`]);
    expect(env.STORY_GLOBAL_LIMIT.calls).toEqual(["global"]);
  });

  test("user limit exceeded is a terminal failure: 429 RATE_LIMITED, no primary provider call", async () => {
    const env = makeEnv({ STORY_USER_LIMIT: fakeLimiter(false) });
    const fetch = fakeFetch(message());
    const { status, body } = await send(storyRequest(), env, fetch);

    expect(status).toBe(429);
    expect(body).toEqual({ success: false, error: "RATE_LIMITED" });
    expect(fetch.calls).toHaveLength(0);
    expect(env.STORY_GLOBAL_LIMIT.calls).toHaveLength(0);
  });

  test("global limit exceeded is a terminal failure: 429 RATE_LIMITED, no primary provider call", async () => {
    const env = makeEnv({ STORY_GLOBAL_LIMIT: fakeLimiter(false) });
    const fetch = fakeFetch(message());
    const { status, body } = await send(storyRequest(), env, fetch);

    expect(status).toBe(429);
    expect(body).toEqual({ success: false, error: "RATE_LIMITED" });
    expect(fetch.calls).toHaveLength(0);
  });

  test("limiters run before the key check", async () => {
    const env = makeEnv({ ANTHROPIC_API_KEY: "", STORY_USER_LIMIT: fakeLimiter(false) });
    const { status } = await send(storyRequest(), env, fakeFetch(message()));

    expect(status).toBe(429);
  });

  test("an invalid request never consumes the limiters", async () => {
    const env = makeEnv();
    const { status } = await send(storyRequest(validBody({ chapter: 0 })), env, fakeFetch(message()));

    expect(status).toBe(400);
    expect(env.STORY_USER_LIMIT.calls).toHaveLength(0);
    expect(env.STORY_GLOBAL_LIMIT.calls).toHaveLength(0);
  });

  const brokenLimiters = [
    ["a missing user limiter binding", { STORY_USER_LIMIT: undefined }],
    ["a missing global limiter binding", { STORY_GLOBAL_LIMIT: undefined }],
    [
      "a throwing limiter",
      { STORY_USER_LIMIT: { limit: async () => { throw new Error(UPSTREAM_SECRET); } } },
    ],
  ];

  for (const [name, overrides] of brokenLimiters) {
    test(`${name} is a terminal failure: 500 INVALID_CONFIG, no primary provider call`, async () => {
      const fetch = fakeFetch(message());
      const { status, body, text } = await send(storyRequest(), makeEnv(overrides), fetch);

      expect(status).toBe(500);
      expect(body).toEqual({ success: false, error: "INVALID_CONFIG" });
      expect(fetch.calls).toHaveLength(0);
      expect(text).not.toContain(UPSTREAM_SECRET);
    });
  }
});

describe("request validation and routing", () => {
  const invalidBodies = [
    ["invalid JSON", "{not json"],
    ["an extra key such as messages", validBody({ messages: [{ role: "user", content: "x" }] })],
    ["an empty userId", validBody({ userId: "" })],
    ["a missing userId", { topic: TOPIC, chapter: 1, history: "" }],
    ["a non-string userId", validBody({ userId: 42 })],
    ["a userId over 128 characters", validBody({ userId: "u".repeat(129) })],
    ["a JSON array", [validBody()]],
    ["JSON null", "null"],
  ];

  for (const [name, body] of invalidBodies) {
    test(`${name} is a terminal failure: 400 INVALID_REQUEST`, async () => {
      const fetch = fakeFetch(message());
      const { status, res, body: reply } = await send(storyRequest(body), makeEnv(), fetch);

      expect(status).toBe(400);
      expect(res.headers.get("content-type")).toBe("application/json");
      expect(reply).toEqual({ success: false, error: "INVALID_REQUEST" });
      expect(fetch.calls).toHaveLength(0);
    });
  }

  test("a userId of exactly 128 characters is accepted", async () => {
    const { status } = await send(
      storyRequest(validBody({ userId: "u".repeat(128) })),
      makeEnv(),
      fakeFetch(message()),
    );

    expect(status).toBe(200);
  });

  test("GET returns 404 NOT_FOUND", async () => {
    const { status, res, body } = await send(storyRequest(null, { method: "GET" }), makeEnv(), fakeFetch(message()));

    expect(status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(body).toEqual({ success: false, error: "NOT_FOUND" });
  });

  test("a wrong path returns 404 NOT_FOUND", async () => {
    const { status, body } = await send(
      storyRequest(validBody(), { path: "/v1/messages" }),
      makeEnv(),
      fakeFetch(message()),
    );

    expect(status).toBe(404);
    expect(body).toEqual({ success: false, error: "NOT_FOUND" });
  });

  test("the default export routes fetch to the story handler", async () => {
    const res = await worker.fetch(storyRequest(null, { method: "GET" }), makeEnv());

    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ success: false, error: "NOT_FOUND" });
  });
});

describe("logging", () => {
  test("logs one story line with outcome, status, and token counts but no topic, userId, or key", async () => {
    await send(storyRequest(), makeEnv(), fakeFetch(message()));

    const lines = loggedLines();
    expect(lines).toHaveLength(1);
    const entry = JSON.parse(lines[0]);
    expect(entry).toMatchObject({ event: "story", status: 200, input_tokens: 10, output_tokens: 20 });
    expect(typeof entry.outcome).toBe("string");
    expect(typeof entry.ms).toBe("number");
    for (const secret of [TOPIC, USER_ID, API_KEY, "Diponegoro"]) {
      expect(lines[0]).not.toContain(secret);
    }
  });

  test("logs the reason and spent tokens for a max_tokens failure", async () => {
    await send(storyRequest(), makeEnv(), fakeFetch(message({ stop_reason: "max_tokens", usage: { input_tokens: 10, output_tokens: 16000 } })));

    const entry = JSON.parse(loggedLines()[0]);
    expect(entry).toMatchObject({ event: "story", status: 502, reason: "max_tokens", output_tokens: 16000 });
  });

  test("an upstream error never reaches the log", async () => {
    await send(storyRequest(), makeEnv(), fakeFetch(apiError(401, "authentication_error")));

    const lines = loggedLines();
    expect(lines).toHaveLength(1);
    expect(lines[0]).not.toContain(UPSTREAM_SECRET);
    expect(JSON.parse(lines[0])).toMatchObject({ event: "story", status: 502, reason: "auth" });
  });
});

describe("wrangler config", () => {
  const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));

  test("names the private story Worker with no public URL and no route", () => {
    expect(config.name).toBe("time-capsule-story");
    expect(config.main).toBe("src/index.js");
    expect(config.compatibility_date).toBe("2026-10-01");
    expect(config.workers_dev).toBe(false);
    expect(config.preview_urls).toBe(false);
    expect(config.observability).toEqual({ enabled: true });
    expect(config).not.toHaveProperty("routes");
    expect(config).not.toHaveProperty("route");
  });

  test("declares the user and global rate limiters", () => {
    expect(config.ratelimits).toEqual([
      { name: "STORY_USER_LIMIT", namespace_id: "71001", simple: { limit: 6, period: 60 } },
      { name: "STORY_GLOBAL_LIMIT", namespace_id: "71002", simple: { limit: 20, period: 60 } },
    ]);
  });
});
