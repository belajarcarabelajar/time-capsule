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
  const jwtSecret = env.JWT_SECRET;

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
    if (env.DB) {
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

    // 5. Generate JWT session token
    const token = await signJwt(userPayload, jwtSecret);

    // 6. Set session cookie and redirect home
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
    return Response.redirect(`${origin}/?auth_error=${encodeURIComponent("Authentication failed")}`, 302);
  }
}
