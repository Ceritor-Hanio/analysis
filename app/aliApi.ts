interface ApiResponse {
  output?: {
    text?: string;
  };
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

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

  console.log('[AliAPI] 开始请求 /api/ali');
  console.log('[AliAPI] modelId:', modelId);
  console.log('[AliAPI] messages 数量:', messages?.length);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log('[AliAPI] 请求超时，中止...');
    controller.abort();
  }, 60000);

  try {
    const response = await fetch('/api/ali', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiKey,
        modelId,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('[AliAPI] 响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AliAPI] API Error 响应体:', errorText);
      throw new Error(`API 错误 (${response.status}): ${errorText}`);
    }

    const text = await response.text();
    console.log('[AliAPI] 响应体长度:', text.length);

    try {
      const data: ApiResponse = JSON.parse(text);
      console.log('[AliAPI] JSON 解析成功');

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.warn('[AliAPI] API 返回内容为空');
        return '';
      }
      return content;
    } catch (parseError: any) {
      console.error('[AliAPI] JSON 解析失败:', parseError);
      throw new Error(`JSON 解析失败: ${parseError?.message || parseError}, 原始响应: ${text.substring(0, 200)}`);
    }
  } catch (err: any) {
    clearTimeout(timeoutId);
    const errorMsg = err.message || String(err);
    if (errorMsg.includes('aborted') || errorMsg.includes('canceled')) {
      console.error('[AliAPI] 请求超时');
      throw new Error('请求超时，请稍后重试');
    }
    console.error('[AliAPI] 请求错误:', errorMsg);
    throw err;
  }
}
