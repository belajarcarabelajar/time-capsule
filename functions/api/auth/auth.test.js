import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { onRequestGet as loginHandler } from "./login.js";
import { onRequestGet as callbackHandler } from "./callback.js";

describe("OAuth State Parameter - login.js", () => {
  it("should generate a state parameter, attach state to Google auth URL, and set oauth_state cookie", async () => {
    const context = {
      request: new Request("http://localhost:8788/api/auth/login"),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id.apps.googleusercontent.com",
        GOOGLE_REDIRECT_URI: "http://localhost:8788/api/auth/callback",
      },
    };

    const response = await loginHandler(context);
    expect(response.status).toBe(302);

    const locationHeader = response.headers.get("Location");
    expect(locationHeader).not.toBeNull();

    const redirectUrl = new URL(locationHeader);
    expect(redirectUrl.origin).toBe("https://accounts.google.com");
    expect(redirectUrl.pathname).toBe("/o/oauth2/v2/auth");

    const stateParam = redirectUrl.searchParams.get("state");
    expect(stateParam).toBeTruthy();
    expect(stateParam.length).toBeGreaterThan(10);

    const cookieHeader = response.headers.get("Set-Cookie");
    expect(cookieHeader).not.toBeNull();
    expect(cookieHeader).toContain(`oauth_state=${stateParam}`);
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");
  });
});

describe("OAuth State Parameter Validation - callback.js", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should reject request when state parameter is missing from request URL", async () => {
    const context = {
      request: new Request("http://localhost:8788/api/auth/callback?code=valid-code", {
        headers: {
          Cookie: "oauth_state=secret-state-123",
        },
      }),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
      },
    };

    const response = await callbackHandler(context);
    expect(response.status).toBe(302);

    const location = response.headers.get("Location");
    expect(location).toContain("auth_error=");
    expect(location).toContain("Invalid%20OAuth%20state%20parameter");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("oauth_state=;");
  });

  it("should reject request when oauth_state cookie is missing from request headers", async () => {
    const context = {
      request: new Request("http://localhost:8788/api/auth/callback?code=valid-code&state=secret-state-123"),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
      },
    };

    const response = await callbackHandler(context);
    expect(response.status).toBe(302);

    const location = response.headers.get("Location");
    expect(location).toContain("auth_error=");
    expect(location).toContain("Invalid%20OAuth%20state%20parameter");
  });

  it("should reject request when state parameter does not match stored oauth_state cookie (CSRF attack)", async () => {
    const context = {
      request: new Request("http://localhost:8788/api/auth/callback?code=valid-code&state=attacker-state", {
        headers: {
          Cookie: "oauth_state=victim-state-123",
        },
      }),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
      },
    };

    const response = await callbackHandler(context);
    expect(response.status).toBe(302);

    const location = response.headers.get("Location");
    expect(location).toContain("auth_error=");
    expect(location).toContain("Invalid%20OAuth%20state%20parameter");

    const setCookie = response.headers.get("Set-Cookie");
    expect(setCookie).toContain("oauth_state=;");
  });

  it("should succeed and clear oauth_state cookie when state matches and tokens are exchanged", async () => {
    const validState = "secure-random-state-value-12345";
    const context = {
      request: new Request(`http://localhost:8788/api/auth/callback?code=valid-code&state=${validState}`, {
        headers: {
          Cookie: `oauth_state=${validState}`,
        },
      }),
      env: {
        GOOGLE_CLIENT_ID: "test-client-id",
        GOOGLE_CLIENT_SECRET: "test-client-secret",
        JWT_SECRET: "test-jwt-secret",
      },
    };

    globalThis.fetch = async (url) => {
      if (url === "https://oauth2.googleapis.com/token") {
        return new Response(JSON.stringify({ access_token: "mock-access-token" }), { status: 200 });
      }
      if (url === "https://www.googleapis.com/oauth2/v2/userinfo") {
        return new Response(JSON.stringify({
          id: "google-user-123",
          email: "user@example.com",
          name: "Test User",
        }), { status: 200 });
      }
      return new Response("Not found", { status: 444 });
    };

    const response = await callbackHandler(context);
    expect(response.status).toBe(302);

    const location = response.headers.get("Location");
    expect(location).toBe("http://localhost:8788/?auth_success=1");

    const setCookies = response.headers.getSetCookie ? response.headers.getSetCookie() : [response.headers.get("Set-Cookie")];
    const setCookieString = setCookies.join(", ");

    expect(setCookieString).toContain("auth_token=");
    expect(setCookieString).toContain("oauth_state=;");
  });
});
