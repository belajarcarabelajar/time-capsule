import { getUserFromRequest } from "./auth/_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  // Retrieve credentials from environment variables set in Cloudflare Pages
  const cfApiToken = env.VITE_CF_API_TOKEN || env.CF_API_TOKEN;
  const cfAccountId = env.VITE_CF_ACCOUNT_ID || env.CF_ACCOUNT_ID;

  if (!cfApiToken || !cfAccountId) {
    return new Response(JSON.stringify({
      success: false,
      errors: [{ message: "Cloudflare credentials (VITE_CF_API_TOKEN and VITE_CF_ACCOUNT_ID) are not configured in Cloudflare Pages project settings." }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }

  // 1. Authenticate user & check D1 point balance
  const authUser = await getUserFromRequest(request, env);

  if (!authUser) {
    return new Response(JSON.stringify({
      success: false,
      error: "UNAUTHORIZED",
      message: "Authentication required"
    }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const cost = 10;
  let currentPoints = 50;
  const todayStr = new Date().toISOString().split("T")[0];

  if (authUser && env.DB) {
    try {
      const userRow = await env.DB.prepare(
        "SELECT points, max_points, last_point_reset FROM users WHERE google_id = ?"
      ).bind(authUser.sub).first();

      if (userRow) {
        currentPoints = userRow.points ?? 50;
        const maxPoints = userRow.max_points || 50;

        // Perform lazy daily reset if last_point_reset < today
        if (!userRow.last_point_reset || userRow.last_point_reset < todayStr) {
          currentPoints = maxPoints;
          await env.DB.prepare(
            "UPDATE users SET points = ?, last_point_reset = ? WHERE google_id = ?"
          ).bind(maxPoints, todayStr, authUser.sub).run();

          await env.DB.prepare(`
            INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
            VALUES (?, ?, ?, 'DAILY_RESET', 'Daily reset 50 poin')
          `).bind(authUser.sub, maxPoints, maxPoints).run();
        }

        // Check if points are sufficient
        if (currentPoints < cost) {
          return new Response(JSON.stringify({
            success: false,
            error: "INSUFFICIENT_POINTS",
            message: `Poin Anda tidak mencukupi (${currentPoints} poin). Diperlukan ${cost} poin untuk men-generate cerita. Poin akan di-reset besok!`,
            points: currentPoints,
            cost: cost
          }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    } catch (dbErr) {
      console.error("D1 point check error in ai.js:", dbErr);
    }
  }

  try {
    const body = await request.json();
    const model = '@cf/meta/llama-3.1-8b-instruct';
    
    // Extract only necessary fields to prevent unvalidated input forwarding
    const safeBody = {
      messages: body.messages,
      response_format: body.response_format
    };

    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfApiToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(safeBody)
    });

    const data = await response.json();

    // 2. On AI success: Deduct 10 points and save story to D1
    if (response.ok && data.success && authUser && env.DB) {
      try {
        const newBalance = currentPoints - cost;
        await env.DB.prepare(
          "UPDATE users SET points = ? WHERE google_id = ?"
        ).bind(newBalance, authUser.sub).run();

        await env.DB.prepare(`
          INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
          VALUES (?, ?, ?, 'GENERATE_STORY', 'Generasi cerita time capsule')
        `).bind(authUser.sub, -cost, newBalance).run();

        // Save story entry
        const storyId = crypto.randomUUID();
        const promptSnippet = body.messages ? JSON.stringify(body.messages).slice(0, 500) : "Time Capsule Story";
        const contentStr = JSON.stringify(data.result || data);

        await env.DB.prepare(`
          INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(storyId, authUser.sub, "Time Capsule Chapter", promptSnippet, contentStr, cost).run();

        data.user_points = newBalance;
      } catch (deductErr) {
        console.error("Failed to deduct points or save story in ai.js:", deductErr);
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      errors: [{ message: `Failed to process AI request: ${err.message}` }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
