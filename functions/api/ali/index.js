const ALI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

export async function onRequest({ request, env }) {
  const requestId = Math.random().toString(36).substring(2, 15);
  
  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    request.headers.delete('accept-encoding');

    const bodyText = await request.text();
    console.log(`[${requestId}] Request body length:`, bodyText.length);

    if (!bodyText) {
      return new Response(JSON.stringify({ error: 'Empty request body', requestId }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let body;
    try {
      body = JSON.parse(bodyText);
    } catch (parseError) {
      console.log(`[${requestId}] JSON parse error:`, parseError.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body', requestId }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const { apiKey, modelId, messages } = body;

    if (!apiKey) {
      console.log(`[${requestId}] Missing API key`);
      return new Response(JSON.stringify({ error: 'API Key is required', requestId }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    console.log(`[${requestId}] Calling AI API, model:`, modelId || 'qwen3.5-plus');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`[${requestId}] Request timeout, aborting...`);
      controller.abort();
    }, 55000);

    try {
      const response = await fetch(ALI_API_BASE + '/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId || 'qwen3.5-plus',
          messages: messages || [],
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`[${requestId}] API error:`, response.status, errorText);
        return new Response(JSON.stringify({
          error: 'API Error',
          status: response.status,
          details: errorText.substring(0, 500),
          requestId
        }), {
          status: response.status,
          headers: corsHeaders,
        });
      }

      const responseText = await response.text();
      console.log(`[${requestId}] Response received, length:`, responseText.length);

      return new Response(responseText, {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (fetchError) {
      clearTimeout(timeoutId);
      const errorMsg = fetchError.message || String(fetchError);

      if (errorMsg.includes('aborted') || errorMsg.includes('timeout')) {
        console.log(`[${requestId}] Request timed out`);
        return new Response(JSON.stringify({ error: 'Request timed out', requestId }), {
          status: 504,
          headers: corsHeaders,
        });
      }

      console.log(`[${requestId}] Fetch error:`, errorMsg);
      return new Response(JSON.stringify({ error: 'Fetch error', message: errorMsg, requestId }), {
        status: 500,
        headers: corsHeaders,
      });
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.log(`[${requestId}] Unexpected error:`, errorMsg);
    return new Response(JSON.stringify({ error: 'Internal Error', message: errorMsg, requestId }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}
