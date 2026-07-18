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
