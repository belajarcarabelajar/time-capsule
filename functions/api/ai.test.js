import { describe, it, expect } from "bun:test";
import { onRequestPost } from "./ai.js";

describe("onRequestPost - Credentials Validation", () => {
  it("should return 500 error when env is completely empty", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {}
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.errors[0].message).toContain("Cloudflare credentials");
  });

  it("should return 500 error when only VITE_CF_API_TOKEN is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        VITE_CF_ACCOUNT_ID: "account-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only VITE_CF_ACCOUNT_ID is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        VITE_CF_API_TOKEN: "token-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only CF_API_TOKEN is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        CF_ACCOUNT_ID: "account-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });

  it("should return 500 error when only CF_ACCOUNT_ID is missing", async () => {
    const context = {
      request: new Request("http://localhost"),
      env: {
        CF_API_TOKEN: "token-123"
      }
    };

    const response = await onRequestPost(context);
    expect(response.status).toBe(500);
  });
});
