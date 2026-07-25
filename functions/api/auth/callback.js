import { signJwt, createCookieHeader } from "./_utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");

  const origin = requestUrl.origin;
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/callback`;
  const clientId = env.GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET;
  const jwtSecret = env.JWT_SECRET || "time-capsule-secret-jwt-key-2026-belajarcarabelajar";

  if (error || !code) {
    return Response.redirect(`${origin}/?auth_error=${encodeURIComponent(error || "No code provided")}`, 302);
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Failed to exchange code for token:", tokenData);
      return Response.redirect(`${origin}/?auth_error=${encodeURIComponent(tokenData.error_description || "Token exchange failed")}`, 302);
    }

    // 2. Fetch Google User Profile
    const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    if (!userResponse.ok || !userData.id) {
      return Response.redirect(`${origin}/?auth_error=Failed to fetch user profile`, 302);
    }

    // 3. Construct user profile object
    const userPayload = {
      sub: userData.id,
      email: userData.email,
      name: userData.name || userData.given_name || "User",
      picture: userData.picture || "",
      verified_email: userData.verified_email || false,
    };

    // 4. Generate JWT session token
    const token = await signJwt(userPayload, jwtSecret);

    // 5. Set session cookie and redirect home
    const cookieHeader = createCookieHeader("auth_token", token);

    const response = new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/?auth_success=1`,
        "Set-Cookie": cookieHeader,
      },
    });

    return response;
  } catch (err) {
    console.error("Auth callback exception:", err);
    return Response.redirect(`${origin}/?auth_error=${encodeURIComponent(err.message)}`, 302);
  }
}
