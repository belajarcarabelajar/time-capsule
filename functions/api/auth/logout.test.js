import { describe, it, expect } from "bun:test";
import { onRequest } from "./logout.js";

describe("onRequest - Logout", () => {
  it("should clear cookie and redirect home on GET request", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "GET",
    });
    const context = { request };

    const response = await onRequest(context);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toBe("http://localhost/?logged_out=1");
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=;");
  });

  it("should clear cookie and return JSON on POST request", async () => {
    const request = new Request("http://localhost/api/auth/logout", {
      method: "POST",
    });
    const context = { request };

    const response = await onRequest(context);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/json");
    expect(response.headers.get("Set-Cookie")).toContain("auth_token=;");

    const json = await response.json();
    expect(json).toEqual({ success: true, message: "Logged out successfully" });
  });
});
