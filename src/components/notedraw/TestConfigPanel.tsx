'use client';

import { useState } from 'react';
import { Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AIConfig, ImageModel, TextModel, APIProvider, CustomProviderConfig } from '@/ai/notedraw/types';

// API 供应商选项
const API_PROVIDERS: { id: APIProvider; name: string; description: string }[] = [
  { id: 'gemini', name: 'Gemini', description: 'Google Gemini 图像生成' },
  { id: 'apimart', name: 'APIMart', description: '国内可用，支持多模型' },
  { id: 'openai', name: 'OpenAI', description: '官方 API' },
  { id: 'fal', name: 'Fal.ai', description: 'Flux 模型' },
  { id: 'replicate', name: 'Replicate', description: '开源模型平台' },
  { id: 'custom', name: '自定义', description: '配置任意 API' },
];

// 图像模型选项（按供应商分组）
const IMAGE_MODELS_BY_PROVIDER: Record<APIProvider, { id: ImageModel; name: string; price: string }[]> = {
  gemini: [
    { id: 'gemini-2.0-flash-preview-image-generation', name: 'Gemini 2.0 Flash Image', price: '免费' },
  ],
  apimart: [
    { id: 'gpt-4o-image', name: 'GPT-4o Image', price: '$0.006/张' },
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', price: '$0.10/张' },
    { id: 'flux-pro', name: 'Flux Pro', price: '$0.05/张' },
  ],
  openai: [
    { id: 'dall-e-3', name: 'DALL-E 3', price: '$0.04/张' },
    { id: 'gpt-4o-image', name: 'GPT-4o Image', price: '$0.02/张' },
  ],
  fal: [
    { id: 'flux-pro', name: 'Flux Pro', price: '$0.05/张' },
  ],
  replicate: [
    { id: 'flux-pro', name: 'Flux Pro', price: '$0.03/张' },
  ],
  custom: [
    { id: 'gpt-4o-image', name: '自定义模型', price: '自定义' },
  ],
};

// 文本模型选项
const TEXT_MODELS: { id: TextModel; name: string; price: string }[] = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', price: '便宜' },
  { id: 'gpt-4o', name: 'GPT-4o', price: '贵' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', price: '最便宜' },
];

interface TestConfigPanelProps {
  config: AIConfig;
  onChange: (config: AIConfig) => void;
  disabled?: boolean;
  locale?: 'en' | 'zh';
}

