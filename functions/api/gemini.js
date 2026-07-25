import { getUserFromRequest } from "./auth/_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  // Retrieve credentials from environment variables set in Cloudflare Pages
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({
      success: false,
      errors: [{ message: "Gemini API key is not configured in Cloudflare Pages project settings." }]
    }), {
      status: 501, // Not Implemented / Configured
      headers: { "Content-Type": "application/json" }
    });
  }

  // 1. Authenticate user & check D1 point balance
  const authUser = await getUserFromRequest(request, env);
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
      console.error("D1 point check error in gemini.js:", dbErr);
    }
  }

  try {
    const body = await request.json();

    // Ensure the body has the required fields
    const safeBody = {
      contents: body.contents,
      systemInstruction: body.systemInstruction,
      generationConfig: body.generationConfig
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(safeBody)
    });

    const data = await response.json();

    if (!response.ok) {
       return new Response(JSON.stringify({
         success: false,
         errors: [data]
       }), {
         status: response.status,
         headers: { "Content-Type": "application/json" }
       });
    }

    // 2. On AI success: Deduct 10 points and save story to D1
    if (authUser && env.DB) {
      try {
        const newBalance = currentPoints - cost;
        await env.DB.prepare(
          "UPDATE users SET points = ? WHERE google_id = ?"
        ).bind(newBalance, authUser.sub).run();

        await env.DB.prepare(`
          INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
          VALUES (?, ?, ?, 'GENERATE_STORY', 'Generasi cerita time capsule (Gemini)')
        `).bind(authUser.sub, -cost, newBalance).run();

        // Save story entry
        const storyId = crypto.randomUUID();
        const promptSnippet = body.contents ? JSON.stringify(body.contents).slice(0, 500) : "Time Capsule Story";
        const contentStr = JSON.stringify(data);

        await env.DB.prepare(`
          INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
          VALUES (?, ?, ?, ?, ?, ?)
        `).bind(storyId, authUser.sub, "Time Capsule Chapter (Gemini)", promptSnippet, contentStr, cost).run();

        data.user_points = newBalance;
      } catch (deductErr) {
        console.error("Failed to deduct points or save story in gemini.js:", deductErr);
      }
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      errors: [{ message: `Failed to process Gemini request: ${err.message}` }]
    }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
