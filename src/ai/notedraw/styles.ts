/**
 * NoteDraw Visual Styles
 * 5种视觉风格配置
 */

import type { VisualStyle } from './types';

export interface StyleConfig {
  id: VisualStyle;
  name: {
    en: string;
    zh: string;
  };
  description: {
    en: string;
    zh: string;
  };
  icon: string;
  previewImage?: string; // 预览图路径
  previewColors: string[]; // 预览色块（当无图片时使用）
  promptKeywords: string;
  colorPalette: string;
  negativePrompt: string;
}

export const VISUAL_STYLES: Record<VisualStyle, StyleConfig> = {
  sketch: {
    id: 'sketch',
    name: {
      en: 'Hand-drawn Sketch',
      zh: '手绘清新',
    },
    description: {
      en: 'Warm marker style with soft colors and doodle elements',
      zh: '马克笔手绘风格，柔和配色，涂鸦元素',
    },
    icon: '✏️',
    previewColors: ['#FFE4E1', '#98D8C8', '#F7DC6F', '#AED6F1'],
    promptKeywords: 'hand-drawn style, marker pen illustration, soft pastel colors, cute doodles, warm and friendly, sketch notes style, whiteboard illustration',
    colorPalette: 'soft pastels, warm tones, mint green, coral pink, light blue',
    negativePrompt: 'photorealistic, 3D render, dark colors, complex gradients',
  },
  business: {
    id: 'business',
    name: {
      en: 'Professional Business',
      zh: '商务专业',
    },
    description: {
      en: 'Clean lines with navy blue palette and icon-based design',
      zh: '简洁线条，深蓝配色，图标化设计',
    },
    icon: '💼',
    previewColors: ['#1E3A5F', '#FFFFFF', '#D4AF37', '#E8E8E8'],
    promptKeywords: 'professional infographic, clean minimal design, corporate style, navy blue and white, icon-based, data visualization, business presentation',
    colorPalette: 'navy blue, white, light gray, accent gold',
    negativePrompt: 'cartoon, childish, hand-drawn, messy',
  },
  cute: {
    id: 'cute',
    name: {
      en: 'Cute Illustration',
      zh: '可爱插画',
    },
    description: {
      en: 'Cartoon characters with rainbow colors and sticker-like feel',
      zh: '卡通人物，彩虹配色，贴纸感',
    },
    icon: '🌈',
    previewColors: ['#FFB6C1', '#FFFACD', '#DDA0DD', '#87CEEB'],
    promptKeywords: 'kawaii style, cute cartoon illustration, rainbow colors, sticker art, chibi characters, playful design, social media friendly',
    colorPalette: 'rainbow colors, pink, yellow, light purple, bright and cheerful',
    negativePrompt: 'realistic, dark, serious, corporate',
  },
  minimal: {
    id: 'minimal',
    name: {
      en: 'Minimal Line Art',
      zh: '极简线稿',
    },
    description: {
      en: 'Black and white lines with geometric shapes and whitespace',
      zh: '黑白线条，几何形状，大量留白',
    },
    icon: '⚪',
    previewColors: ['#FFFFFF', '#2C2C2C', '#E0E0E0', '#F5F5F5'],
    promptKeywords: 'minimalist line art, black and white, geometric shapes, lots of white space, clean typography, modern design, abstract',
    colorPalette: 'black, white, light gray',
    negativePrompt: 'colorful, detailed, complex, busy',
  },
  chalkboard: {
    id: 'chalkboard',
    name: {
      en: 'Vintage Chalkboard',
      zh: '复古黑板',
    },
    description: {
      en: 'Chalkboard background with chalk text and hand-written feel',
      zh: '黑板背景，粉笔字，手写风格',
    },
    icon: '📚',
    previewColors: ['#2D4A3E', '#FFFFFF', '#F4D03F', '#E8DAEF'],
    promptKeywords: 'chalkboard style, chalk drawing, blackboard background, hand-written text, educational, vintage classroom, teacher notes',
    colorPalette: 'dark green or black background, white and colored chalk',
    negativePrompt: 'digital, modern, clean lines, bright colors',
  },
};

/**
 * 获取风格配置
 */
export function getStyleConfig(style: VisualStyle): StyleConfig {
  return VISUAL_STYLES[style];
}

/**
 * 获取所有风格列表
 */
export function getAllStyles(): StyleConfig[] {
  return Object.values(VISUAL_STYLES);
}

/**
 * 获取默认风格
 */
export function getDefaultStyle(): VisualStyle {
  return 'sketch';
}
