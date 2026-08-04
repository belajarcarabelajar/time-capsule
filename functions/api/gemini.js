import { getUserFromRequest } from "./auth/_utils.js";
import { checkUserPoints, deductPointsAndSaveStory } from "./_ai_utils.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  // Retrieve credentials from environment variables set in Cloudflare Pages
  const apiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;

  if (!apiKey) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [
          {
            message:
              "Gemini API key is not configured in Cloudflare Pages project settings.",
          },
        ],
      }),
      {
        status: 501, // Not Implemented / Configured
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // 1. Authenticate user & check D1 point balance
  const authUser = await getUserFromRequest(request, env);

  if (!authUser) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "UNAUTHORIZED",
        message: "Authentication required to use this endpoint.",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const cost = 10;
  const pointCheck = await checkUserPoints(authUser, env, cost, "gemini.js");

  if (!pointCheck.success) {
    return pointCheck.errorResponse;
  }

  const currentPoints = pointCheck.currentPoints;

  try {
    const body = await request.json();

    // Ensure the body has the required fields
    const safeBody = {
      contents: body.contents,
      systemInstruction: body.systemInstruction,
      generationConfig: body.generationConfig,
    };

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(safeBody),
      },
    );

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          errors: [data],
        }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 2. On AI success: Deduct 10 points and save story to D1
    await deductPointsAndSaveStory({
      authUser,
      env,
      currentPoints,
      cost,
      transactionDescription: "Generasi cerita time capsule (Gemini)",
      storyTitle: "Time Capsule Chapter (Gemini)",
      promptSnippet: body.contents
        ? JSON.stringify(body.contents).slice(0, 500)
        : "Time Capsule Story",
      contentStr: JSON.stringify(data),
      sourceName: "gemini.js",
      dataObj: data,
    });

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [
          { message: `Failed to process Gemini request: ${err.message}` },
        ],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
