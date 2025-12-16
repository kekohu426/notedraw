/**
 * 用户友好的错误消息映射
 * User-friendly error message mapping
 */

type Locale = 'en' | 'zh';

interface ErrorMapping {
  pattern: RegExp | string;
  messages: {
    en: string;
    zh: string;
  };
}

const ERROR_MAPPINGS: ErrorMapping[] = [
  // 积分相关
  {
    pattern: /insufficient credits/i,
    messages: {
      en: 'Not enough credits. Please top up to continue.',
      zh: '积分不足，请充值后继续使用。',
    },
  },
  // 权限相关
  {
    pattern: /unauthorized/i,
    messages: {
      en: 'You do not have permission to perform this action.',
      zh: '您没有权限执行此操作。',
    },
  },
  // 资源不存在
  {
    pattern: /not found/i,
    messages: {
      en: 'The requested resource was not found.',
      zh: '请求的资源不存在。',
    },
  },
  // 网络错误
  {
    pattern: /network|fetch|timeout|ECONNREFUSED|ETIMEDOUT/i,
    messages: {
      en: 'Network error. Please check your connection and try again.',
      zh: '网络连接失败，请检查网络后重试。',
    },
  },
  // 速率限制
  {
    pattern: /rate limit|too many requests|429/i,
    messages: {
      en: 'Too many requests. Please wait a moment and try again.',
      zh: '请求过于频繁，请稍后再试。',
    },
  },
  // API 错误
  {
    pattern: /api error|service unavailable|503|500/i,
    messages: {
      en: 'Service temporarily unavailable. Please try again later.',
      zh: '服务暂时不可用，请稍后重试。',
    },
  },
  // 图片生成失败
  {
    pattern: /image generation|paint|painting failed/i,
    messages: {
      en: 'Image generation failed. Try adjusting your prompt.',
      zh: '图片生成失败，请尝试调整描述内容。',
    },
  },
  // 内容审核
  {
    pattern: /content policy|moderation|inappropriate|blocked/i,
    messages: {
      en: 'Content does not comply with usage policy. Please revise.',
      zh: '内容不符合使用规范，请修改后重试。',
    },
  },
  // 输入过长
  {
    pattern: /too long|max length|character limit/i,
    messages: {
      en: 'Input text is too long. Please shorten it.',
      zh: '输入内容过长，请缩短后重试。',
    },
  },
  // 分析失败
  {
    pattern: /analysis failed|organize|organizer/i,
    messages: {
      en: 'Content analysis failed. Try rephrasing your text.',
      zh: '内容分析失败，请尝试调整文本表述。',
    },
  },
];

/**
 * 将错误消息转换为用户友好的本地化消息
 */
export function getUserFriendlyError(error: string | Error | unknown, locale: Locale = 'en'): string {
  // 提取错误消息字符串
  let errorMessage: string;
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'string') {
    errorMessage = error;
  } else {
    errorMessage = String(error);
  }

  // 遍历映射查找匹配
  for (const mapping of ERROR_MAPPINGS) {
    const { pattern, messages } = mapping;
    const isMatch = typeof pattern === 'string'
      ? errorMessage.toLowerCase().includes(pattern.toLowerCase())
      : pattern.test(errorMessage);

    if (isMatch) {
      return messages[locale];
    }
  }

  // 默认错误消息
  return locale === 'zh'
    ? '操作失败，请稍后重试。'
    : 'Something went wrong. Please try again.';
}

/**
 * 获取错误状态的图标
 */
export function getErrorIcon(error: string): string {
  // 匹配积分相关（中英文）
  if (/insufficient credits|积分不足|not enough credits/i.test(error)) return '💰';
  // 匹配网络相关
  if (/network|timeout|网络|连接/i.test(error)) return '🌐';
  // 匹配速率限制
  if (/rate limit|too many|频繁|等待/i.test(error)) return '⏰';
  // 匹配内容审核
  if (/content policy|moderation|不符合|规范/i.test(error)) return '🚫';
  // 匹配服务不可用
  if (/unavailable|service|服务|稍后/i.test(error)) return '🔧';
  return '❌';
}
