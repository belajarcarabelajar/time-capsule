import { describe, it, expect } from "bun:test";
import { getUserFromRequest, signJwt } from "./_utils.js";

describe("getUserFromRequest", () => {
  const env = { JWT_SECRET: "test-secret" };

  it("should return null if request is missing", async () => {
    const user = await getUserFromRequest(null, env);
    expect(user).toBeNull();
  });

  it("should return null if no token is present in cookies or headers", async () => {
    const request = new Request("http://localhost");
    const user = await getUserFromRequest(request, env);
    expect(user).toBeNull();
  });

  it("should return user payload if valid token is in cookies", async () => {
    const payload = { sub: "user123" };
    const token = await signJwt(payload, env.JWT_SECRET);

    const request = new Request("http://localhost", {
      headers: {
        Cookie: `auth_token=${token}`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).not.toBeNull();
    expect(user.sub).toBe("user123");
    expect(user.iat).toBeDefined();
    expect(user.exp).toBeDefined();
  });

  it("should return user payload if valid token is in Authorization header", async () => {
    const payload = { sub: "user456" };
    const token = await signJwt(payload, env.JWT_SECRET);

    const request = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).not.toBeNull();
    expect(user.sub).toBe("user456");
  });

  it("should prioritize cookie token over Authorization header", async () => {
    const cookiePayload = { sub: "cookie-user" };
    const headerPayload = { sub: "header-user" };

    const cookieToken = await signJwt(cookiePayload, env.JWT_SECRET);
    const headerToken = await signJwt(headerPayload, env.JWT_SECRET);

    const request = new Request("http://localhost", {
      headers: {
        Cookie: `auth_token=${cookieToken}`,
        Authorization: `Bearer ${headerToken}`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).not.toBeNull();
    expect(user.sub).toBe("cookie-user");
  });

  it("should return null if token is invalid", async () => {
    const request = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer invalid.token.here`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).toBeNull();
  });

  it("should return null if token is expired", async () => {
    const payload = { sub: "expired-user" };
    // sign a token with a negative expiration time (expired in the past)
    const token = await signJwt(payload, env.JWT_SECRET, -3600);

    const request = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).toBeNull();
  });

  it("should return null if verified with incorrect secret", async () => {
    const payload = { sub: "user123" };
    const token = await signJwt(payload, "different-secret");

    const request = new Request("http://localhost", {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const user = await getUserFromRequest(request, env);
    expect(user).toBeNull();
  });
});
