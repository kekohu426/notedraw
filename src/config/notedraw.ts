/**
 * NoteDraw Configuration
 * 集中管理视觉笔记生成的各项限制和参数
 */

/**
 * 文本长度限制配置
 */
export const TEXT_LIMITS = {
    /**
     * 输入文本的最大长度（字符）
     * 建议范围：5000-15000
     * 过长的文本会影响AI处理速度和质量
     */
    MAX_INPUT_LENGTH: parseInt(process.env.NOTEDRAW_MAX_INPUT_LENGTH || '10000', 10),

    /**
     * 从URL抓取内容的最大长度（字符）
     * 建议与 MAX_INPUT_LENGTH 保持一致
     */
    MAX_URL_CONTENT_LENGTH: parseInt(process.env.NOTEDRAW_MAX_URL_LENGTH || '10000', 10),

    /**
     * 最小文本长度（字符）
     * 太短的文本可能无法生成有意义的视觉笔记
     */
    MIN_INPUT_LENGTH: parseInt(process.env.NOTEDRAW_MIN_INPUT_LENGTH || '10', 10),
} as const;

/**
 * 卡片生成限制
 */
export const CARD_LIMITS = {
    /**
     * 每张卡片的最大 Section 数量
     */
    MAX_SECTIONS_PER_CARD: parseInt(process.env.NOTEDRAW_MAX_SECTIONS || '4', 10),

    /**
     * 精简模式强制的最大卡片数
     */
    COMPACT_MODE_MAX_CARDS: parseInt(process.env.NOTEDRAW_COMPACT_MAX_CARDS || '1', 10),
} as const;

/**
 * 积分消耗配置
 */
export const CREDIT_COSTS = {
    /**
     * 内容分析的积分消耗
     */
    ANALYSIS: parseInt(process.env.NOTEDRAW_CREDITS_ANALYSIS || '1', 10),

    /**
     * 每张图片生成的积分消耗
     */
    IMAGE_GENERATION: parseInt(process.env.NOTEDRAW_CREDITS_IMAGE || '5', 10),
} as const;

/**
 * 获取所有配置的摘要（用于调试）
 */
export function getNotedrawConfig() {
    return {
        textLimits: TEXT_LIMITS,
        cardLimits: CARD_LIMITS,
        creditCosts: CREDIT_COSTS,
    };
}
