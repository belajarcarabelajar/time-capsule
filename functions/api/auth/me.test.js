import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { onRequestGet } from "./me.js";
import { signJwt } from "./_utils.js";
import { createPointsDb } from '../test-support/pointsDb.js';

describe("onRequestGet - me.js", () => {
  const jwtSecret = "test-secret-123";
  let originalConsoleError;
  const fixtures = [];

  beforeEach(() => {
    originalConsoleError = console.error;
    console.error = mock(() => {});
  });

  afterEach(async () => {
    console.error = originalConsoleError;
    for (const fixture of fixtures.splice(0)) await fixture.dispose();
  });

  const createMockDb = async (row) => {
    const fixture = await createPointsDb({ points: row.points, maxPoints: row.max_points, reset: row.last_point_reset });
    fixtures.push(fixture);
    await fixture.db.prepare("UPDATE users SET google_id='user-123'").run();
    return fixture.db;
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
    expect(json.user.points).toBeNull();
    expect(json.user.maxPoints).toBeNull();
    expect(json.user.pointsAvailable).toBe(false);
    expect(json.user.nextResetAt).toBeDefined();
  });

  it("marks the verified admin session as unlimited without D1", async () => {
    const payload = {
      sub: "admin-user", email: "KURNIAWANIWAN7906@GMAIL.COM", verified_email: true,
    };
    const token = await signJwt(payload, jwtSecret);
    const response = await onRequestGet({
      request: new Request("http://localhost/api/auth/me", { headers: { Cookie: `auth_token=${token}` } }),
      env: { JWT_SECRET: jwtSecret },
    });
    const json = await response.json();
    expect(json.user.unlimitedQuota).toBe(true);
    expect(json.user.pointsAvailable).toBe(true);
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

    const mockDb = await createMockDb({ points: 30, max_points: 100, last_point_reset: todayStr });

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

    const mockDb = await createMockDb({ points: 10, max_points: 100, last_point_reset: pastStr });

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
    expect(json.user.points).toBeNull();
    expect(json.user.pointsAvailable).toBe(false);
    expect(console.error).toHaveBeenCalled();
  });
});
