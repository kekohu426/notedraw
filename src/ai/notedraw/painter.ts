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
// 优化：使用指数退避轮询，初始更快，后续逐渐放慢
const INITIAL_POLL_INTERVAL = 1000; // 初始1秒
const MAX_POLL_INTERVAL = 5000; // 最大5秒
const MAX_POLL_ATTEMPTS = 30; // 减少到30次（约1分钟）

// 计算轮询间隔（指数退避）
function getPollInterval(attempt: number): number {
  const interval = INITIAL_POLL_INTERVAL * Math.pow(1.3, attempt);
  return Math.min(interval, MAX_POLL_INTERVAL);
}

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

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();

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

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return { success: false, error: `API error: ${response.status}` };
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

    return { success: false, error: 'Unexpected response format' };
  } catch (e) {
    return { success: false, error: 'Failed to parse response' };
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

  const response = await fetch(queryUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    return { status: 'error', error: `Query error: ${response.status}` };
  }

  try {
    const data = JSON.parse(responseText);

    // apimart.ai 返回嵌套结构: { code: 200, data: { status: "pending", ... } }
    const taskData = data.data || data;

    // 检查不同的状态字段名
    const status = taskData.status || taskData.state || data.status || 'unknown';

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

      return { status: 'completed', error: 'No image URL in response' };
    }

    if (status === 'failed' || status === 'error') {
      const errorMsg = taskData.error || taskData.message || data.error || data.message || 'Task failed';
      return { status: 'failed', error: errorMsg };
    }

    // 还在处理中 (pending, processing, running 等)
    return { status: 'processing' };
  } catch (e) {
    return { status: 'error', error: 'Failed to parse status response' };
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

    // 2. 轮询任务状态（使用指数退避）
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const interval = getPollInterval(i);
      await new Promise(resolve => setTimeout(resolve, interval));

      const statusResult = await queryTaskStatus(apiKey, baseUrl, createResult.taskId);

      if (statusResult.status === 'completed') {
        if (statusResult.imageUrl) {
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
    }

    return {
      success: false,
      errorMessage: 'Timeout waiting for image generation',
    };
  } catch (error) {
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

    // 2. 轮询任务状态（使用指数退避）
    for (let i = 0; i < MAX_POLL_ATTEMPTS; i++) {
      const interval = getPollInterval(i);
      await new Promise(resolve => setTimeout(resolve, interval));

      const statusResult = await queryTaskStatus(apiKey, baseUrl, createResult.taskId);

      if (statusResult.status === 'completed') {
        if (statusResult.imageUrl) {
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
    }

    return {
      success: false,
      errorMessage: 'Timeout waiting for image generation',
    };
  } catch (error) {
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
      // 暂未实现，回退到gemini
      return paintWithGemini(options);

    case 'fal':
      // 暂未实现，回退到gemini
      return paintWithGemini(options);

    case 'replicate':
      // 暂未实现，回退到gemini
      return paintWithGemini(options);

    default:
      return paintWithGemini(options);
  }
}

/**
 * 生成占位图片（开发模式）
 * 返回一个带有提示词文字的SVG占位图
 */
function generatePlaceholderImage(prompt: string): string {
  const truncatedPrompt = prompt.length > 200 ? prompt.substring(0, 200) + '...' : prompt;
  const escapedPrompt = truncatedPrompt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f0f9ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e0f2fe;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="20" y="20" width="760" height="560" rx="16" fill="white" stroke="#94a3b8" stroke-width="2" stroke-dasharray="8,4"/>
  <text x="400" y="80" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="bold" fill="#0369a1">🎨 开发占位模式</text>
  <text x="400" y="120" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#64748b">DEV_PLACEHOLDER_MODE=true</text>
  <line x1="60" y1="150" x2="740" y2="150" stroke="#e2e8f0" stroke-width="1"/>
  <text x="60" y="180" font-family="system-ui, sans-serif" font-size="14" font-weight="600" fill="#334155">生成提示词 (Prompt):</text>
  <foreignObject x="60" y="200" width="680" height="340">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: monospace; font-size: 12px; color: #475569; word-wrap: break-word; white-space: pre-wrap; line-height: 1.5; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">${escapedPrompt}</div>
  </foreignObject>
</svg>`.trim();

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * 主绘图函数（带重试）
 */
export async function paint(options: PaintOptions): Promise<PaintResult> {
  // 开发占位模式：跳过真实API调用
  if (process.env.DEV_PLACEHOLDER_MODE === 'true') {
    console.log('[Painter] DEV_PLACEHOLDER_MODE: returning placeholder image');
    const placeholderUrl = generatePlaceholderImage(options.prompt);
    return {
      success: true,
      imageUrl: placeholderUrl,
    };
  }

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
