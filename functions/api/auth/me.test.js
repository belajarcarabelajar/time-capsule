import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestGet } from "./me.js";
import { signJwt } from "./_utils.js";

describe("onRequestGet - me.js", () => {
  const jwtSecret = "test-secret-123";
  let originalConsoleError;

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = mock(() => {});
  });

  afterEach(() => {
    console.error = originalConsoleError;
  });

  const createMockDb = (firstResult = null, runFn = () => {}) => {
    return {
      prepare: mock((query) => {
        return {
          bind: mock((...params) => {
            return {
              first: mock(async () => firstResult),
              run: mock(async () => runFn()),
            };
          }),
        };
      }),
    };
  };

  it("should return authenticated: false when no token is provided", async () => {
    const context = {
      request: new Request("http://localhost/api/auth/me"),
      env: { JWT_SECRET: jwtSecret },
    };

    const response = await onRequestGet(context);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ authenticated: false, user: null });
  });

  it("should return authenticated: false when an invalid token is provided", async () => {
    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Cookie: "auth_token=invalid.token.here" }
      }),
      env: { JWT_SECRET: jwtSecret },
    };

    const response = await onRequestGet(context);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json).toEqual({ authenticated: false, user: null });
  });

  it("should authenticate successfully when valid token is in cookies (no DB)", async () => {
    const payload = { sub: "user-123", email: "test@example.com", name: "Test User", picture: "pic.png" };
    const token = await signJwt(payload, jwtSecret);

    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Cookie: `auth_token=${token}` }
      }),
      env: { JWT_SECRET: jwtSecret },
    };

    const response = await onRequestGet(context);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.authenticated).toBe(true);
    expect(json.user.id).toBe("user-123");
    expect(json.user.points).toBe(50);
    expect(json.user.maxPoints).toBe(50);
    expect(json.user.nextResetAt).toBeDefined();
  });

  it("should authenticate successfully when valid token is in Authorization header", async () => {
    const payload = { sub: "user-123", email: "test@example.com", name: "Test User", picture: "pic.png" };
    const token = await signJwt(payload, jwtSecret);

    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` }
      }),
      env: { JWT_SECRET: jwtSecret },
    };

    const response = await onRequestGet(context);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.authenticated).toBe(true);
    expect(json.user.id).toBe("user-123");
  });

  it("should fetch points from DB when available without resetting if recently reset", async () => {
    const payload = { sub: "user-123", email: "test@example.com", name: "Test User", picture: "pic.png" };
    const token = await signJwt(payload, jwtSecret);
    const todayStr = new Date().toISOString().split("T")[0];

    const mockDb = createMockDb({ points: 30, max_points: 100, last_point_reset: todayStr });

    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Cookie: `auth_token=${token}` }
      }),
      env: { JWT_SECRET: jwtSecret, DB: mockDb },
    };

    const response = await onRequestGet(context);
    const json = await response.json();

    expect(json.authenticated).toBe(true);
    expect(json.user.points).toBe(30);
    expect(json.user.maxPoints).toBe(100);
  });

  it("should perform lazy daily reset if last_point_reset is in the past", async () => {
    const payload = { sub: "user-123", email: "test@example.com", name: "Test User", picture: "pic.png" };
    const token = await signJwt(payload, jwtSecret);

    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastStr = pastDate.toISOString().split("T")[0];

    const mockDb = createMockDb({ points: 10, max_points: 100, last_point_reset: pastStr });

    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Cookie: `auth_token=${token}` }
      }),
      env: { JWT_SECRET: jwtSecret, DB: mockDb },
    };

    const response = await onRequestGet(context);
    const json = await response.json();

    expect(json.authenticated).toBe(true);
    expect(json.user.points).toBe(100); // Should be reset to maxPoints
    expect(json.user.maxPoints).toBe(100);
  });

  it("should handle D1 database errors gracefully without failing", async () => {
    const payload = { sub: "user-123", email: "test@example.com", name: "Test User", picture: "pic.png" };
    const token = await signJwt(payload, jwtSecret);

    const failingDb = {
      prepare: () => {
        throw new Error("Simulated DB Error");
      }
    };

    const context = {
      request: new Request("http://localhost/api/auth/me", {
        headers: { Cookie: `auth_token=${token}` }
      }),
      env: { JWT_SECRET: jwtSecret, DB: failingDb },
    };

    const response = await onRequestGet(context);
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.authenticated).toBe(true);
    expect(json.user.points).toBe(50); // Defaults when error occurs
    expect(console.error).toHaveBeenCalled();
  });
});
