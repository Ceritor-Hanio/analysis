export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result;
      resolve(result.split(',')[1]);
    };
    reader.onerror = error => reject(error);
  });
};

function safeJsonParse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

export async function callAliAPI(messages, apiKey, modelId = 'qwen3.5-plus', onChunk) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 180000);

  try {
    const res = await fetch('/api/ali', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorMessage = `HTTP error! status: ${res.status}`;
      try {
        const errorText = await res.text();
        const errorData = safeJsonParse(errorText);
        if (errorData?.error) {
          errorMessage = typeof errorData.error === 'string' ? errorData.error : JSON.stringify(errorData.error);
        } else if (errorText) {
          errorMessage = errorText.substring(0, 500);
        }
      } catch (e) {}
      throw new Error(errorMessage);
    }

    if (!res.body) {
      throw new Error('Response body is null');
    }

    const reader = res.body.getReader();
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
        if (!line.trim() || line === 'undefined') continue;
        
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            if (onChunk) {
              onChunk(fullContent, '', true);
            }
            return fullContent;
          }

          try {
            const json = JSON.parse(data);
            const chunk = json.choices?.[0]?.delta?.content || 
                          json.choices?.[0]?.delta?.reasoning_content || '';
            if (chunk) {
              fullContent += chunk;
              if (onChunk) {
                onChunk(fullContent, '', false);
              }
            }
          } catch (e) {
          }
        }
      }
    }

    if (onChunk) {
      onChunk(fullContent, '', true);
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
