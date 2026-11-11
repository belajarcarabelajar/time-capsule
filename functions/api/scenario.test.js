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
    { sub: "admin-user", email: "admin@example.com", verified_email: true },
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

  const GENERATE_ROW = { amount: -10, balance_after: 40, type: "GENERATE_STORY" };
  const REFUND_ROW = { amount: 10, balance_after: 50, type: "REFUND_STORY" };

  async function fixtureLedger() {
    const { results } = await fixture.db
      .prepare("SELECT amount, balance_after, type FROM point_transactions ORDER BY id")
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

  // A provider already returned a model message, so the reservation stands.
  async function expectChargeKept() {
    expect(await fixturePoints()).toBe(40);
    expect(await fixtureStories()).toEqual([]);
    expect(await fixtureLedger()).toEqual([GENERATE_ROW]);
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

  describe("Content-Length precheck", () => {
    const PAYLOAD_TOO_LARGE = {
      success: false,
      error: "PAYLOAD_TOO_LARGE",
      message: "Permintaan cerita terlalu besar.",
    };

    // highWaterMark 0 stops the stream from pulling on its own, so any pull
    // means the handler started reading the body.
    function unreadableBodyRequest(token, contentLength, pulls) {
      const headers = { "Content-Type": "application/json", "Content-Length": contentLength };
      if (token) headers.Authorization = `Bearer ${token}`;
      const body = new ReadableStream(
        {
          pull(controller) {
            pulls.count += 1;
            controller.error(new Error(UPSTREAM_DETAIL));
          },
        },
        { highWaterMark: 0 },
      );
      return new Request("http://localhost/api/scenario", { method: "POST", headers, body, duplex: "half" });
    }

    function declaredLengthRequest(token, contentLength, body = JSON.stringify(scenarioBody)) {
      return new Request("http://localhost/api/scenario", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Content-Length": contentLength,
        },
        body,
      });
    }

    it("rejects an oversized Content-Length header with 413 PAYLOAD_TOO_LARGE without reading the body", async () => {
      const pulls = { count: 0 };
      const worker = primarySuccess();
      const request = unreadableBodyRequest(await userToken(), "999999", pulls);
      expect(request.headers.get("Content-Length")).toBe("999999");
      const response = await onRequestPost({ request, env: envWith({ STORY_WORKER: worker }) });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual(PAYLOAD_TOO_LARGE);
      expect(pulls.count).toBe(0);
      expect(request.bodyUsed).toBe(false);
      expect(worker.calls).toHaveLength(0);
      await expectNothingCharged();
    });

    it("keeps the 401 ahead of the Content-Length precheck for an unauthenticated request", async () => {
      const pulls = { count: 0 };
      const response = await onRequestPost({
        request: unreadableBodyRequest(null, "999999", pulls),
        env: envWith(),
      });
      expect(response.status).toBe(401);
      expect(pulls.count).toBe(0);
    });

    it("accepts a correct small Content-Length header on the primary provider success path", async () => {
      const body = JSON.stringify(scenarioBody);
      const worker = primarySuccess();
      const request = declaredLengthRequest(
        await userToken(),
        String(new TextEncoder().encode(body).length),
        body,
      );
      const response = await onRequestPost({ request, env: envWith({ STORY_WORKER: worker }) });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, result: { response: SCENARIO_JSON } });
      expect(worker.calls).toHaveLength(1);
      expect(await fixturePoints()).toBe(40);
    });

    const fallThrough = [
      ["a non-numeric", "abc"],
      ["an empty", ""],
      ["a fractional", "20000.5"],
      ["a negative", "-1"],
      ["an exactly 16384", "16384"],
    ];
    for (const [name, value] of fallThrough) {
      it(`lets ${name} Content-Length header fall through to the normal parse`, async () => {
        const worker = primarySuccess();
        const request = declaredLengthRequest(await userToken(), value);
        expect(request.headers.get("Content-Length")).toBe(value);
        const response = await onRequestPost({ request, env: envWith({ STORY_WORKER: worker }) });
        expect(response.status).toBe(200);
        expect(worker.calls).toHaveLength(1);
      });
    }

    it("still applies the byte check after reading when a non-numeric header falls through", async () => {
      const worker = primarySuccess();
      const request = declaredLengthRequest(await userToken(), "abc", bodyOfBytes(16385));
      const response = await onRequestPost({ request, env: envWith({ STORY_WORKER: worker }) });
      expect(response.status).toBe(413);
      expect(await response.json()).toEqual(PAYLOAD_TOO_LARGE);
      expect(worker.calls).toHaveLength(0);
      await expectNothingCharged();
    });
  });

  describe("streamed body cap", () => {
    // highWaterMark 0 makes every chunk an explicit pull by the handler.
    function chunkedRequest(token, chunks, seen) {
      let index = 0;
      const body = new ReadableStream(
        {
          pull(controller) {
            if (index >= chunks.length) return controller.close();
            seen.pulls += 1;
            controller.enqueue(chunks[index]);
            index += 1;
          },
          cancel() {
            seen.cancelled = true;
          },
        },
        { highWaterMark: 0 },
      );
      const request = new Request("http://localhost/api/scenario", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body,
        duplex: "half",
      });
      expect(request.headers.get("Content-Length")).toBeNull();
      return request;
    }

    it("stops reading a 40 KB stream without Content-Length once it passes 16384 bytes and answers 413", async () => {
      const seen = { pulls: 0, cancelled: false };
      const chunks = Array.from({ length: 40 }, () => new Uint8Array(1024).fill(120));
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: chunkedRequest(await userToken(), chunks, seen),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(413);
      expect((await response.json()).error).toBe("PAYLOAD_TOO_LARGE");
      // 17 chunks of 1024 bytes are the first to exceed the cap.
      expect(seen.pulls).toBe(17);
      expect(seen.cancelled).toBe(true);
      expect(worker.calls).toHaveLength(0);
      await expectNothingCharged();
    });

    it("decodes a multibyte character split across two chunks of a streamed body", async () => {
      const bytes = new TextEncoder().encode(JSON.stringify({ topic: "Kafé Roma", chapter: 1, history: "" }));
      const split = bytes.indexOf(0xc3) + 1;
      const seen = { pulls: 0, cancelled: false };
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: chunkedRequest(await userToken(), [bytes.slice(0, split), bytes.slice(split)], seen),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(200);
      expect(worker.calls[0].body.topic).toBe("Kafé Roma");
    });

    it("rejects a scenario request without a body with 400 INVALID_REQUEST", async () => {
      const worker = primarySuccess();
      const request = new Request("http://localhost/api/scenario", {
        method: "POST",
        headers: { Authorization: `Bearer ${await userToken()}` },
      });
      expect(request.body).toBeNull();
      const response = await onRequestPost({ request, env: envWith({ STORY_WORKER: worker }) });
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual(INVALID_REQUEST);
      expect(worker.calls).toHaveLength(0);
      await expectNothingCharged();
    });
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
    it("maps a story Worker 422 REFUSED to 422 without the fallback provider and keeps the 10 points", async () => {
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
      await expectChargeKept();
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

    it("returns 502 STORY_UNAVAILABLE for a thrown fallback provider fetch without a charge", async () => {
      stubFallbackProvider(() => {
        throw new Error(UPSTREAM_DETAIL);
      });
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

    const unusableOkFallback = [
      ["an empty fallback provider content", fallbackReply("")],
      ["a non-string fallback provider content", fallbackReply(null)],
      ["an unparsable fallback provider body", () => new Response(`<html>${UPSTREAM_DETAIL}</html>`, { status: 200 })],
    ];
    for (const [name, respond] of unusableOkFallback) {
      it(`returns 502 STORY_UNAVAILABLE for ${name} and keeps the 10 points`, async () => {
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
        await expectChargeKept();
      });
    }

    const primarySpent = () =>
      fakeStoryWorker(502, {
        success: false,
        error: "PRIMARY_UNAVAILABLE",
        reason: "max_tokens",
        tokens_spent: true,
      });

    it("keeps the 10 points when the primary provider spent tokens and the fallback provider answers non-OK", async () => {
      stubFallbackProvider(() => new Response("{}", { status: 503 }));
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primarySpent() }),
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual(STORY_UNAVAILABLE);
      expect(fallbackCalls).toHaveLength(1);
      await expectChargeKept();
    });

    it("keeps the 10 points when the primary provider spent tokens and PROVIDER_API_KEY is missing", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primarySpent(), PROVIDER_API_KEY: undefined }),
      });
      expect(response.status).toBe(502);
      expect(fallbackCalls).toHaveLength(0);
      await expectChargeKept();
    });

    it("refunds when the primary provider spent no tokens and the fallback provider fetch throws", async () => {
      stubFallbackProvider(() => {
        throw new Error(UPSTREAM_DETAIL);
      });
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({
          STORY_WORKER: fakeStoryWorker(502, {
            success: false,
            error: "PRIMARY_UNAVAILABLE",
            reason: "unknown",
          }),
        }),
      });
      expect(response.status).toBe(502);
      await expectNothingCharged();
      expect(await fixtureLedger()).toEqual([GENERATE_ROW, REFUND_ROW]);
    });

    const finishedReply = (content, finishReason) => () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { role: "assistant", content }, finish_reason: finishReason }],
        }),
        { status: 200 },
      );
    const unusableFallback = [
      ["a fallback provider reply truncated with finish_reason length", finishedReply(SCENARIO_JSON, "length"), "truncated"],
      ["a fallback provider content that is not JSON", finishedReply(`{"meta": ${UPSTREAM_DETAIL}`, "stop"), "invalid_json"],
    ];
    for (const [name, respond, reason] of unusableFallback) {
      it(`returns 502 STORY_UNAVAILABLE for ${name} and keeps the 10 points, logging only a reason code`, async () => {
        stubFallbackProvider(respond);
        const response = await onRequestPost({
          request: scenarioRequest(await userToken()),
          env: envWith({ STORY_WORKER: primaryUnavailable() }),
        });
        expect(response.status).toBe(502);
        const text = await response.text();
        expect(JSON.parse(text)).toEqual(STORY_UNAVAILABLE);
        expect(text).not.toContain(UPSTREAM_DETAIL);
        expect(errorSpy).toHaveBeenCalledWith("Scenario fallback provider output rejected:", reason);
        expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
        expect(fallbackCalls).toHaveLength(1);
        await expectChargeKept();
      });
    }

    it("accepts a complete fallback provider reply with finish_reason stop", async () => {
      stubFallbackProvider(finishedReply(SCENARIO_JSON, "stop"));
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(response.status).toBe(200);
      expect(await fixturePoints()).toBe(40);
    });
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
        env: envWith({ DB: undefined, STORY_WORKER: worker, ADMIN_EMAILS: "admin@example.com" }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true, result: { response: SCENARIO_JSON } });
      expect(worker.calls).toHaveLength(1);
      expect(worker.calls[0].body.userId).toBe("admin-user");
    });

    it("returns 503 POINTS_UNAVAILABLE for a session without a user row before calling the story Worker", async () => {
      const worker = primarySuccess();
      const response = await onRequestPost({
        request: scenarioRequest(await signJwt({ sub: "absent-user" }, JWT_SECRET)),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("POINTS_UNAVAILABLE");
      expect(worker.calls).toHaveLength(0);
      expect(await fixtureLedger()).toEqual([]);
    });

    it("returns 503 POINTS_UNAVAILABLE and keeps the 10 points when saving the story fails after a primary provider success, without the fallback provider", async () => {
      await fixture.db
        .prepare("CREATE TRIGGER fail_story BEFORE INSERT ON stories BEGIN SELECT RAISE(ABORT, 'injected'); END")
        .run();
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith(),
      });
      expect(response.status).toBe(503);
      expect((await response.json()).error).toBe("POINTS_UNAVAILABLE");
      expect(fallbackCalls).toHaveLength(0);
      await expectChargeKept();
    });
  });

  describe("point reservation", () => {

    // Holds its reply until release() so the test can look at the balance
    // while the story Worker call is still pending.
    function heldStoryWorker() {
      const calls = [];
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      return {
        calls,
        release,
        fetch: async (url, init) => {
          calls.push({ url, init });
          await gate;
          return new Response(
            JSON.stringify({ success: true, provider: "claude", response: SCENARIO_JSON }),
            { status: 200 },
          );
        },
      };
    }

    async function waitForCalls(worker, wanted) {
      for (let tries = 0; tries < 400 && worker.calls.length < wanted; tries += 1) {
        await new Promise((resolve) => setTimeout(resolve, 5));
      }
    }

    it("holds 10 points with a GENERATE_STORY ledger row while the story Worker reply is pending", async () => {
      const worker = heldStoryWorker();
      const pending = onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: worker }),
      });
      await waitForCalls(worker, 1);
      expect(worker.calls).toHaveLength(1);
      expect(await fixturePoints()).toBe(40);
      expect(await fixtureLedger()).toEqual([GENERATE_ROW]);
      expect(await fixtureStories()).toEqual([]);
      worker.release();
      expect((await pending).status).toBe(200);
      expect(await fixturePoints()).toBe(40);
      expect(await fixtureLedger()).toEqual([GENERATE_ROW]);
      expect(await fixtureStories()).toHaveLength(1);
    });

    it("lets two parallel scenario requests with 10 points reach the story Worker once and answers the other 403", async () => {
      await fixture.db.prepare("UPDATE users SET points = 10").run();
      const worker = heldStoryWorker();
      const env = envWith({ STORY_WORKER: worker });
      const token = await userToken();
      const both = Promise.all([
        onRequestPost({ request: scenarioRequest(token), env }),
        onRequestPost({ request: scenarioRequest(token), env }),
      ]);
      await waitForCalls(worker, 2);
      await new Promise((resolve) => setTimeout(resolve, 100));
      worker.release();
      const statuses = (await both).map((response) => response.status).sort();
      expect(statuses).toEqual([200, 403]);
      expect(worker.calls).toHaveLength(1);
      expect(await fixturePoints()).toBe(0);
      expect(await fixtureStories()).toHaveLength(1);
    });

    it("returns the balance to its start with a REFUND_STORY ledger row after a story Worker 502", async () => {
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: fakeStoryWorker(502, { success: false, error: "BAD_GATEWAY" }) }),
      });
      expect(response.status).toBe(502);
      await expectNothingCharged();
      expect(await fixtureLedger()).toEqual([GENERATE_ROW, REFUND_ROW]);
    });

    it("refunds after a fallback provider failure", async () => {
      stubFallbackProvider(() => new Response("{}", { status: 503 }));
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: primaryUnavailable() }),
      });
      expect(response.status).toBe(502);
      await expectNothingCharged();
      expect(await fixtureLedger()).toEqual([GENERATE_ROW, REFUND_ROW]);
    });

    it("refunds after an unexpected error behind the reservation and answers 500", async () => {
      const worker = {
        fetch: async () => ({
          get status() {
            throw new Error(UPSTREAM_DETAIL);
          },
          json: async () => ({}),
        }),
      };
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual(STORY_UNAVAILABLE);
      expect(loggedText()).not.toContain(UPSTREAM_DETAIL);
      await expectNothingCharged();
      expect(await fixtureLedger()).toEqual([GENERATE_ROW, REFUND_ROW]);
    });

    it("never refunds above max_points when a daily reset ran during the story Worker call", async () => {
      const worker = {
        fetch: async () => {
          await fixture.db.prepare("UPDATE users SET points = max_points").run();
          return new Response(JSON.stringify({ success: false, error: "BAD_GATEWAY" }), { status: 502 });
        },
      };
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: worker }),
      });
      expect(response.status).toBe(502);
      expect(await fixturePoints()).toBe(50);
      expect(await fixtureLedger()).toEqual([
        GENERATE_ROW,
        { amount: 0, balance_after: 50, type: "REFUND_STORY" },
      ]);
    });

    it("keeps the points spent and logs only a reason code when the refund itself fails", async () => {
      await fixture.db
        .prepare(
          "CREATE TRIGGER fail_refund BEFORE INSERT ON point_transactions WHEN NEW.type = 'REFUND_STORY' BEGIN SELECT RAISE(ABORT, 'injected'); END",
        )
        .run();
      const response = await onRequestPost({
        request: scenarioRequest(await userToken()),
        env: envWith({ STORY_WORKER: fakeStoryWorker(502, { success: false, error: "BAD_GATEWAY" }) }),
      });
      expect(response.status).toBe(502);
      expect(await response.json()).toEqual(STORY_UNAVAILABLE);
      expect(await fixturePoints()).toBe(40);
      expect(await fixtureLedger()).toEqual([GENERATE_ROW]);
      expect(errorSpy).toHaveBeenCalledWith("Point refund failed:", "refund_unavailable");
      expect(loggedText()).not.toContain("injected");
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
