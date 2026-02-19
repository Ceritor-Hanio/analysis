export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

export async function callAliAPI(
  messages: Array<{ role: string; content: any }>,
  apiKey: string,
  modelId: string = 'qwen3.5-plus'
): Promise<string> {
  if (!apiKey) {
    throw new Error('请先配置阿里云 API Key！');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 120000);

  try {
    const res = await fetch('/api/ali', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, modelId, messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API Error (${res.status}): ${errorText}`);
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            return fullContent;
          }

          try {
            const json = JSON.parse(data);
            const chunk = json.choices?.[0]?.delta?.reasoning_content || 
                          json.choices?.[0]?.delta?.content || '';
            fullContent += chunk;
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }

    return fullContent;

  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('canceled')) {
      throw new Error('请求超时或被中断');
    }
    throw err;
  }
}
