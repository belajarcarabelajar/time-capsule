import { parseCookies, verifyJwt } from "./_utils.js";

export async function onRequestGet(context) {
  const { request, env } = context;
  const jwtSecret = env.JWT_SECRET || "time-capsule-secret-jwt-key-2026-belajarcarabelajar";

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

  return new Response(JSON.stringify({
    authenticated: true,
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    }
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}
