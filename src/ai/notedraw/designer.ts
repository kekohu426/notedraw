/**
 * NoteDraw Designer (Prompt构建Agent)
 * 负责将结构化数据转换为绘图Prompt
 */

import type { Language, LeftBrainData, RightBrainData, VisualStyle, GenerateMode } from './types';
import { generateImagePrompt, generateCompactPrompt, getNegativePrompt } from './prompts';

/**
 * 为单个结构化数据生成绘图指令
 */
export function designPrompt(
  structure: LeftBrainData,
  style: VisualStyle,
  language: Language,
  mode: GenerateMode = 'detailed',
  signature: string = '娇姐手绘整理'
): RightBrainData {
  // 根据模式选择不同的prompt生成函数
  const prompt = mode === 'compact'
    ? generateCompactPrompt(structure, style, signature)
    : generateImagePrompt(structure, style, language, signature);

  const negativePrompt = getNegativePrompt(style);

  return {
    prompt,
    negativePrompt,
  };
}

/**
 * 批量生成绘图指令
 */
export function designPrompts(
  structures: LeftBrainData[],
  style: VisualStyle,
  language: Language,
  mode: GenerateMode = 'detailed',
  signature: string = '娇姐手绘整理'
): RightBrainData[] {
  return structures.map(structure =>
    designPrompt(structure, style, language, mode, signature)
  );
}

/**
 * 优化 Prompt（根据风格添加强调）
 */
export function optimizePromptForStyle(
  basePrompt: string,
  style: VisualStyle
): string {
  const styleEmphasis: Record<VisualStyle, string> = {
    sketch: 'Make it look hand-drawn with visible pen strokes and a warm, personal feel.',
    business: 'Keep it professional and polished with precise alignment and corporate aesthetics.',
    cute: 'Add adorable characters and playful elements that make learning fun.',
    minimal: 'Embrace negative space and let the design breathe with elegant simplicity.',
    chalkboard: 'Create an authentic classroom feel with chalk texture and educational charm.',
  };

  return `${basePrompt}\n\nSTYLE EMPHASIS: ${styleEmphasis[style]}`;
}

/**
 * 根据内容长度判断复杂度
 */
export function adjustPromptComplexity(
  structure: LeftBrainData
): 'simple' | 'medium' | 'complex' {
  const moduleCount = structure.modules.length;
  const totalContentLength = structure.modules.reduce(
    (sum, m) => sum + m.content.length,
    0
  );

  if (moduleCount <= 2 && totalContentLength < 200) {
    return 'simple';
  }
  if (moduleCount <= 3 && totalContentLength < 400) {
    return 'medium';
  }
  return 'complex';
}

/**
 * 格式化Prompt以适应不同的图像生成服务
 */
export function formatPromptForProvider(
  prompt: string,
  provider: 'gemini' | 'replicate' | 'fal' | 'openai' | 'apimart'
): string {
  switch (provider) {
    case 'gemini':
    case 'apimart':
      // Gemini 偏好自然描述
      return prompt;

    case 'replicate':
      // Replicate (Stable Diffusion) 可以接受技术性 prompt
      return `${prompt}\n\nQuality tags: masterpiece, best quality, highly detailed`;

    case 'fal':
      return `${prompt}\n\nhigh quality, detailed illustration`;

    case 'openai':
      // DALL-E 偏好简洁描述
      return prompt.split('\n').slice(0, 10).join('\n');

    default:
      return prompt;
  }
}
