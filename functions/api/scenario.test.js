import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { onRequestPost } from "./scenario.js";
import { signJwt } from "./auth/_utils.js";
import { createPointsDb } from "./test-support/pointsDb.js";

const JWT_SECRET = "time-capsule-secret-jwt-key-2026-belajarcarabelajar";
const DEFAULT_FALLBACK_URL = "https://api.groq.com/openai/v1/chat/completions";
const STORY_WORKER_URL = "https://time-capsule-story/v1/story";
const UPSTREAM_DETAIL = "upstream secret detail";
const SCENARIO_JSON = JSON.stringify({ meta: { location: "Roma" } });

const STORY_UNAVAILABLE = {
  success: false,
  error: "STORY_UNAVAILABLE",
  message: "Portal waktu sedang sibuk. Coba lagi sebentar lagi.",
};
const INVALID_REQUEST = {
  success: false,
  error: "INVALID_REQUEST",
  message: "Permintaan cerita tidak valid. Muat ulang halaman lalu coba lagi.",
};

const scenarioBody = { topic: "Kekaisaran <Romawi>", chapter: 2, history: "Bab {1} selesai" };
const sanitizedScenario = { topic: "Kekaisaran Romawi", chapter: 2, history: "Bab 1 selesai" };

const userToken = () => signJwt({ sub: "google-user" }, JWT_SECRET);
const adminToken = () =>
  signJwt(
    { sub: "admin-user", email: "kurniawaniwan7906@gmail.com", verified_email: true },
    JWT_SECRET,
  );

function scenarioRequest(token, body = scenarioBody) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request("http://localhost/api/scenario", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function fakeStoryWorker(status, reply) {
  const calls = [];
  return {
    calls,
    fetch: async (url, init) => {
      calls.push({ url, init, body: JSON.parse(init.body) });
      const text = typeof reply === "string" ? reply : JSON.stringify(reply);
      return new Response(text, { status });
    },
  };
}

const primarySuccess = () =>
  fakeStoryWorker(200, { success: true, provider: "claude", response: SCENARIO_JSON });
const primaryUnavailable = () =>
  fakeStoryWorker(502, { success: false, error: "PRIMARY_UNAVAILABLE", reason: "overloaded" });

const fallbackReply = (content, status = 200) => () =>
  new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), { status });

// Byte-exact JSON body; the history field absorbs the padding.
function bodyOfBytes(size, fill = "x") {
  const prefix = '{"topic":"Roma","chapter":1,"history":"';
  const suffix = '"}';
  const fillBytes = new TextEncoder().encode(fill).length;
  const count = (size - prefix.length - suffix.length) / fillBytes;
  const body = prefix + fill.repeat(count) + suffix;
  expect(new TextEncoder().encode(body).length).toBe(size);
  return body;
}

