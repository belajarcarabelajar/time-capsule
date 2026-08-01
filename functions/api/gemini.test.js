import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { onRequestPost } from "./gemini.js";
import { signJwt } from "./auth/_utils.js";

describe("onRequestPost - Gemini - Error Handling", () => {
  let originalFetch;
  let validToken;

  beforeEach(async () => {
    originalFetch = globalThis.fetch;
    validToken = await signJwt({ sub: "testuser" }, "time-capsule-secret-jwt-key-2026-belajarcarabelajar");
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return 401 when user is not authenticated", async () => {
    const context = {
      request: {
        json: async () => ({ contents: [], systemInstruction: {}, generationConfig: {} }),
        headers: new Headers()
      },
      env: {
        VITE_GEMINI_API_KEY: "valid-key",
        JWT_SECRET: "time-capsule-secret-jwt-key-2026-belajarcarabelajar"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(401);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("UNAUTHORIZED");
  });

  it("should return 500 when fetch throws an error", async () => {
    const context = {
      request: {
        json: async () => ({ contents: [], systemInstruction: {}, generationConfig: {} }),
        headers: new Headers({ "Cookie": `auth_token=${validToken}` })
      },
      env: {
        VITE_GEMINI_API_KEY: "valid-key",
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
    expect(body.errors[0].message).toContain("Failed to process Gemini request: Network failure");
  });
});
