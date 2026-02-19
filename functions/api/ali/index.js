const ALI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function onRequest({ request }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { apiKey, modelId, messages } = await request.json();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
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
      }),
    });

    const text = await res.text();

    if (!res.ok) {
      return new Response(text, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(text, {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
