/**
 * NoteDraw AI Types
 * 视觉笔记生成的类型定义
 */

// 视觉风格
export type VisualStyle = 'sketch' | 'business' | 'cute' | 'minimal' | 'chalkboard';

// API 供应商
export type APIProvider = 'gemini' | 'apimart' | 'fal' | 'replicate' | 'openai' | 'custom';

// 图像生成模型
export type ImageModel = 'gemini-2.0-flash-preview-image-generation' | 'gpt-4o-image' | 'gemini-3-pro-image-preview' | 'flux-pro' | 'dall-e-3';

// 文本处理模型
export type TextModel = 'gpt-4o-mini' | 'gpt-4o' | 'deepseek-chat' | 'glm-4-flash';

// 语言
export type Language = 'en' | 'zh';

// 生成模式
export type GenerateMode = 'compact' | 'detailed';

// 自定义供应商配置
export interface CustomProviderConfig {
  name: string;
  baseUrl: string;
  apiKey: string;
  model?: string; // 可选的自定义模型名
}

// AI 配置
export interface AIConfig {
  apiProvider: APIProvider;
  imageModel: ImageModel;
  textModel: TextModel;
  usePlaceholder?: boolean; // 是否使用占位图（开发调试用）
  customProvider?: CustomProviderConfig; // 自定义供应商配置
}

// 项目状态
export type ProjectStatus = 'draft' | 'processing' | 'completed' | 'failed';

// 卡片状态
export type CardStatus = 'pending' | 'generating' | 'completed' | 'failed';

// 内容模块（结构化后的单个知识点）
export interface ContentModule {
  id: string;
  heading: string;
  content: string;
  keywords?: string[];
}

// 左脑数据（结构化分析结果）
export interface LeftBrainData {
  title: string;
  summary_context: string;
  visual_theme_keywords: string;
  modules: ContentModule[];
}

// 右脑数据（绘图指令）
export interface RightBrainData {
  prompt: string;
  negativePrompt?: string;
}

// 笔记单元（一张卡片的完整数据）
export interface NoteUnit {
  id: string;
  order: number;
  originalText: string;
  structure?: LeftBrainData;
  prompt?: string;
  imageUrl?: string;
  status: CardStatus;
  errorMessage?: string;
}

// 生成请求
export interface GenerateRequest {
  inputText: string;
  language: Language;
  visualStyle: VisualStyle;
  generateMode?: GenerateMode;
  aiConfig?: AIConfig;
  signature?: string; // 署名（显示在图片右下角）
}

// 生成结果
export interface GenerateResult {
  success: boolean;
  units: NoteUnit[];
  errorMessage?: string;
}

// AI 角色消息
export interface AgentMessage {
  role: 'organizer' | 'designer' | 'painter';
  content: string;
  timestamp: Date;
  status: 'thinking' | 'completed' | 'error';
}

// 处理进度
export interface ProcessProgress {
  stage: 'splitting' | 'organizing' | 'designing' | 'painting' | 'done';
  currentUnit: number;
  totalUnits: number;
  messages: AgentMessage[];
}
