const ALI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: HEADERS });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: HEADERS
    });
  }

  try {
    const { apiKey, modelId, messages } = await request.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key required' }), {
        status: 401,
        headers: HEADERS
      });
    }

    const res = await fetch(ALI_API_BASE + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId || 'qwen3.5-plus',
        messages: messages || [],
        stream: true,
      }),
    });

    return new Response(res.body, {
      status: res.status,
      headers: HEADERS,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Error' }), {
      status: 500,
      headers: HEADERS
    });
  }
}
