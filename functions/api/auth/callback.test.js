import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestGet } from "./callback.js";
import * as utils from "./_utils.js";

describe("onRequestGet - Auth Callback", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const createBaseContext = (urlParams = "?code=test-code") => ({
    request: new Request(`http://localhost${urlParams}`, {
      headers: new Headers({
        "CF-Connecting-IP": "192.168.1.1",
        "CF-IPCountry": "ID",
        "User-Agent": "TestAgent/1.0",
      }),
    }),
    env: {
      GOOGLE_CLIENT_ID: "test-client-id",
      GOOGLE_CLIENT_SECRET: "test-client-secret",
      JWT_SECRET: "test-jwt-secret",
    },
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

  it("should redirect with error if token exchange fails", async () => {
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: false,
          json: async () => ({ error_description: "Invalid code" }),
        };
      }
    };

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=Invalid%20code",
    );
  });

  it("should redirect with error if fetching user profile fails", async () => {
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "fake-access-token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: false,
          json: async () => ({}),
        };
      }
    };

    const context = createBaseContext();
    const response = await onRequestGet(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_error=Failed to fetch user profile",
    );
  });

  it("should authenticate, sync new user to DB, and set cookie", async () => {
    // Mock Fetch
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "fake-access-token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "google-123",
            email: "test@example.com",
            name: "Test User",
            verified_email: true,
          }),
        };
      }
    };

    // Mock DB
    const dbStatements = [];
    const dbMock = {
      prepare: (query) => {
        const stmt = {
          query,
          params: [],
          bind: (...args) => {
            stmt.params = args;
            return stmt;
          },
          first: async () => {
            dbStatements.push({ action: "first", query, params: stmt.params });
            if (query.includes("SELECT id, points")) {
              return null; // Simulate new user
            }
            return null;
          },
          run: async () => {
            dbStatements.push({ action: "run", query, params: stmt.params });
          },
        };
        return stmt;
      },
    };

    const context = createBaseContext();
    context.env.DB = dbMock;

    const response = await onRequestGet(context);

    // Verify Redirect & Cookie
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain("auth_token=");
    expect(setCookie).toContain("HttpOnly");

    // Verify DB Operations
    const selectCall = dbStatements.find((s) =>
      s.query.includes("SELECT id, points"),
    );
    expect(selectCall).toBeTruthy();
    expect(selectCall.params[0]).toBe("google-123");

    const insertUserCall = dbStatements.find((s) =>
      s.query.includes("INSERT INTO users"),
    );
    expect(insertUserCall).toBeTruthy();
    expect(insertUserCall.params[1]).toBe("google-123"); // google_id

    const insertPointsCall = dbStatements.find((s) =>
      s.query.includes("INSERT INTO point_transactions"),
    );
    expect(insertPointsCall).toBeTruthy();

    const insertAuditCall = dbStatements.find((s) =>
      s.query.includes("INSERT INTO auth_audit_logs"),
    );
    expect(insertAuditCall).toBeTruthy();
    expect(insertAuditCall.params[2]).toBe("192.168.1.1"); // IP Address
  });

  it("should authenticate, update existing user in DB, and set cookie", async () => {
    // Mock Fetch
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "fake-access-token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({
            id: "google-123",
            email: "test@example.com",
            name: "Test User Updated",
          }),
        };
      }
    };

    // Mock DB
    const dbStatements = [];
    const dbMock = {
      prepare: (query) => {
        const stmt = {
          query,
          params: [],
          bind: (...args) => {
            stmt.params = args;
            return stmt;
          },
          first: async () => {
            dbStatements.push({ action: "first", query, params: stmt.params });
            if (query.includes("SELECT id, points")) {
              return { id: "google-123", points: 50 }; // Simulate existing user
            }
            return null;
          },
          run: async () => {
            dbStatements.push({ action: "run", query, params: stmt.params });
          },
        };
        return stmt;
      },
    };

    const context = createBaseContext();
    context.env.DB = dbMock;

    const response = await onRequestGet(context);

    // Verify Redirect
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );

    // Verify DB Operations
    const updateUserCall = dbStatements.find((s) =>
      s.query.includes("UPDATE users SET"),
    );
    expect(updateUserCall).toBeTruthy();
    expect(updateUserCall.params[8]).toBe("google-123"); // google_id

    const insertAuditCall = dbStatements.find((s) =>
      s.query.includes("INSERT INTO auth_audit_logs"),
    );
    expect(insertAuditCall).toBeTruthy();
  });

  it("should ignore DB errors and still authenticate successfully", async () => {
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "fake-access-token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "google-123", email: "test@example.com" }),
        };
      }
    };

    const context = createBaseContext();
    context.env.DB = {
      prepare: () => {
        throw new Error("DB Error");
      },
    };

    const response = await onRequestGet(context);

    // It should still succeed
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=");
  });

  it("should authenticate successfully when DB is not configured", async () => {
    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return {
          ok: true,
          json: async () => ({ access_token: "fake-access-token" }),
        };
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return {
          ok: true,
          json: async () => ({ id: "google-123", email: "test@example.com" }),
        };
      }
    };

    const context = createBaseContext();
    // env.DB is implicitly undefined in createBaseContext

    const response = await onRequestGet(context);

    // It should succeed without DB sync
    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe(
      "http://localhost/?auth_success=1",
    );
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=");
  });
});
