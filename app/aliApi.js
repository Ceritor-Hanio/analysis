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

function findLastJsonObject(text) {
  const lastBraceIndex = text.lastIndexOf('}');
  if (lastBraceIndex === -1) return null;
  
  for (let i = lastBraceIndex; i >= 0; i--) {
    if (text[i] === '}') {
      let braceCount = 0;
      for (let j = i; j >= 0; j--) {
        if (text[j] === '}') braceCount++;
        if (text[j] === '{') {
          braceCount--;
          if (braceCount === 0) {
            const jsonStr = text.substring(j, i + 1);
            try {
              JSON.parse(jsonStr);
              return jsonStr;
            } catch {
              continue;
            }
          }
        }
      }
    }
  }
  return null;
}

function findJsonStart(text) {
  const trimmed = text.trim();
  
  const codeBlockMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    return { jsonStr: codeBlockMatch[1].trim(), found: true };
  }
  
  const codeBlockAnyMatch = trimmed.match(/```\s*([\s\S]*?)\s*```/);
  if (codeBlockAnyMatch) {
    const content = codeBlockAnyMatch[1].trim();
    if (content.startsWith('{') || content.startsWith('[')) {
      return { jsonStr: content, found: true };
    }
  }
  
  const jsonPatterns = [
    /\{"[\s\S]*?"(title|productCategory|hookPrinciple|successFactor|contentStructure|visualElements|speechContent|aiReproduction)/i,
    /\{"[\s\S]*?"(标题|产品类目|开头策略|成功因素|内容结构|视觉元素|语音内容)/i,
    /\{[\s\S]*?"/,
    /\{"title"/i,
    /\{"productCategory"/i,
    /\{"hookPrinciple"/i,
    /\{"successFactor"/i,
    /\{"contentStructure"/i,
    /\{"visualElements"/i,
    /\{"speechContent"/i,
    /\{"aiReproduction"/i,
    /\{"标题"/i,
    /\{"产品类目"/i,
    /\{"开头策略"/i,
    /\{"成功因素"/i,
    /\{"内容结构"/i,
    /\{"视觉元素"/i,
    /\{"语音内容"/i,
    /\{"视觉提示词"/i,
    /\{"音频提示词"/i
  ];
  
  for (const pattern of jsonPatterns) {
    const match = text.match(pattern);
    if (match) {
      const startIndex = text.indexOf(match[0]);
      let braceCount = 0;
      for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{') braceCount++;
        if (text[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            return { jsonStr: text.substring(startIndex, i + 1), found: true };
          }
        }
      }
    }
  }
  
  const jsonStartMatch = trimmed.match(/\{["']/);
  if (jsonStartMatch) {
    const startIndex = text.indexOf(jsonStartMatch[0]);
    let braceCount = 0;
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '{') braceCount++;
      if (text[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          return { jsonStr: text.substring(startIndex, i + 1), found: true };
        }
      }
    }
  }
  
  const jsonArrayMatch = trimmed.match(/\[[\s\S]*?\]/);
  if (jsonArrayMatch) {
    return { jsonStr: jsonArrayMatch[0], found: true };
  }
  
  const lastJson = findLastJsonObject(text);
  if (lastJson) {
    return { jsonStr: lastJson, found: true };
  }
  
  return { jsonStr: null, found: false };
}

function extractJsonFromResponse(text) {
  if (!text || typeof text !== 'string') return null;
  
  const { jsonStr, found } = findJsonStart(text);
  return jsonStr;
}

function safeJsonParse(str) {
  const jsonStr = extractJsonFromResponse(str);
  
  if (jsonStr) {
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      return null;
    }
  }
  
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
