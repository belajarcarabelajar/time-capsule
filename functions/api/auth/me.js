import { parseCookies, verifyJwt } from "./_utils.js";
import { isUnlimitedQuotaUser, readUserPoints } from '../_ai_utils.js';

export async function onRequestGet(context) {
  const { request, env } = context;
  const jwtSecret = env.JWT_SECRET;

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

  let points = null;
  let maxPoints = null;
  const unlimitedQuota = isUnlimitedQuotaUser(payload);
  if (!unlimitedQuota) {
    try {
      const row = await readUserPoints(payload, env);
      points = row.points;
      maxPoints = row.max_points;
    } catch {
      console.error('Point balance unavailable');
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
      pointsAvailable: unlimitedQuota || points !== null,
      unlimitedQuota,
      nextResetAt: tomorrow.toISOString(),
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
