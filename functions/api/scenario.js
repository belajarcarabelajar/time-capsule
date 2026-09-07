import { getUserFromRequest } from "./auth/_utils.js";
import {
  checkUserPoints,
  deductPointsAndSaveStory,
  PointsError,
  pointsErrorResponse,
} from "./_ai_utils.js";

const DEFAULT_PROVIDER_URL = "https://api.groq.com/openai/v1/chat/completions";
const DEFAULT_PROVIDER_MODEL = "openai/gpt-oss-120b";

export async function onRequestPost(context) {
  const { request, env } = context;

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

  // Retrieve the provider credential from the Cloudflare Pages environment.
  // Switching providers later is configuration-only: set PROVIDER_URL,
  // PROVIDER_API_KEY, and PROVIDER_MODEL without touching this code.
  const providerKey = env.PROVIDER_API_KEY;
  const providerUrl = env.PROVIDER_URL || DEFAULT_PROVIDER_URL;
  const providerModel = env.PROVIDER_MODEL || DEFAULT_PROVIDER_MODEL;

  if (!providerKey) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [
          {
            message:
              "Scenario provider API key (PROVIDER_API_KEY) is not configured in Cloudflare Pages project settings.",
          },
        ],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const cost = 10;
  const pointCheck = await checkUserPoints(authUser, env, cost, "scenario.js");

  if (!pointCheck.success) {
    return pointCheck.errorResponse;
  }

  const currentPoints = pointCheck.currentPoints;

  try {
    const body = await request.json();

    // Extract only necessary fields to prevent unvalidated input forwarding
    const safeBody = {
      messages: body.messages,
      response_format: body.response_format,
    };

    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${providerKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...safeBody, model: providerModel }),
    });

    const data = await response.json();

    // 2. On AI success: Deduct 10 points and save story to D1
    if (response.ok) {
      const content =
        data.choices?.[0]?.message?.content ||
        data.result?.response ||
        "";
      await deductPointsAndSaveStory({
        authUser,
        env,
        currentPoints,
        cost,
        transactionDescription: "Generasi cerita time capsule",
        storyTitle: "Time Capsule Chapter",
        promptSnippet: body.messages
          ? JSON.stringify(body.messages).slice(0, 500)
          : "Time Capsule Story",
        contentStr: JSON.stringify(data),
        sourceName: "scenario.js",
        dataObj: data,
      });
      return new Response(
        JSON.stringify({ success: true, result: { response: content } }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.error(
      "Scenario provider error:",
      response.status,
      data?.error?.message || data?.message,
    );
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof PointsError) return pointsErrorResponse(err);
    return new Response(
      JSON.stringify({
        success: false,
        errors: [{ message: `Failed to process AI request: ${err.message}` }],
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
