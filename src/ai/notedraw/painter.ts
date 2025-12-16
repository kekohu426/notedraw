/**
 * NoteDraw Painter (Hand)
 * 绘图创作师 - 负责调用图像生成 API
 *
 * 使用 apimart.ai 的图像生成 API（国内可用）
 * 异步任务模式：创建任务 -> 轮询结果
 */

import type { ImageModel, APIProvider, CustomProviderConfig } from './types';

export interface PaintResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  errorMessage?: string;
}

export interface PaintOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  imageModel?: ImageModel;
  apiProvider?: APIProvider;
  customProvider?: CustomProviderConfig;
}

const MAX_RETRIES = 2;
const POLL_INTERVAL = 2000; // 2秒轮询一次
const MAX_POLL_ATTEMPTS = 60; // 最多轮询60次（2分钟）

// ============ Gemini API (NanoBanana) ============

/**
 * 使用 NanoBanana 的 Gemini Image API
 */
async function paintWithGemini(options: PaintOptions): Promise<PaintResult> {
  const apiKey = process.env.GEMINI_IMAGE_API_KEY;
  const baseUrl = process.env.GEMINI_IMAGE_BASE_URL || 'https://api.nanobananai.com/v1beta';

  if (!apiKey) {
    return {
      success: false,
      errorMessage: 'GEMINI_IMAGE_API_KEY not configured',
    };
  }

  try {
    // 使用用户指定的模型: gemini-3-pro-image-preview
    const model = 'gemini-3-pro-image-preview';
    const url = `${baseUrl}/models/${model}:generateContent`;

    console.log('[Painter] Gemini API request to:', url);

    const requestBody = {
      contents: [
        {
          parts: [
            { text: options.prompt }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      }
    };

    console.log('[Painter] Gemini request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log('[Painter] Gemini response status:', response.status);
    console.log('[Painter] Gemini response:', responseText.substring(0, 500));

    if (!response.ok) {
      return {
        success: false,
        errorMessage: `Gemini API error: ${response.status} - ${responseText}`,
      };
    }

    const data = JSON.parse(responseText);

    // 从 Gemini 响应中提取图像
    // 响应格式: { candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }] }
    const candidates = data.candidates;
    if (!candidates || candidates.length === 0) {
      return {
        success: false,
        errorMessage: 'No candidates in Gemini response',
      };
    }

    const parts = candidates[0]?.content?.parts;
    if (!parts || parts.length === 0) {
      return {
        success: false,
        errorMessage: 'No parts in Gemini response',
      };
    }

    // 查找图像部分
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const base64Data = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || 'image/png';
        const dataUrl = `data:${mimeType};base64,${base64Data}`;

        console.log('[Painter] Gemini image generated successfully');

        return {
          success: true,
          imageBase64: base64Data,
          imageUrl: dataUrl,
        };
      }
    }

    // 如果没有 inlineData，检查是否有 fileData（URL 格式）
    for (const part of parts) {
      if (part.fileData && part.fileData.fileUri) {
        console.log('[Painter] Gemini image URL:', part.fileData.fileUri);
        return {
          success: true,
          imageUrl: part.fileData.fileUri,
        };
      }
    }

    return {
      success: false,
      errorMessage: 'No image found in Gemini response',
    };

  } catch (error) {
    console.error('[Painter] Gemini error:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 根据宽高计算最接近的 aspect ratio
 */
function getAspectRatio(width?: number, height?: number): string {
  if (!width || !height) return '4:3';

  const ratio = width / height;

  // 支持的比例: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9
  if (ratio >= 2.2) return '21:9';
  if (ratio >= 1.6) return '16:9';
  if (ratio >= 1.4) return '3:2';
  if (ratio >= 1.2) return '4:3';
  if (ratio >= 1.1) return '5:4';
  if (ratio >= 0.9) return '1:1';
  if (ratio >= 0.75) return '4:5';
  if (ratio >= 0.7) return '3:4';
  if (ratio >= 0.6) return '2:3';
  return '9:16';
}

/**
 * 创建图像生成任务
 */
async function createImageTask(
  apiKey: string,
  baseUrl: string,
  prompt: string,
  aspectRatio: string,
  imageModel: ImageModel = 'gpt-4o-image'
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  const requestBody = {
    model: imageModel,
    prompt: prompt,
    size: aspectRatio,
    n: 1,
  };

  console.log('[Painter] Creating image task:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  console.log('[Painter] Create task response:', response.status, responseText);

  if (!response.ok) {
    return { success: false, error: `API error: ${response.status} - ${responseText}` };
  }

  try {
    const data = JSON.parse(responseText);

    // 检查响应格式
    if (data.data && data.data[0] && data.data[0].task_id) {
      return { success: true, taskId: data.data[0].task_id };
    }

    // 也检查直接返回 task_id 的情况
    if (data.task_id) {
      return { success: true, taskId: data.task_id };
    }

    return { success: false, error: `Unexpected response format: ${responseText}` };
  } catch (e) {
    return { success: false, error: `Failed to parse response: ${responseText}` };
  }
}

/**
 * 查询任务状态
 */
async function queryTaskStatus(
  apiKey: string,
  baseUrl: string,
  taskId: string
): Promise<{ status: string; imageUrl?: string; error?: string }> {
  // apimart.ai 使用 /tasks/{task_id} 端点
  const queryUrl = `${baseUrl}/tasks/${encodeURIComponent(taskId)}`;
  console.log('[Painter] Querying task status:', queryUrl);

  const response = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const responseText = await response.text();
  console.log('[Painter] Query response:', response.status, responseText);

  if (!response.ok) {
    return { status: 'error', error: `Query error: ${response.status}` };
  }

  try {
    const data = JSON.parse(responseText);
    console.log('[Painter] Task data:', JSON.stringify(data, null, 2));

    // apimart.ai 返回嵌套结构: { code: 200, data: { status: "pending", ... } }
    const taskData = data.data || data;

    // 检查不同的状态字段名
    const status = taskData.status || taskData.state || data.status || 'unknown';
    console.log('[Painter] Parsed status:', status);

    if (status === 'completed' || status === 'success' || status === 'succeeded') {
      // apimart.ai 响应格式: { result: { images: [{ url: ["https://..."] }] } }
      // url 字段是数组，需要取第一个元素
      let imageUrl: string | undefined;

      // 首先检查 apimart.ai 的标准格式
      const images = taskData.result?.images;
      if (Array.isArray(images) && images[0]) {
        const urlField = images[0].url;
        // url 可能是数组或字符串
        imageUrl = Array.isArray(urlField) ? urlField[0] : urlField;
      }

      // 备用路径
      if (!imageUrl) {
        imageUrl = taskData.result?.image_url ||
                   taskData.result?.url ||
                   taskData.output?.image_url ||
                   taskData.output?.url ||
                   taskData.image_url ||
                   taskData.url;
      }

      // 检查 url 是否是数组
      if (Array.isArray(imageUrl)) {
        imageUrl = imageUrl[0];
      }

      console.log('[Painter] Found image URL:', imageUrl);

      if (imageUrl) {
        return { status: 'completed', imageUrl };
      }

      // 检查是否有 data 数组（嵌套在 taskData 中）
      if (Array.isArray(taskData.data) && taskData.data[0]) {
        const url = taskData.data[0].url || taskData.data[0].image_url;
        const finalUrl = Array.isArray(url) ? url[0] : url;
        if (finalUrl) {
          return { status: 'completed', imageUrl: finalUrl };
        }
      }

      console.error('[Painter] Completed but no image URL found in:', JSON.stringify(taskData, null, 2));
      return { status: 'completed', error: 'No image URL in response' };
    }

    if (status === 'failed' || status === 'error') {
      const errorMsg = taskData.error || taskData.message || data.error || data.message || 'Task failed';
      console.log('[Painter] Task failed:', errorMsg);
      return { status: 'failed', error: errorMsg };
    }

    // 还在处理中 (pending, processing, running 等)
    console.log('[Painter] Task still processing, status:', status);
    return { status: 'processing' };
  } catch (e) {
    console.error('[Painter] Parse error:', e);
    return { status: 'error', error: `Failed to parse status: ${responseText}` };
  }
}

/**
 * 使用 apimart.ai 的图像生成 API（Gemini 3 Pro Image）
 */
async function paintWithApimart(options: PaintOptions): Promise<PaintResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.apimart.ai/v1';

  if (!apiKey) {
    return {
      success: false,
      errorMessage: 'OPENAI_API_KEY not configured',
    };
  }

  try {
    const aspectRatio = getAspectRatio(options.width, options.height);
    const imageModel = options.imageModel || 'gpt-4o-image';

    // 1. 创建任务
    const createResult = await createImageTask(apiKey, baseUrl, options.prompt, aspectRatio, imageModel);

    if (!createResult.success || !createResult.taskId) {
      return {
        success: false,
        errorMessage: createResult.error || 'Failed to create task',
      };
    }

    console.log('[Painter] Task created:', createResult.taskId);

    // 2. 轮询任务状态
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const statusResult = await queryTaskStatus(apiKey, baseUrl, createResult.taskId);

      if (statusResult.status === 'completed') {
        if (statusResult.imageUrl) {
          console.log('[Painter] Image generated:', statusResult.imageUrl);
          return {
            success: true,
            imageUrl: statusResult.imageUrl,
          };
        }
        return {
          success: false,
          errorMessage: statusResult.error || 'No image URL returned',
        };
      }

      if (statusResult.status === 'failed' || statusResult.status === 'error') {
        return {
          success: false,
          errorMessage: statusResult.error || 'Task failed',
        };
      }

      // 继续轮询
      console.log(`[Painter] Still processing... (${i + 1}/${MAX_POLL_ATTEMPTS})`);
    }

    return {
      success: false,
      errorMessage: 'Timeout waiting for image generation',
    };
  } catch (error) {
    console.error('[Painter] Error:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 使用自定义供应商的图像生成 API
 */
async function paintWithCustomProvider(options: PaintOptions): Promise<PaintResult> {
  const customConfig = options.customProvider;

  if (!customConfig?.baseUrl || !customConfig?.apiKey) {
    return {
      success: false,
      errorMessage: '自定义供应商配置不完整：需要 Base URL 和 API Key',
    };
  }

  const apiKey = customConfig.apiKey;
  const baseUrl = customConfig.baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
  const model = customConfig.model || options.imageModel || 'gpt-4o-image';

  console.log(`[Painter] Using custom provider: ${customConfig.name || 'Custom'}`);
  console.log(`[Painter] Base URL: ${baseUrl}, Model: ${model}`);

  try {
    const aspectRatio = getAspectRatio(options.width, options.height);

    // 1. 创建任务
    const createResult = await createImageTask(apiKey, baseUrl, options.prompt, aspectRatio, model as ImageModel);

    if (!createResult.success || !createResult.taskId) {
      return {
        success: false,
        errorMessage: createResult.error || 'Failed to create task',
      };
    }

    console.log('[Painter] Custom provider task created:', createResult.taskId);

    // 2. 轮询任务状态
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));

      const statusResult = await queryTaskStatus(apiKey, baseUrl, createResult.taskId);

      if (statusResult.status === 'completed') {
        if (statusResult.imageUrl) {
          console.log('[Painter] Custom provider image generated:', statusResult.imageUrl);
          return {
            success: true,
            imageUrl: statusResult.imageUrl,
          };
        }
        return {
          success: false,
          errorMessage: statusResult.error || 'No image URL returned',
        };
      }

      if (statusResult.status === 'failed' || statusResult.status === 'error') {
        return {
          success: false,
          errorMessage: statusResult.error || 'Task failed',
        };
      }

      console.log(`[Painter] Custom provider still processing... (${i + 1}/${MAX_POLL_ATTEMPTS})`);
    }

    return {
      success: false,
      errorMessage: 'Timeout waiting for image generation',
    };
  } catch (error) {
    console.error('[Painter] Custom provider error:', error);
    return {
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 根据供应商选择实现
 */
async function paintWithProvider(options: PaintOptions): Promise<PaintResult> {
  const provider = options.apiProvider || 'gemini';

  switch (provider) {
    case 'gemini':
      return paintWithGemini(options);

    case 'apimart':
      return paintWithApimart(options);

    case 'custom':
      return paintWithCustomProvider(options);

    case 'openai':
      // TODO: 实现 OpenAI 官方 API
      console.log('[Painter] OpenAI provider not yet implemented, falling back to gemini');
      return paintWithGemini(options);

    case 'fal':
      // TODO: 实现 Fal.ai API
      console.log('[Painter] Fal.ai provider not yet implemented, falling back to gemini');
      return paintWithGemini(options);

    case 'replicate':
      // TODO: 实现 Replicate API
      console.log('[Painter] Replicate provider not yet implemented, falling back to gemini');
      return paintWithGemini(options);

    default:
      return paintWithGemini(options);
  }
}

/**
 * 主绘图函数（带重试）
 */
export async function paint(options: PaintOptions): Promise<PaintResult> {
  console.log(`[Painter] Using provider: ${options.apiProvider || 'apimart'}, model: ${options.imageModel || 'gpt-4o-image'}`);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const result = await paintWithProvider(options);

    if (result.success) {
      return result;
    }

    if (attempt === MAX_RETRIES) {
      return result;
    }

    console.log(`[Painter] Retrying (attempt ${attempt + 2}/${MAX_RETRIES + 1})`);
    await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
  }

  return {
    success: false,
    errorMessage: 'Max retries exceeded',
  };
}

/**
 * 批量生成图像
 */
export async function paintBatch(
  prompts: Array<{ prompt: string; negativePrompt?: string }>,
  options?: Partial<PaintOptions>
): Promise<PaintResult[]> {
  const results: PaintResult[] = [];

  for (const item of prompts) {
    const result = await paint({
      ...options,
      prompt: item.prompt,
      negativePrompt: item.negativePrompt,
    });
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * 将 base64 图像转换为 Data URL
 */
export function base64ToDataUrl(base64: string, mimeType = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}
