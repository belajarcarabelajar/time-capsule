import { signJwt, createCookieHeader, parseCookies, createClearCookieHeader } from "./_utils.js";

async function exchangeAuthorizationCode(code, clientId, clientSecret, redirectUri) {
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

  const data = await tokenResponse.json();
  return { ok: tokenResponse.ok, data };
}

async function fetchGoogleUserProfile(accessToken) {
  const userResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await userResponse.json();
  return { ok: userResponse.ok, data };
}

async function syncUserProfileToDatabase(env, request, userData, userPayload) {
  if (!env.DB) return;

  try {
    const todayStr = new Date().toISOString().split("T")[0];
    const googleId = userData.id;
    const email = userData.email;
    const verifiedEmail = userData.verified_email ? 1 : 0;
    const name = userPayload.name;
    const givenName = userPayload.given_name;
    const familyName = userPayload.family_name;
    const picture = userPayload.picture;
    const locale = userPayload.locale;
    const hd = userPayload.hd;

    // Check if user already exists
    const existingUser = await env.DB.prepare(
      "SELECT id, points, last_point_reset FROM users WHERE google_id = ?"
    ).bind(googleId).first();

    let userId = googleId;

    if (!existingUser) {
      // Insert new user with 50 initial welcome points
      await env.DB.prepare(`
        INSERT INTO users (id, google_id, email, email_verified, name, given_name, family_name, picture, locale, hd, points, max_points, last_point_reset)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 50, 50, ?)
      `).bind(googleId, googleId, email, verifiedEmail, name, givenName, familyName, picture, locale, hd, todayStr).run();

      // Log welcome bonus transaction (+50)
      await env.DB.prepare(`
        INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
        VALUES (?, 50, 50, 'WELCOME_BONUS', 'Bonus pendaftaran awal 50 poin')
      `).bind(googleId).run();
    } else {
      // Update existing user profile
      await env.DB.prepare(`
        UPDATE users SET
          email = ?,
          email_verified = ?,
          name = ?,
          given_name = ?,
          family_name = ?,
          picture = ?,
          locale = ?,
          hd = ?,
          updated_at = CURRENT_TIMESTAMP,
          last_login_at = CURRENT_TIMESTAMP
        WHERE google_id = ?
      `).bind(email, verifiedEmail, name, givenName, familyName, picture, locale, hd, googleId).run();
    }

    // Insert audit log (IP, Country, User-Agent)
    const ipAddress = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "127.0.0.1";
    const country = request.headers.get("CF-IPCountry") || "UNKNOWN";
    const userAgent = request.headers.get("User-Agent") || "UNKNOWN";

    await env.DB.prepare(`
      INSERT INTO auth_audit_logs (user_id, email, ip_address, country, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).bind(userId, email, ipAddress, country, userAgent).run();
  } catch (dbErr) {
    // Silently ignore database sync error to not block authentication
  }
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const error = requestUrl.searchParams.get("error");
  const state = requestUrl.searchParams.get("state");

  const origin = requestUrl.origin;
  const redirectUri = env.GOOGLE_REDIRECT_URI || `${origin}/api/auth/callback`;
  const clientId = env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = env.GOOGLE_CLIENT_SECRET || env.VITE_GOOGLE_CLIENT_SECRET;
  const jwtSecret = env.JWT_SECRET;

  const redirectWithError = (errorMessage) => {
    const headers = new Headers();
    headers.set("Location", `${origin}/?auth_error=${encodeURIComponent(errorMessage)}`);
    headers.append("Set-Cookie", createClearCookieHeader("oauth_state"));
    return new Response(null, { status: 302, headers });
  };

  // Verify the OAuth state parameter against the stored cookie to prevent CSRF attacks
  const cookies = parseCookies(request);
  const storedState = cookies.oauth_state;

  if (!state || !storedState || state !== storedState) {
    return redirectWithError("Invalid OAuth state parameter. Request rejected for security.");
  }

  if (error || !code) {
    return redirectWithError(error || "No code provided");
  }

  try {
    // 1. Exchange authorization code for tokens
    const tokenResult = await exchangeAuthorizationCode(code, clientId, clientSecret, redirectUri);
    if (!tokenResult.ok || !tokenResult.data?.access_token) {
      return redirectWithError(tokenResult.data?.error_description || "Token exchange failed");
    }

    // 2. Fetch Google User Profile
    const userResult = await fetchGoogleUserProfile(tokenResult.data.access_token);
    if (!userResult.ok || !userResult.data?.id) {
      return redirectWithError("Failed to fetch user profile");
    }

    const userData = userResult.data;

    // 3. Construct 100% user profile object
    const userPayload = {
      sub: userData.id,
      email: userData.email,
      name: userData.name || userData.given_name || "User",
      picture: userData.picture || "",
      verified_email: userData.verified_email || false,
      given_name: userData.given_name || "",
      family_name: userData.family_name || "",
      locale: userData.locale || "",
      hd: userData.hd || "",
    };

    // 4. Sync profile & audit logs to Cloudflare D1 Database if env.DB is configured
    await syncUserProfileToDatabase(env, request, userData, userPayload);

    // 5. Generate JWT session token
    const token = await signJwt(userPayload, jwtSecret);

    // 6. Set session cookie, clear oauth_state cookie, and redirect home
    const headers = new Headers();
    headers.set("Location", `${origin}/?auth_success=1`);
    headers.append("Set-Cookie", createCookieHeader("auth_token", token));
    headers.append("Set-Cookie", createClearCookieHeader("oauth_state"));

    return new Response(null, {
      status: 302,
      headers,
    });
  } catch (err) {
    return redirectWithError("Authentication failed");
  }
}
