import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestGet } from "./callback.js";
import { verifyJwt } from "./_utils.js";

describe("onRequestGet - Auth Callback", () => {
  let originalFetch;

  const TEST_STATE = "test-state-value-123456";

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  // Helper that produces a request that passes OAuth state validation:
  // the `state` URL param matches the `oauth_state` cookie set by login.js.
  const createBaseContext = (urlParams = "?code=test-code") => {
    const params = new URLSearchParams(urlParams);
    params.set("state", TEST_STATE);
    return {
      request: new Request(
        `http://localhost/api/auth/callback?${params.toString()}`,
        {
          headers: new Headers({
            Cookie: `oauth_state=${TEST_STATE}`,
            "CF-Connecting-IP": "192.168.1.1",
            "CF-IPCountry": "ID",
            "User-Agent": "TestAgent/1.0",
          }),
        },
      ),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        JWT_SECRET: "test-jwt-secret",
      },
    };
  };

  // OAuth state parameter validation (CSRF protection)
  it("should reject request when state parameter is missing from the URL", async () => {
    const request = new Request(
      "http://localhost/api/auth/callback?code=test-code",
      {
        headers: { Cookie: `oauth_state=${TEST_STATE}` },
      },
    );
    const context = { request, env: {} };

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("auth_error=");
    expect(response.headers.get("Location")).toContain(
      "Invalid%20OAuth%20state%20parameter",
    );
  });

  it("should reject request when oauth_state cookie is missing", async () => {
    const request = new Request(
      `http://localhost/api/auth/callback?code=test-code&state=${TEST_STATE}`,
    );
    const context = { request, env: {} };

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      "Invalid%20OAuth%20state%20parameter",
    );
  });

  it("should reject request when state does not match the oauth_state cookie (CSRF attack)", async () => {
    const request = new Request(
      "http://localhost/api/auth/callback?code=test-code&state=attacker-state",
      {
        headers: { Cookie: `oauth_state=${TEST_STATE}` },
      },
    );
    const context = { request, env: {} };

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      "Invalid%20OAuth%20state%20parameter",
    );
  });

  it("should redirect with error if error param is present", async () => {
    const context = createBaseContext("?error=access_denied");
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=access_denied",
    );
  });

  it("should redirect with error if no code is provided", async () => {
    const context = createBaseContext("?");
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=No%20code%20provided",
    );
  });

  it("should handle token exchange failure", async () => {
    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: false,
          json: async () => ({ error_description: "Invalid code" }),
        };
      }
    });

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=Invalid%20code",
    );
  });

  it("should handle user profile fetch failure", async () => {
    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: false,
          json: async () => ({}),
        };
      }
    });

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=Failed%20to%20fetch%20user%20profile",
    );
  });

  it("should succeed and set a signed JWT cookie when DB is not configured", async () => {
    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "user123",
            email: "test@test.com",
            name: "Test User",
          }),
        };
      }
    });

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("auth_token=");

    const token = setCookie.match(/auth_token=([^;]+)/)[1];
    const payload = await verifyJwt(token, "test-jwt-secret");
    expect(payload.sub).toBe("user123");
    expect(payload.name).toBe("Test User");
  });

  it("should insert new user and audit log when DB is configured and user is new", async () => {
    let executedQueries = [];

    const dbMock = {
      prepare: (query) => ({
        bind: (...args) => ({
          first: async () => null, // Simulate new user
          run: async () => {
            executedQueries.push({ query, args });
            return { success: true };
          },
        }),
      }),
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "user123",
            email: "test@test.com",
            name: "Test User",
          }),
        };
      }
    });

    const context = createBaseContext();
    context.env.DB = dbMock;

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );

    expect(
      executedQueries.some((q) => q.query.includes("INSERT INTO users")),
    ).toBe(true);
    expect(
      executedQueries.some((q) =>
        q.query.includes("INSERT INTO point_transactions"),
      ),
    ).toBe(true);

    const insertAuditCall = executedQueries.find((q) =>
      q.query.includes("INSERT INTO auth_audit_logs"),
    );
    expect(insertAuditCall).toBeTruthy();
    expect(insertAuditCall.args[2]).toBe("192.168.1.1"); // IP Address
  });

  it("should update existing user when DB is configured and user exists", async () => {
    let executedQueries = [];

    const dbMock = {
      prepare: (query) => ({
        bind: (...args) => ({
          first: async () => {
            if (query.includes("SELECT id, points")) {
              return {
                id: "user123",
                points: 100,
                last_point_reset: "2024-01-01",
              };
            }
            return null;
          },
          run: async () => {
            executedQueries.push({ query, args });
            return { success: true };
          },
        }),
      }),
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "user123",
            email: "test@test.com",
            name: "Test User Updated",
          }),
        };
      }
    });

    const context = createBaseContext();
    context.env.DB = dbMock;

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );

    expect(
      executedQueries.some((q) => q.query.includes("UPDATE users SET")),
    ).toBe(true);
    expect(
      executedQueries.some((q) =>
        q.query.includes("INSERT INTO auth_audit_logs"),
      ),
    ).toBe(true);
  });

  it("should gracefully handle DB errors and still authenticate", async () => {
    const originalConsoleError = console.error;
    const consoleErrorSpy = mock(() => {});
    console.error = consoleErrorSpy;

    const dbMock = {
      prepare: () => {
        throw new Error("Simulated DB connection error");
      },
    };

    globalThis.fetch = mock(async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "valid_token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "user123", email: "test@test.com" }),
        };
      }
    });

    const context = createBaseContext();
    context.env.DB = dbMock;

    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=");

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();
    const loggedArgs = consoleErrorSpy.mock.calls[0];
    expect(loggedArgs[0]).toBe("Database sync error during authentication:");
    expect(loggedArgs[1].message).toBe("Simulated DB connection error");

    console.error = originalConsoleError;
  });

  it("should catch general errors and redirect to error", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("Simulated fetch network error");
    });

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain(
      "auth_error=Authentication%20failed",
    );
  });
});
