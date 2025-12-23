/**
 * 系统默认配置项定义
 * 注意：这个文件不能使用 'use server'，因为需要导出对象
 */

export type ConfigCategory = 'ai' | 'credits' | 'pricing' | 'limits' | 'features' | 'site';
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json';

export interface ConfigItem {
  id: string;
  category: ConfigCategory;
  key: string;
  value: string;
  valueType: ConfigValueType;
  label: string | null;
  description: string | null;
  isSecret: boolean;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// 默认配置项定义
export const DEFAULT_CONFIGS: Array<{
  category: ConfigCategory;
  key: string;
  value: string;
  valueType: ConfigValueType;
  label: string;
  description: string;
  isSecret?: boolean;
}> = [
  // AI 配置
  {
    category: 'ai',
    key: 'glm_api_key',
    value: '',
    valueType: 'string',
    label: 'GLM API Key',
    description: '智谱 GLM 大模型 API 密钥',
    isSecret: true,
  },
  {
    category: 'ai',
    key: 'glm_base_url',
    value: 'https://open.bigmodel.cn/api/paas/v4',
    valueType: 'string',
    label: 'GLM API 端点',
    description: 'GLM API 请求地址',
  },
  {
    category: 'ai',
    key: 'glm_model',
    value: 'glm-4-flash',
    valueType: 'string',
    label: '默认模型',
    description: '文本分析使用的模型',
  },
  {
    category: 'ai',
    key: 'glm_temperature',
    value: '0.7',
    valueType: 'number',
    label: '温度参数',
    description: '模型创造性程度，0-1 之间',
  },
  {
    category: 'ai',
    key: 'glm_max_tokens',
    value: '4096',
    valueType: 'number',
    label: '最大 Token',
    description: '模型输出的最大 token 数',
  },

  // 积分规则
  {
    category: 'credits',
    key: 'new_user_credits',
    value: '100',
    valueType: 'number',
    label: '新用户赠送积分',
    description: '新用户注册时赠送的积分数量',
  },
  {
    category: 'credits',
    key: 'credits_analysis',
    value: '1',
    valueType: 'number',
    label: '内容分析消耗',
    description: '每次内容分析消耗的积分',
  },
  {
    category: 'credits',
    key: 'credits_image',
    value: '5',
    valueType: 'number',
    label: '图片生成消耗',
    description: '每张图片生成消耗的积分',
  },
  {
    category: 'credits',
    key: 'credits_expiration_days',
    value: '30',
    valueType: 'number',
    label: '积分过期天数',
    description: '购买的积分有效期（天）',
  },
  {
    category: 'credits',
    key: 'invite_reward',
    value: '50',
    valueType: 'number',
    label: '邀请奖励',
    description: '成功邀请新用户获得的积分',
  },

  // 价格套餐
  {
    category: 'pricing',
    key: 'packages',
    value: JSON.stringify([
      { id: 'starter', name: '入门包', credits: 100, price: 9.9, currency: 'CNY' },
      { id: 'standard', name: '标准包', credits: 500, price: 39.9, currency: 'CNY' },
      { id: 'premium', name: '高级包', credits: 1200, price: 79.9, currency: 'CNY' },
      { id: 'ultimate', name: '旗舰包', credits: 3000, price: 169.9, currency: 'CNY' },
    ]),
    valueType: 'json',
    label: '积分套餐',
    description: '用户可购买的积分套餐列表',
  },

  // 生成限制
  {
    category: 'limits',
    key: 'max_input_length',
    value: '10000',
    valueType: 'number',
    label: '最大输入长度',
    description: '输入文本的最大字符数',
  },
  {
    category: 'limits',
    key: 'min_input_length',
    value: '10',
    valueType: 'number',
    label: '最小输入长度',
    description: '输入文本的最小字符数',
  },
  {
    category: 'limits',
    key: 'max_sections_per_card',
    value: '4',
    valueType: 'number',
    label: '每卡片最大 Section 数',
    description: '每张卡片的最大 Section 数量',
  },
  {
    category: 'limits',
    key: 'compact_mode_max_cards',
    value: '1',
    valueType: 'number',
    label: '精简模式最大卡片数',
    description: '精简模式强制的最大卡片数',
  },
  {
    category: 'limits',
    key: 'daily_generation_limit',
    value: '50',
    valueType: 'number',
    label: '每日生成上限',
    description: '每个用户每日最大生成次数（0=不限制）',
  },

  // 功能开关
  {
    category: 'features',
    key: 'maintenance_mode',
    value: 'false',
    valueType: 'boolean',
    label: '维护模式',
    description: '开启后暂停服务，显示维护页面',
  },
  {
    category: 'features',
    key: 'registration_enabled',
    value: 'true',
    valueType: 'boolean',
    label: '开放注册',
    description: '是否允许新用户注册',
  },
  {
    category: 'features',
    key: 'payment_enabled',
    value: 'true',
    valueType: 'boolean',
    label: '支付功能',
    description: '是否开启支付购买积分',
  },
  {
    category: 'features',
    key: 'invite_enabled',
    value: 'true',
    valueType: 'boolean',
    label: '邀请功能',
    description: '是否开启邀请好友功能',
  },
  {
    category: 'features',
    key: 'plaza_enabled',
    value: 'true',
    valueType: 'boolean',
    label: '作品广场',
    description: '是否开启作品广场功能',
  },

  // 站点信息
  {
    category: 'site',
    key: 'site_name',
    value: 'NoteDraw',
    valueType: 'string',
    label: '站点名称',
    description: '网站显示名称',
  },
  {
    category: 'site',
    key: 'support_email',
    value: 'support@notedraw.com',
    valueType: 'string',
    label: '客服邮箱',
    description: '用户反馈联系邮箱',
  },
  {
    category: 'site',
    key: 'announcement',
    value: '',
    valueType: 'string',
    label: '公告内容',
    description: '首页显示的公告信息（留空不显示）',
  },
  {
    category: 'site',
    key: 'footer_icp',
    value: '',
    valueType: 'string',
    label: 'ICP 备案号',
    description: '网站底部 ICP 备案号',
  },
];
