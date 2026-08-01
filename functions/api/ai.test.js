import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { onRequestPost } from "./ai.js";
import { signJwt } from "./auth/_utils.js";

describe("onRequestPost - Credentials Validation", () => {
  it("should return 500 error when env is completely empty", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {}
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Cloudflare credentials");
  });

  it("should return 500 error when only VITE_CF_API_TOKEN is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        VITE_CF_ACCOUNT_ID: "account-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only VITE_CF_ACCOUNT_ID is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        VITE_CF_API_TOKEN: "token-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only CF_API_TOKEN is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        CF_ACCOUNT_ID: "account-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only CF_ACCOUNT_ID is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        CF_API_TOKEN: "token-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });
});

describe("onRequestPost - Error Handling", () => {
  let originalFetch;
  let validToken;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    validToken = await signJwt({ sub: "test-user" }, "time-capsule-secret-jwt-key-2026-belajarcarabelajar");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return 500 when request body contains invalid JSON", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => { throw new Error("Invalid JSON"); },
        headers: {
          get: (key) => headers.get(key)
        }
      },
      env: {
        VITE_CF_API_TOKEN: "valid-token",
        VITE_CF_ACCOUNT_ID: "valid-account",
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Failed to process AI request: Invalid JSON");
  });

  it("should return 500 when fetch throws an error", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: {
          get: (key) => headers.get(key)
        }
      },
      env: {
        VITE_CF_API_TOKEN: "valid-token",
        VITE_CF_ACCOUNT_ID: "valid-account",
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar"
      }
    };

    globalThis.fetch = async () => {
      throw new Error("Network failure");
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Failed to process AI request: Network failure");
  });

  it("should return 500 when response.json() throws an error", async () => {
    const headers = new Map();
    headers.set("Authorization", `Bearer ${validToken}`);
    const context = {
      request: {
        json: async () => ({ messages: [], response_format: {} }),
        headers: {
          get: (key) => headers.get(key)
        }
      },
      env: {
        VITE_CF_API_TOKEN: "valid-token",
        VITE_CF_ACCOUNT_ID: "valid-account",
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar"
      }
    };

    globalThis.fetch = async () => ({
      status: 200,
      json: async () => { throw new Error("Failed to parse response body"); }
    });

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Failed to process AI request: Failed to parse response body");
  });
});
