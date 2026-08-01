import { createCookieHeader } from "./_utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const clientId = env.GOOGLE_CLIENT_ID;

  const requestUrl = new URL(request.url);
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${requestUrl.origin}/api/auth/callback`;

  // Generate a cryptographically random state parameter to prevent CSRF attacks
  const state = crypto.randomUUID
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const headers = new Headers();
  headers.set("Location", googleAuthUrl.toString());
  headers.append("Set-Cookie", createCookieHeader("oauth_state", state, 600));

  return new Response(null, {
    status: 302,
    headers,
  });
}
