export async function checkUserPoints(
  authUser,
  env,
  cost = 10,
  sourceName = "api",
) {
  let currentPoints = 50;
  const todayStr = new Date().toISOString().split("T")[0];

  if (authUser && env.DB) {
    try {
      const userRow = await env.DB.prepare(
        "SELECT points, max_points, last_point_reset FROM users WHERE google_id = ?",
      )
        .bind(authUser.sub)
        .first();

      if (userRow) {
        currentPoints = userRow.points ?? 50;
        const maxPoints = userRow.max_points || 50;

        // Perform lazy daily reset if last_point_reset < today
        if (!userRow.last_point_reset || userRow.last_point_reset < todayStr) {
          currentPoints = maxPoints;
          await env.DB.prepare(
            "UPDATE users SET points = ?, last_point_reset = ? WHERE google_id = ?",
          )
            .bind(maxPoints, todayStr, authUser.sub)
            .run();

          await env.DB.prepare(
            `
            INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
            VALUES (?, ?, ?, 'DAILY_RESET', 'Daily reset 50 poin')
          `,
          )
            .bind(authUser.sub, maxPoints, maxPoints)
            .run();
        }

        // Check if points are sufficient
        if (currentPoints < cost) {
          return {
            success: false,
            errorResponse: new Response(
              JSON.stringify({
                success: false,
                error: "INSUFFICIENT_POINTS",
                message: `Poin Anda tidak mencukupi (${currentPoints} poin). Diperlukan ${cost} poin untuk men-generate cerita. Poin akan di-reset besok!`,
                points: currentPoints,
                cost: cost,
              }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" },
              },
            ),
          };
        }
      }
    } catch (dbErr) {
      console.error(`D1 point check error in ${sourceName}:`, dbErr);
    }
  }

  return {
    success: true,
    currentPoints,
  };
}

export async function deductPointsAndSaveStory({
  authUser,
  env,
  currentPoints,
  cost = 10,
  transactionDescription = "Generasi cerita time capsule",
  storyTitle = "Time Capsule Chapter",
  promptSnippet = "Time Capsule Story",
  contentStr = "{}",
  sourceName = "api",
  dataObj,
}) {
  if (authUser && env.DB) {
    try {
      const newBalance = currentPoints - cost;
      await env.DB.prepare("UPDATE users SET points = ? WHERE google_id = ?")
        .bind(newBalance, authUser.sub)
        .run();

      await env.DB.prepare(
        `
        INSERT INTO point_transactions (user_id, amount, balance_after, type, description)
        VALUES (?, ?, ?, 'GENERATE_STORY', ?)
      `,
      )
        .bind(authUser.sub, -cost, newBalance, transactionDescription)
        .run();

      // Save story entry
      const storyId = crypto.randomUUID();

      await env.DB.prepare(
        `
        INSERT INTO stories (id, user_id, title, prompt, content, points_spent)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      )
        .bind(
          storyId,
          authUser.sub,
          storyTitle,
          promptSnippet,
          contentStr,
          cost,
        )
        .run();

      if (dataObj) {
        dataObj.user_points = newBalance;
      }
      return newBalance;
    } catch (deductErr) {
      console.error(
        `Failed to deduct points or save story in ${sourceName}:`,
        deductErr,
      );
    }
  }
  return null;
}
