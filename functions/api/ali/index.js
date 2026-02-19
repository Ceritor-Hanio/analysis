const ALI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

function streamProxy(res) {
  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('Content-Type') || 'text/event-stream',
      'Cache-Control': 'no-store',
    },
  });
}

export async function onRequest({ request }) {
  request.headers.delete('accept-encoding');

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
        stream: true,
      }),
    });

    return streamProxy(res);

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message || 'Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
