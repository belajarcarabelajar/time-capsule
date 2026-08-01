import { parseCookies, verifyJwt } from "./_utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const jwtSecret = env.JWT_SECRET;

  if (!jwtSecret) {
    console.error("Server misconfiguration: JWT_SECRET is not set.");
    return new Response(JSON.stringify({ error: "Server misconfiguration" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // Check cookie or Bearer header
  const cookies = parseCookies(request);
  let token = cookies.auth_token;

  if (!token) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token) {
    return new Response(JSON.stringify({ authenticated: false, user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  const payload = await verifyJwt(token, jwtSecret);

  if (!payload) {
    return new Response(JSON.stringify({ authenticated: false, user: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  }

  let points = 50;
  let maxPoints = 50;
  const todayStr = new Date().toISOString().split("T")[0];

  // If Cloudflare D1 is bound, fetch user points & perform daily reset if needed
  if (env.DB) {
    try {
      const userRow = await env.DB.prepare(
        "SELECT points, max_points, last_point_reset FROM users WHERE google_id = ?"
      ).bind(payload.sub).first();

      if (userRow) {
        maxPoints = userRow.max_points || 50;
        points = userRow.points ?? 50;

        // Perform Lazy Daily Reset if last_point_reset < today
        if (!userRow.last_point_reset || userRow.last_point_reset < todayStr) {
          points = maxPoints;
          await env.DB.prepare(`
            UPDATE users SET points = ?, last_point_reset = ? WHERE google_id = ?
          `).bind(maxPoints, todayStr, payload.sub).run();

          await env.DB.prepare(`
            INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
            VALUES (?, ?, ?, 'DAILY_RESET', 'Daily reset 50 poin')
          `).bind(payload.sub, maxPoints, maxPoints).run();
        }
      }
    } catch (err) {
      console.error("Error checking points in me.js:", err);
    }
  }

  // Calculate next reset timestamp (midnight tomorrow UTC)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return new Response(JSON.stringify({
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      points: points,
      maxPoints: maxPoints,
      nextResetAt: tomorrow.toISOString(),
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
