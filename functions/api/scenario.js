import { getUserFromRequest } from "./auth/_utils.js";
import {
  checkUserPoints,
  deductPointsAndSaveStory,
  PointsError,
  pointsErrorResponse,
} from "./_ai_utils.js";

const AGENTROUTER_MODEL = "gpt-5.5";
const AGENTROUTER_URL = "https://agentrouter.org/v1/chat/completions";

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

  // Retrieve the AgentRouter credential from the Cloudflare Pages environment
  const agentRouterKey = env.AGENTROUTER_API_KEY;

  if (!agentRouterKey) {
    return new Response(
      JSON.stringify({
        success: false,
        errors: [
          {
            message:
              "AgentRouter API key (AGENTROUTER_API_KEY) is not configured in Cloudflare Pages project settings.",
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

    const response = await fetch(AGENTROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${agentRouterKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...safeBody, model: AGENTROUTER_MODEL }),
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
        transactionDescription: "Generasi cerita time capsule (AgentRouter)",
        storyTitle: "Time Capsule Chapter (AgentRouter)",
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
