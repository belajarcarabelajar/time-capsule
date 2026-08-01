import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestGet } from "./callback.js";
import { verifyJwt } from "./_utils.js";

describe("onRequestGet - Auth Callback", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should redirect to error if code is missing", async () => {
    const request = new Request("http://localhost/api/auth/callback");
    const context = { request, env: {} };

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=No%20code%20provided");
  });

  it("should redirect to error if error param is present", async () => {
    const request = new Request("http://localhost/api/auth/callback?error=access_denied&code=123");
    const context = { request, env: {} };

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=access_denied");
  });

  it("should handle token exchange failure", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");
    const context = { request, env: {} };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: false,
          json: async () => ({ error_description: "Invalid code" })
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=Invalid%20code");
  });

  it("should handle user profile fetch failure", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");
    const context = { request, env: {} };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" })
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: false,
          json: async () => ({})
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=Failed to fetch user profile");
  });

  it("should succeed and set cookie without DB configured", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");
    const context = {
      request,
      env: { JWT_SECRET: "test_secret" }
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" })
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "user123", email: "test@test.com", name: "Test User" })
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_success=1");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("auth_token=");

    const token = setCookie.match(/auth_token=([^;]+)/)[1];
    const payload = await verifyJwt(token, "test_secret");
    expect(payload.sub).toBe("user123");
    expect(payload.name).toBe("Test User");
  });

  it("should insert new user and audit log when DB is configured and user is new", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");

    let executedQueries = [];

    const dbMock = {
      prepare: (query) => ({
        bind: (...args) => ({
          first: async () => {
            if (query.includes("SELECT id, points")) return null; // User not found
            return null;
          },
          run: async () => {
            executedQueries.push({ query, args });
            return { success: true };
          }
        })
      })
    };

    const context = {
      request,
      env: { JWT_SECRET: "test_secret", DB: dbMock }
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" })
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "user123", email: "test@test.com", name: "Test User" })
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_success=1");

    expect(executedQueries.some(q => q.query.includes("INSERT INTO users"))).toBe(true);
    expect(executedQueries.some(q => q.query.includes("INSERT INTO point_transactions"))).toBe(true);
    expect(executedQueries.some(q => q.query.includes("INSERT INTO auth_audit_logs"))).toBe(true);
  });

  it("should update existing user when DB is configured and user exists", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");

    let executedQueries = [];

    const dbMock = {
      prepare: (query) => ({
        bind: (...args) => ({
          first: async () => {
            if (query.includes("SELECT id, points")) return { id: "user123", points: 100, last_point_reset: "2024-01-01" };
            return null;
          },
          run: async () => {
            executedQueries.push({ query, args });
            return { success: true };
          }
        })
      })
    };

    const context = {
      request,
      env: { JWT_SECRET: "test_secret", DB: dbMock }
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" })
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "user123", email: "test@test.com", name: "Test User" })
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_success=1");

    expect(executedQueries.some(q => q.query.includes("UPDATE users SET"))).toBe(true);
    expect(executedQueries.some(q => q.query.includes("INSERT INTO auth_audit_logs"))).toBe(true);
  });

  it("should gracefully handle DB errors and still authenticate", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");

    const dbMock = {
      prepare: (query) => {
        throw new Error("Simulated DB connection error");
      }
    };

    const context = {
      request,
      env: { JWT_SECRET: "test_secret", DB: dbMock }
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" })
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "user123", email: "test@test.com", name: "Test User" })
        };
      }
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_success=1");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("auth_token=");
  });

  it("should catch general errors and redirect to error", async () => {
    const request = new Request("http://localhost/api/auth/callback?code=123");
    const context = {
      request,
      env: { JWT_SECRET: "test_secret" }
    };

    globalThis.fetch = mock(async (url) => {
      throw new Error("Simulated fetch network error");
    });

    const response = await onRequestGet(context);
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=Authentication%20failed");
  });
});
