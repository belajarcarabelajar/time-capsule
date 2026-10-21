import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-haiku-5-5";
export const CLAUDE_EFFORT = "medium";
// Adaptive thinking tokens count against max_tokens, so this leaves room for
// both the thinking and the scenario JSON.
export const CLAUDE_MAX_TOKENS = 16000;
// Single attempts at medium effort measured 28 to 33 s on 2026-10-21, so a
// 45 s cap cut slow but healthy generations short.
export const CLAUDE_TIMEOUT_MS = 90_000;

export async function generateWithClaude({ apiKey, system, user, schema, fetch }) {
  try {
    const client = new Anthropic({
      apiKey,
      maxRetries: 1,
      timeout: CLAUDE_TIMEOUT_MS,
      ...(fetch ? { fetch } : {}),
    });
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      thinking: { type: "adaptive" },
      output_config: { effort: CLAUDE_EFFORT, format: { type: "json_schema", schema } },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: user }],
    });
    return interpretMessage(message);
  } catch (error) {
    const reason = classifyError(error);
    // The status alone, never the message, tells the operator which unexpected
    // upstream reply this was (for example a 400 from a schema the API rejects).
    if (reason === "unknown" && error instanceof Anthropic.APIError && typeof error.status === "number") {
      return { ok: false, reason, upstream_status: error.status };
    }
    return { ok: false, reason };
  }
}

function interpretMessage(message) {
  const usage = {
    input_tokens: message.usage?.input_tokens,
    output_tokens: message.usage?.output_tokens,
  };
  if (message.stop_reason === "refusal") return { ok: false, refused: true, usage };
  if (message.stop_reason === "max_tokens") return { ok: false, reason: "max_tokens", usage };
  if (message.stop_reason !== "end_turn") return { ok: false, reason: "unknown", usage };

  const text = (message.content ?? [])
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
  try {
    JSON.parse(text);
  } catch {
    return { ok: false, reason: "invalid_output", usage };
  }
  return { ok: true, response: text, usage };
}

function classifyError(error) {
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return "auth";
  }
  if (error instanceof Anthropic.RateLimitError) return "upstream_rate_limited";
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout";
  if (
    error instanceof Anthropic.InternalServerError ||
    (error instanceof Anthropic.APIError && error.status >= 500)
  ) {
    return "overloaded";
  }
  return "unknown";
}
