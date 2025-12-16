/**
 * NoteDraw AI Prompts
 * AI 提示词模板
 *
 * Prompt构建Agent：负责将结构化数据转换为绘图指令
 * 参考V1的Visual Note Architect输出模板
 */

import type { Language, VisualStyle, LeftBrainData } from './types';
import { getStyleConfig } from './styles';

/**
 * 生成绘图 Prompt（Prompt构建Agent核心函数）
 *
 * 输入：结构化数据 + 用户配置（风格、语言、署名）
 * 输出：符合V1模板的完整绘图指令
 */
export function generateImagePrompt(
  structure: LeftBrainData,
  style: VisualStyle,
  language: Language,
  signature: string = '娇姐手绘整理'
): string {
  const styleConfig = getStyleConfig(style);
  const sectionCount = structure.modules.length;

  // 构建Sections描述（只用heading + keywords，不用content/summary）
  // 视觉笔记原则：图片是索引，不是全文
  const sectionsPrompt = structure.modules.map((module, index) => {
    const keywords = module.keywords?.slice(0, 3) || [];
    // keywords是可理解的短语，直接作为文字显示
    const keyPhrases = keywords.map(k => `"${k}"`).join(', ');

    return `
Section ${index + 1}: "${module.heading}"
Icon: A cute hand-drawn icon representing "${module.heading}"
Text labels: ${keyPhrases}`;
  }).join('\n');

  // 构建完整的Prompt（参考V1模板）
  const prompt = `
A cute hand-drawn notebook style infographic showing "${structure.title}".

Main title: "${structure.title}"

${sectionCount} main sections with cute icons:
${sectionsPrompt}

Center connecting element: "${structure.summary_context}" with flowing arrows connecting all sections

Bottom right corner: "${signature}"

Style: ${styleConfig.promptKeywords}
Color palette: ${styleConfig.colorPalette}

Design requirements:
- Hand-drawn sketchy lines with warm, personal feel
- Clear visual hierarchy with the title at top
- Each section has its own cute icon and section title
- Display the text labels clearly in each section (readable short phrases)
- Text in speech bubbles or text boxes with clean handwritten font
- Balanced layout: icons + text labels, not too crowded
- Clean and easy to scan at a glance
- Aspect ratio: 3:4 (portrait, suitable for mobile)
- Theme: ${structure.visual_theme_keywords}
`.trim();

  return prompt;
}

/**
 * 生成精简版Prompt（用于compact模式）
 * 更简洁，适合内容较少的情况
 */
export function generateCompactPrompt(
  structure: LeftBrainData,
  style: VisualStyle,
  signature: string = '娇姐手绘整理'
): string {
  const styleConfig = getStyleConfig(style);

  // 提取所有关键词
  const allKeywords = structure.modules
    .flatMap(m => m.keywords || [])
    .slice(0, 6);

  const keywordsDisplay = allKeywords.map(k => `"${k}"`).join(', ');

  const prompt = `
A cute hand-drawn visual note card about "${structure.title}".

Central focus: ${structure.summary_context}

Key points displayed with cute icons:
${keywordsDisplay}

Bottom right corner: "${signature}"

Style: ${styleConfig.promptKeywords}
Colors: ${styleConfig.colorPalette}

Requirements:
- Single cohesive illustration
- Hand-drawn aesthetic with warm colors
- Clear, readable text labels
- Aspect ratio: 3:4
`.trim();

  return prompt;
}

/**
 * 获取负面提示词
 */
export function getNegativePrompt(style: VisualStyle): string {
  const styleConfig = getStyleConfig(style);
  return `${styleConfig.negativePrompt}, blurry, low quality, distorted text, watermark, multiple frames, comic panels, photo-realistic`;
}

// ============================================================================
// 以下是保留的旧函数（为兼容性保留，但已标记废弃）
// ============================================================================

/** @deprecated 此函数已废弃，逻辑已移至organizer.ts */
export function getSplitDecisionPrompt(text: string, language: Language): string {
  console.warn('[prompts] getSplitDecisionPrompt is deprecated');
  return '';
}

/** @deprecated 此函数已废弃，逻辑已移至organizer.ts */
export function getOrganizerPrompt(text: string, language: Language): string {
  console.warn('[prompts] getOrganizerPrompt is deprecated');
  return '';
}
