import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestPost } from "./gemini.js";
import { signJwt } from "./auth/_utils.js";

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

  it("should catch D1 point check error, log it, and continue to process the request", async () => {
    const consoleErrorSpy = mock(() => {});
    console.error = consoleErrorSpy;

    // Mock fetch for the Gemini API call
    globalThis.fetch = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ fake: "response" })
    });

    const token = await signJwt({ sub: "user-123" }, "test-secret");

    const request = new Request("http://localhost", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [],
        systemInstruction: {},
        generationConfig: {}
      })
    });

    const context = {
      request,
      env: {
        GEMINI_API_KEY: "test-key",
        JWT_SECRET: "test-secret",
        DB: {
          prepare: () => {
            throw new Error("Simulated D1 error");
          }
        }
      }
    };

    const response = await onRequestPost(context);

    // Check that it continued and returned 200 OK from Gemini mock
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.fake).toBe("response");

    // Check that console.error was called with the right message
    expect(consoleErrorSpy).toHaveBeenCalled();
    const errorArgs = consoleErrorSpy.mock.calls[0];
    expect(errorArgs[0]).toBe("D1 point check error in gemini.js:");
    expect(errorArgs[1].message).toBe("Simulated D1 error");
  });
});

describe("onRequestPost - Credentials Validation", () => {
  it("should return 501 error when API key is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {}
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(501);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Gemini API key is not configured");
  });
});

describe("onRequestPost - Fetching and Response", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should return 500 when fetch throws an error", async () => {
    const context = {
      request: {
        json: async () => ({ contents: [], systemInstruction: {}, generationConfig: {} })
      },
      env: {
        GEMINI_API_KEY: "test-key"
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