describe("onRequestPost scenario request", () => {
  let originalFetch;
  let fixture;
  let fallbackCalls;
  let warnSpy;
  let errorSpy;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    fallbackCalls = [];
    globalThis.fetch = async (url, init) => {
      fallbackCalls.push({ url, init, body: JSON.parse(init.body) });
      return fallbackReply(SCENARIO_JSON)();
    };
    warnSpy = spyOn(console, "warn").mockImplementation(() => {});
    errorSpy = spyOn(console, "error").mockImplementation(() => {});
    fixture = await createPointsDb();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    await fixture.dispose();
  });

  function stubFallbackProvider(respond) {
    globalThis.fetch = async (url, init) => {
      fallbackCalls.push({ url, init, body: JSON.parse(init.body) });
      return respond();
    };
  }

  function envWith(overrides = {}) {
    return {
      JWT_SECRET,
      DB: fixture.db,
      PROVIDER_API_KEY: "test-fallback-key",
      STORY_WORKER: primarySuccess(),
      ...overrides,
    };
  }

  async function fixturePoints() {
    const row = await fixture.db
      .prepare("SELECT points FROM users WHERE google_id = ?")
      .bind("google-user")
      .first();
    return row.points;
  }

  async function fixtureStories() {
    const { results } = await fixture.db
      .prepare("SELECT prompt, content, points_spent FROM stories")
      .all();
    return results;
  }

  function loggedText() {
    return [...warnSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((arg) => String(arg))
      .join(" ");
  }

  async function expectNothingCharged() {
    expect(await fixturePoints()).toBe(50);
    expect(await fixtureStories()).toEqual([]);
  }

  describe("request validation", () => {
    it("rejects an unauthenticated scenario request with 401 before calling the story Worker", async () => {
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: scenarioRequest(null),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(401);
      expect((await response.json()).error).toBe("UNAUTHORIZED");
      expect(worker.calls).toHaveLength(0);
      expect(fallbackCalls).toHaveLength(0);
    });

    const tooLarge = [
      ["a 16385-byte ASCII body", () => bodyOfBytes(16385)],
      ["a body under 16384 characters but over 16384 UTF-8 bytes", () => bodyOfBytes(16385, "é")],
    ];
    for (const [name, makeBody] of tooLarge) {
      it(`rejects ${name} with 413 PAYLOAD_TOO_LARGE without calling the story Worker or charging`, async () => {
        const worker = primarySuccess();
        const response = await onRequestPost({
          request: scenarioRequest(await userToken(), makeBody()),
          env: envWith({ STORY_WORKER: worker }),
        });
        expect(response.status).toBe(413);
        expect(await response.json()).toEqual({
          success: false,
          error: "PAYLOAD_TOO_LARGE",
          message: "Permintaan cerita terlalu besar.",
        });
        expect(worker.calls).toHaveLength(0);
        await expectNothingCharged();
      });
    }

    const invalid = [
      ["a 16384-byte body with an oversized history", () => bodyOfBytes(16384)],
      ["invalid JSON", () => "{not json"],
      ["a legacy messages body", () => ({ messages: [{ role: "user", content: "x" }], response_format: { type: "json_object" } })],
      ["an extra key", () => ({ ...scenarioBody, model: "gpt-4" })],
      ["a topic that sanitizes to empty", () => ({ topic: "<<>>", chapter: 1, history: "" })],
      ["a non-integer chapter", () => ({ topic: "Roma", chapter: 1.5, history: "" })],
    ];
    for (const [name, makeBody] of invalid) {
      it(`rejects ${name} with 400 INVALID_REQUEST without calling the story Worker or charging`, async () => {
        const worker = primarySuccess();
        const response = await onRequestPost({
          request: scenarioRequest(await userToken(), makeBody()),
          env: envWith({ STORY_WORKER: worker }),
        });
        expect(response.status).toBe(400);
        expect(await response.json()).toEqual(INVALID_REQUEST);
        expect(worker.calls).toHaveLength(0);
        expect(fallbackCalls).toHaveLength(0);
        await expectNothingCharged();
      });
    }
  });

  describe("primary provider success", () => {
    it("sends the sanitized scenario request with the user id to the story Worker", async () => {
      const worker = primarySuccess();
      await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(worker.calls).toHaveLength(1);
      const [call] = worker.calls;
      expect(call.url).toBe(STORY_WORKER_URL);
      expect(call.init.method).toBe("POST");
      expect(call.init.headers["Content-Type"]).toBe("application/json");
      expect(call.body).toEqual({ userId: "google-user", ...sanitizedScenario });
    });

    it("returns the primary provider response in the browser shape and charges 10 points with a claude story", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith(),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, result: { response: SCENARIO_JSON } });
      expect(fallbackCalls).toHaveLength(0);
      expect(await fixturePoints()).toBe(40);
      const stories = await fixtureStories();
      expect(stories).toHaveLength(1);
      expect(JSON.parse(stories[0].content)).toEqual({ provider: "claude", response: SCENARIO_JSON });
      expect(stories[0].prompt).toBe("Kekaisaran Romawi (bagian 2)");
      expect(stories[0].points_spent).toBe(10);
    });
  });

  describe("fallback-eligible failure", () => {
    it("calls the fallback provider once at the default URL with the server-built prompt", async () => {
      await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(fallbackCalls).toHaveLength(1);
      const [call] = fallbackCalls;
      expect(call.url).toBe(DEFAULT_FALLBACK_URL);
      expect(call.init.method).toBe("POST");
      expect(call.init.headers.Authorization).toBe("Bearer test-fallback-key");
      expect(Object.keys(call.body).sort()).toEqual(["max_tokens", "messages", "model", "response_format"]);
      expect(call.body.model).toBe("openai/gpt-oss-120b");
      expect(call.body.response_format).toEqual({ type: "json_object" });
      expect(call.body.max_tokens).toBe(3000);
      expect(call.body.messages.map((m) => m.role)).toEqual(["system", "user"]);
      expect(call.body.messages[0].content).toContain("KEAMANAN");
      expect(call.body.messages[1].content).toContain("<topik_pengguna>\nKekaisaran Romawi\n</topik_pengguna>");
      expect(call.body.messages[1].content).toContain("Bab 1 selesai");
    });

    it("returns the fallback provider response in the browser shape and charges 10 points with a fallback story", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, result: { response: SCENARIO_JSON } });
      expect(await fixturePoints()).toBe(40);
      const stories = await fixtureStories();
      expect(stories).toHaveLength(1);
      expect(JSON.parse(stories[0].content)).toEqual({ provider: "fallback", response: SCENARIO_JSON });
    });

    it("honors custom PROVIDER_URL and PROVIDER_MODEL for the fallback provider", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({
          STORY_WORKER: primaryUnavailable(),
          PROVIDER_URL: "https://example.test/v1/chat/completions",
          PROVIDER_MODEL: "custom-model",
        }),
      });
      expect(response.status).toBe(200);
      expect(fallbackCalls).toHaveLength(1);
      expect(fallbackCalls[0].url).toBe("https://example.test/v1/chat/completions");
      expect(fallbackCalls[0].body.model).toBe("custom-model");
    });

    it("logs only the story Worker reason code for a fallback-eligible failure", async () => {
      await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(warnSpy).toHaveBeenCalledWith("Scenario primary provider unavailable:", "overloaded");
      expect(loggedText()).not.toContain("google-user");
      expect(loggedText()).not.toContain("Romawi");
    });
  });

  describe("terminal failure", () => {
    it("maps a story Worker 422 REFUSED to 422 without the fallback provider or a charge", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: fakeStoryWorker(422, { success: false, error: "REFUSED" }) }),
      });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({
        success: false,
        error: "REFUSED",
        message: "Topik ini tidak dapat diproses. Coba topik sejarah lain.",
      });
      expect(fallbackCalls).toHaveLength(0);
      await expectNothingCharged();
    });

    it("maps a story Worker 429 RATE_LIMITED to 429 without the fallback provider or a charge", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: fakeStoryWorker(429, { success: false, error: "RATE_LIMITED" }) }),
      });
      expect(response.status).toBe(429);
      expect(await response.json()).toEqual({
        success: false,
        error: "RATE_LIMITED",
        message: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
      });
      expect(fallbackCalls).toHaveLength(0);
      await expectNothingCharged();
    });

    const unknownReplies = [
      ["a 500 INVALID_CONFIG reply", 500, { success: false, error: "INVALID_CONFIG", detail: UPSTREAM_DETAIL }],
      ["a 400 INVALID_REQUEST reply", 400, { success: false, error: "INVALID_REQUEST", detail: UPSTREAM_DETAIL }],
      ["an unknown status", 418, { success: false, error: UPSTREAM_DETAIL }],
      ["a 502 reply that is not PRIMARY_UNAVAILABLE", 502, { success: false, error: "BAD_GATEWAY", detail: UPSTREAM_DETAIL }],
      ["a 422 reply that is not REFUSED", 422, { success: false, error: UPSTREAM_DETAIL }],
      ["a 200 reply with a non-string response", 200, { success: true, response: { detail: UPSTREAM_DETAIL } }],
      ["a 200 reply with an empty response", 200, { success: true, response: "" }],
      ["a 200 reply without success true", 200, { success: false, response: UPSTREAM_DETAIL }],
      ["an unparsable reply body", 200, `not json ${UPSTREAM_DETAIL}`],
    ];
    for (const [name, status, reply] of unknownReplies) {
      it(`maps ${name} from the story Worker to 502 STORY_UNAVAILABLE without the fallback provider or a charge`, async () => {
        const response = await onRequestPost({
          request: scenarioRequest(await userToken()),
          env: envWith({ STORY_WORKER: fakeStoryWorker(status, reply) }),
        });
        expect(response.status).toBe(502);
        const text = await response.text();
        expect(JSON.parse(text)).toEqual(STORY_UNAVAILABLE);
        expect(text).not.toContain(UPSTREAM_DETAIL);
        expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
        expect(fallbackCalls).toHaveLength(0);
        await expectNothingCharged();
      });
    }

    it("maps a thrown story Worker call to 502 STORY_UNAVAILABLE without the fallback provider or a charge", async () => {
      const worker = {
        fetch: async () => {
          throw new Error(UPSTREAM_DETAIL);
        },
      };
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual(STORY_UNAVAILABLE);
      expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
      expect(fallbackCalls).toHaveLength(0);
      await expectNothingCharged();
    });

    for (const [name, binding] of [["missing", undefined], ["without a fetch function", {}]]) {
      it(`returns 500 STORY_UNAVAILABLE when the STORY_WORKER binding is ${name}, without the fallback provider or a charge`, async () => {
        const response = await onRequestPost({
          request: scenarioRequest(await userToken()),
          env: envWith({ STORY_WORKER: binding }),
        });
        expect(response.status).toBe(500);
        expect(await response.json()).toEqual(STORY_UNAVAILABLE);
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(String(errorSpy.mock.calls[0][0])).toContain("STORY_WORKER");
        expect(fallbackCalls).toHaveLength(0);
        await expectNothingCharged();
      });
    }
  });

  describe("fallback provider failure", () => {
    it("returns 502 STORY_UNAVAILABLE when PROVIDER_API_KEY is missing, naming only the variable in the log", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable(), PROVIDER_API_KEY: undefined }),
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual(STORY_UNAVAILABLE);
      expect(errorSpy.mock.calls.flat().join(" ")).toContain("PROVIDER_API_KEY");
      expect(fallbackCalls).toHaveLength(0);
      await expectNothingCharged();
    });

    it("returns 502 STORY_UNAVAILABLE for a non-OK fallback provider reply, logging only its status", async () => {
      stubFallbackProvider(
        () => new Response(JSON.stringify({ error: { message: UPSTREAM_DETAIL } }), { status: 503 }),
      );
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(response.status).toBe(502);
      const text = await response.text();
      expect(JSON.parse(text)).toEqual(STORY_UNAVAILABLE);
      expect(text).not.toContain(UPSTREAM_DETAIL);
      expect(errorSpy).toHaveBeenCalledWith("Scenario fallback provider error:", 503);
      expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
      expect(fallbackCalls).toHaveLength(1);
      await expectNothingCharged();
    });

    const brokenFallback = [
      ["a thrown fallback provider fetch", () => { throw new Error(UPSTREAM_DETAIL); }],
      ["an empty fallback provider content", fallbackReply("")],
      ["a non-string fallback provider content", fallbackReply(null)],
      ["an unparsable fallback provider body", () => new Response(`<html>${UPSTREAM_DETAIL}</html>`, { status: 200 })],
    ];
    for (const [name, respond] of brokenFallback) {
      it(`returns 502 STORY_UNAVAILABLE for ${name} without a charge`, async () => {
        stubFallbackProvider(respond);
        const response = await onRequestPost({
          request: scenarioRequest(await userToken()),
          env: envWith({ STORY_WORKER: primaryUnavailable() }),
        });
        expect(response.status).toBe(502);
        const text = await response.text();
        expect(JSON.parse(text)).toEqual(STORY_UNAVAILABLE);
        expect(text).not.toContain(UPSTREAM_DETAIL);
        expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
        await expectNothingCharged();
      });
    }
  });

  describe("points", () => {
    it("returns 403 INSUFFICIENT_POINTS before calling the story Worker", async () => {
      const poor = await createPointsDb({ points: 0 });
      try {
        const worker = primarySuccess();
        const response = await onRequestPost({
          request: scenarioRequest(await userToken()),
          env: envWith({ DB: poor.db, STORY_WORKER: worker }),
        });
        expect(response.status).toBe(403);
        expect((await response.json()).error).toBe("INSUFFICIENT_POINTS");
        expect(worker.calls).toHaveLength(0);
      } finally {
        await poor.dispose();
      }
    });

    it("returns 503 POINTS_UNAVAILABLE for a charged user without DB before calling the story Worker", async () => {
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ DB: undefined, STORY_WORKER: worker }),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("POINTS_UNAVAILABLE");
      expect(worker.calls).toHaveLength(0);
    });

    it("lets the verified admin without DB reach the story Worker and receive 200", async () => {
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: scenarioRequest(await adminToken()),
        env: envWith({ DB: undefined, STORY_WORKER: worker }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, result: { response: SCENARIO_JSON } });
      expect(worker.calls).toHaveLength(1);
      expect(worker.calls[0].body.userId).toBe("admin-user");
    });

    it("returns 503 POINTS_UNAVAILABLE when charging fails after a primary provider success, without the fallback provider", async () => {
      let batches = 0;
      const flakyDb = {
        prepare: (...args) => fixture.db.prepare(...args),
        batch: async (statements) => {
          batches += 1;
          if (batches > 1) throw new Error(UPSTREAM_DETAIL);
          return fixture.db.batch(statements);
        },
      };
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ DB: flakyDb }),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("POINTS_UNAVAILABLE");
      expect(fallbackCalls).toHaveLength(0);
      await expectNothingCharged();
    });
  });

  it("returns 500 STORY_UNAVAILABLE without the exception message when reading the body throws", async () => {
    const request = new Request("http://localhost/api/scenario", {
      method: "POST",
      headers: { Authorization: `Bearer ${await userToken()}`, "Content-Type": "application/json" },
      body: new ReadableStream({
        start(controller) {
          controller.error(new Error(UPSTREAM_DETAIL));
        },
      }),
      duplex: "half",
    });
    const response = await onRequestPost({ request, env: envWith() });
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(JSON.parse(text)).toEqual(STORY_UNAVAILABLE);
    expect(text).not.toContain(UPSTREAM_DETAIL);
    expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
    await expectNothingCharged();
  });
});
