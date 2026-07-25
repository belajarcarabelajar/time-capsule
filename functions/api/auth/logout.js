import { createClearCookieHeader } from "./_utils.js";

export async function onRequest(context) {
  const { request } = context;
  const requestUrl = new URL(request.url);
  const cookieHeader = createClearCookieHeader("auth_token");

  // If request comes from a standard GET link, redirect home
  if (request.method === "GET") {
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${requestUrl.origin}/?logged_out=1`,
        "Set-Cookie": cookieHeader,
      },
    });
  }

  // For POST / API calls, return JSON response
  return new Response(JSON.stringify({ success: true, message: "Logged out successfully" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": cookieHeader,
    },
  });
}
