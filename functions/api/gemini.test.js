import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestPost } from "./gemini.js";
import { signJwt } from "./auth/_utils.js";
import { createPointsDb } from "./test-support/pointsDb.js";

describe("onRequestPost - D1 Error Handling", () => {
  let originalFetch;
  let originalConsoleError;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    originalConsoleError = console.error;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  });

  it("rejects unavailable accounting before calling the provider", async () => {
    const consoleErrorSpy = mock(() => {});
    console.error = consoleErrorSpy;

    // Mock fetch for the Gemini API call
    globalThis.fetch = mock(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ fake: "response" }),
    }));

    const token = await signJwt({ sub: "user-123" }, "test-secret");

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [],
        systemInstruction: {},
        generationConfig: {},
      }),
    });

    const context = {
      request,
      env: {
        GEMINI_API_KEY: "test-key",
        JWT_SECRET: "test-secret",
        DB: {
          prepare: () => {
            throw new Error("Simulated D1 error");
          },
        },
      },
    };

    const response = await onRequestPost(context);

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.error).toBe("POINTS_UNAVAILABLE");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated requests before checking provider credentials", async () => {
    const response = await onRequestPost({
      request: new Request("http://localhost"),
      env: {},
    });
    expect(response.status).toBe(401);
  });

  it("allows the verified admin to reach Gemini without D1 quota state", async () => {
    const provider = mock(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{}" }] } }],
      }),
    }));
    globalThis.fetch = provider;
    const token = await signJwt(
      {
        sub: "admin-user",
        email: "KURNIAWANIWAN7906@GMAIL.COM",
        verified_email: true,
      },
      "test-secret",
    );
    const response = await onRequestPost({
      request: new Request("http://localhost", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: [] }),
      }),
      env: { GEMINI_API_KEY: "test-key", JWT_SECRET: "test-secret" },
    });
    expect(response.status).toBe(200);
    expect(provider).toHaveBeenCalledTimes(1);
  });
});

describe("onRequestPost - Credentials Validation", () => {
  it("should return 501 error when API key is missing", async () => {
    const token = await signJwt({ sub: "credential-test-user" }, "test-secret");
    const context = {
      request: new Request("http://localhost", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      env: { JWT_SECRET: "test-secret" },
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(501);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain(
      "Gemini API key is not configured",
    );
  });
});

describe("onRequestPost - Fetching and Response", () => {
  let originalFetch;
  let fixture;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    fixture = await createPointsDb();
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await fixture.dispose();
  });

  it("should return 500 when fetch throws an error", async () => {
    const token = await signJwt({ sub: "google-user" }, "test-secret");
    const headers = new Map();
    headers.set("authorization", `Bearer ${token}`);

    const context = {
      request: {
        json: async () => ({
          contents: [],
          systemInstruction: {},
          generationConfig: {},
        }),
        headers: {
          get: (key) => headers.get(key.toLowerCase()),
        },
      },
      env: {
        GEMINI_API_KEY: "test-key",
        DB: fixture.db,
        JWT_SECRET: "test-secret",
      },
    };

    globalThis.fetch = async () => {
      throw new Error("Network failure");
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain(
      "Failed to process Gemini request: Network failure",
    );
  });
});