export function TestConfigPanel({
  config,
  onChange,
  disabled = false,
  locale = 'en',
}: TestConfigPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-dashed border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
      {/* 折叠头部 */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-3 text-left"
        disabled={disabled}
      >
        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
          <Settings className="h-4 w-4" />
          <span className="text-sm font-medium">
            {locale === 'zh' ? '测试配置' : 'Test Config'}
          </span>
          <span className="rounded bg-orange-200 px-1.5 py-0.5 text-xs dark:bg-orange-900">
            DEV
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-orange-600 dark:text-orange-500">
            {config.apiProvider} / {config.imageModel} / {config.textModel}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-orange-600" />
          ) : (
            <ChevronDown className="h-4 w-4 text-orange-600" />
          )}
        </div>
      </button>

      {/* 展开内容 */}
      {isExpanded && (
        <div className="space-y-4 border-t border-orange-200 p-4 dark:border-orange-800">
          {/* API 供应商选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-orange-800 dark:text-orange-300">
              {locale === 'zh' ? 'API 供应商' : 'API Provider'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {API_PROVIDERS.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    // 切换供应商时，自动选择该供应商的第一个可用模型
                    const availableModels = IMAGE_MODELS_BY_PROVIDER[provider.id];
                    const newImageModel = availableModels[0]?.id || 'gpt-4o-image';
                    onChange({ ...config, apiProvider: provider.id, imageModel: newImageModel });
                  }}
                  className={cn(
                    'flex flex-col items-start rounded-md border p-2 text-left transition-all',
                    'hover:border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    config.apiProvider === provider.id
                      ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/50'
                      : 'border-orange-200 bg-white dark:border-orange-800 dark:bg-transparent'
                  )}
                >
                  <span className="text-sm font-medium">{provider.name}</span>
                  <span className="text-xs text-muted-foreground">{provider.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 自定义供应商配置 */}
          {config.apiProvider === 'custom' && (
            <div className="space-y-3 rounded-md border border-orange-300 bg-white p-3 dark:border-orange-700 dark:bg-orange-950/50">
              <div className="space-y-1">
                <label className="text-xs font-medium text-orange-800 dark:text-orange-300">
                  {locale === 'zh' ? '供应商名称' : 'Provider Name'}
                </label>
                <input
                  type="text"
                  value={config.customProvider?.name || ''}
                  onChange={(e) => onChange({
                    ...config,
                    customProvider: { ...config.customProvider, name: e.target.value } as CustomProviderConfig
                  })}
                  placeholder="My API Provider"
                  className="w-full rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm focus:border-orange-400 focus:outline-none dark:border-orange-700 dark:bg-orange-950"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-orange-800 dark:text-orange-300">
                  Base URL
                </label>
                <input
                  type="text"
                  value={config.customProvider?.baseUrl || ''}
                  onChange={(e) => onChange({
                    ...config,
                    customProvider: { ...config.customProvider, baseUrl: e.target.value } as CustomProviderConfig
                  })}
                  placeholder="https://api.example.com/v1"
                  className="w-full rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-orange-400 focus:outline-none dark:border-orange-700 dark:bg-orange-950"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-orange-800 dark:text-orange-300">
                  API Key
                </label>
                <input
                  type="password"
                  value={config.customProvider?.apiKey || ''}
                  onChange={(e) => onChange({
                    ...config,
                    customProvider: { ...config.customProvider, apiKey: e.target.value } as CustomProviderConfig
                  })}
                  placeholder="sk-..."
                  className="w-full rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-orange-400 focus:outline-none dark:border-orange-700 dark:bg-orange-950"
                  disabled={disabled}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-orange-800 dark:text-orange-300">
                  {locale === 'zh' ? '模型名称（可选）' : 'Model Name (Optional)'}
                </label>
                <input
                  type="text"
                  value={config.customProvider?.model || ''}
                  onChange={(e) => onChange({
                    ...config,
                    customProvider: { ...config.customProvider, model: e.target.value } as CustomProviderConfig
                  })}
                  placeholder="gpt-4o-image"
                  className="w-full rounded-md border border-orange-200 bg-white px-3 py-1.5 text-sm font-mono focus:border-orange-400 focus:outline-none dark:border-orange-700 dark:bg-orange-950"
                  disabled={disabled}
                />
              </div>
              <p className="text-xs text-orange-500">
                {locale === 'zh'
                  ? '⚠️ API Key 仅在浏览器中使用，不会发送到服务器'
                  : '⚠️ API Key is only used in browser, never sent to server'}
              </p>
            </div>
          )}

          {/* 图像模型选择（基于所选供应商） */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-orange-800 dark:text-orange-300">
              {locale === 'zh' ? '图像生成模型' : 'Image Model'}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {IMAGE_MODELS_BY_PROVIDER[config.apiProvider].map((model) => (
                <button
                  key={model.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...config, imageModel: model.id })}
                  className={cn(
                    'flex flex-col items-start rounded-md border p-2 text-left transition-all',
                    'hover:border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    config.imageModel === model.id
                      ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/50'
                      : 'border-orange-200 bg-white dark:border-orange-800 dark:bg-transparent'
                  )}
                >
                  <span className="text-sm font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 文本模型选择 */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-orange-800 dark:text-orange-300">
              {locale === 'zh' ? '文本处理模型' : 'Text Model'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TEXT_MODELS.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...config, textModel: model.id })}
                  className={cn(
                    'flex flex-col items-start rounded-md border p-2 text-left transition-all',
                    'hover:border-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/50',
                    'disabled:cursor-not-allowed disabled:opacity-50',
                    config.textModel === model.id
                      ? 'border-orange-500 bg-orange-100 dark:bg-orange-900/50'
                      : 'border-orange-200 bg-white dark:border-orange-800 dark:bg-transparent'
                  )}
                >
                  <span className="text-sm font-medium">{model.name}</span>
                  <span className="text-xs text-muted-foreground">{model.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 提示信息 */}
          <p className="text-xs text-orange-600 dark:text-orange-500">
            {locale === 'zh'
              ? '⚠️ 此配置仅在开发测试阶段显示，正式上线前会移除'
              : '⚠️ This config panel is for testing only and will be removed before production'}
          </p>
        </div>
      )}
    </div>
  );
}

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  apiProvider: 'gemini',
  imageModel: 'gemini-2.0-flash-preview-image-generation',
  textModel: 'gpt-4o-mini',
};
