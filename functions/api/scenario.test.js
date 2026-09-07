import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { onRequestPost } from "./scenario.js";
import { signJwt } from "./auth/_utils.js";
import { createPointsDb } from "./test-support/pointsDb.js";

async function authenticatedRequest() {
  const token = await signJwt(
    { sub: "credential-test-user" },
    "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
  );
  return new Request("http://localhost", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

describe("onRequestPost - Credentials Validation", () => {
  it("should return 500 error when env is completely empty", async () => {
    const context = {
      request: await authenticatedRequest(),
      env: {
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
      },
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("AgentRouter API key");
  });

  it("should return 500 when only unrelated variables are present", async () => {
    const context = {
      request: await authenticatedRequest(),
      env: {
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
        GOOGLE_CLIENT_ID: "client-id-present",
      },
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.errors[0].message).toContain("AGENTROUTER_API_KEY");
  });

  it("rejects unauthenticated requests before checking provider credentials", async () => {
    const response = await onRequestPost({
      request: new Request("http://localhost"),
      env: {},
    });
    expect(response.status).toBe(401);
  });
});

describe("onRequestPost - Error Handling", () => {
  let originalFetch;
  let validToken;
  let fixture;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    validToken = await signJwt(
      { sub: "google-user" },
      "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
    );
    fixture = await createPointsDb();
  });

  it("allows the verified admin to reach the AgentRouter provider without D1 quota state", async () => {
    const adminToken = await signJwt(
      {
        sub: "admin-user",
        email: "kurniawaniwan7906@gmail.com",
        verified_email: true,
      },
      "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
    );
    const headers = new Map([["Authorization", `Bearer ${adminToken}`]]);
    globalThis.fetch = async (url, init) => {
      expect(url).toBe("https://agentrouter.org/v1/chat/completions");
      expect(init.headers.Authorization).toBe("Bearer valid-agentrouter-key");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { role: "assistant", content: "{}" } }],
        }),
      };
    };
    const response = await onRequestPost({
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: { get: (key) => headers.get(key) },
      },
      env: {
        AGENTROUTER_API_KEY: "valid-agentrouter-key",
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
      },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ success: true, result: { response: "{}" } });
  });

  afterEach(async () => {
    globalThis.fetch = originalFetch;
    await fixture.dispose();
  });

  it("propagates the provider status and body when AgentRouter responds with an error", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    globalThis.fetch = async () => ({
      ok: false,
      status: 502,
      json: async () => ({ error: { message: "upstream failure" } }),
    });
    const response = await onRequestPost({
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: { get: (key) => headers.get(key) },
      },
      env: {
        AGENTROUTER_API_KEY: "valid-agentrouter-key",
        DB: fixture.db,
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
      },
    });
    expect(response.status).toBe(502);
    const body = await response.json();
    expect(body.error.message).toBe("upstream failure");
  });

  it("should return 500 when request body contains invalid JSON", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => {
          throw new Error("Invalid JSON");
        },
        headers: {
          get: (key) => headers.get(key),
        },
      },
      env: {
        AGENTROUTER_API_KEY: "valid-agentrouter-key",
        DB: fixture.db,
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
      },
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain(
      "Failed to process AI request: Invalid JSON",
    );
  });

  it("should return 500 when fetch throws an error", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: {
          get: (key) => headers.get(key),
        },
      },
      env: {
        AGENTROUTER_API_KEY: "valid-agentrouter-key",
        DB: fixture.db,
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
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
      "Failed to process AI request: Network failure",
    );
  });

  it("should return 500 when response.json() throws an error", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: {
          get: (key) => headers.get(key),
        },
      },
      env: {
        AGENTROUTER_API_KEY: "valid-agentrouter-key",
        DB: fixture.db,
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar",
      },
    };

    globalThis.fetch = async () => ({
      status: 200,
      json: async () => {
        throw new Error("Failed to parse response body");
      },
    });

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain(
      "Failed to process AI request: Failed to parse response body",
    );
  });
});
