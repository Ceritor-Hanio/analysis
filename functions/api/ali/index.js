const ALI_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

export async function onRequest({ request }) {
  console.log('EdgeOne function started');

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } });
  }

  try {
    const { apiKey, modelId, messages } = await request.json();
    console.log('Request received, messages count:', messages?.length);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Calling DashScope API...');
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

    console.log('DashScope response status:', res.status);
    const text = await res.text();
    console.log('DashScope response length:', text.length);

    if (!res.ok) {
      console.error('DashScope error:', text.substring(0, 500));
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
    console.error('Function error:', e.message);
    return new Response(JSON.stringify({ error: e.message || 'Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
