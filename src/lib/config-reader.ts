/**
 * 配置读取工具
 * 从数据库读取系统配置，带缓存
 */

import { getDb } from '@/db';
import { systemConfig } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// 缓存配置
let configCache: Map<string, string> | null = null;
let configCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟缓存

/**
 * 获取所有配置（带缓存）
 */
async function getAllConfigs(): Promise<Map<string, string>> {
  const now = Date.now();

  if (configCache && now - configCacheTime < CACHE_TTL) {
    return configCache;
  }

  try {
    const db = await getDb();
    const configs = await db.select().from(systemConfig);

    configCache = new Map();
    for (const config of configs) {
      configCache.set(`${config.category}.${config.key}`, config.value);
    }
    configCacheTime = now;

    return configCache;
  } catch (error) {
    console.error('Get all configs error:', error);
    return new Map();
  }
}

/**
 * 获取单个配置值
 */
export async function getConfig(category: string, key: string): Promise<string | null> {
  const configs = await getAllConfigs();
  return configs.get(`${category}.${key}`) ?? null;
}

/**
 * 获取数字配置
 */
export async function getConfigNumber(category: string, key: string, defaultValue: number): Promise<number> {
  const value = await getConfig(category, key);
  if (value === null) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * 获取布尔配置
 */
export async function getConfigBoolean(category: string, key: string, defaultValue: boolean): Promise<boolean> {
  const value = await getConfig(category, key);
  if (value === null) return defaultValue;
  return value === 'true';
}

/**
 * 获取 JSON 配置
 */
export async function getConfigJSON<T>(category: string, key: string, defaultValue: T): Promise<T> {
  const value = await getConfig(category, key);
  if (value === null) return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 清除配置缓存
 */
export function clearConfigCache() {
  configCache = null;
  configCacheTime = 0;
}

// ============================================================
// 积分相关配置快捷函数
// ============================================================

/**
 * 获取内容分析消耗积分数
 */
export async function getCreditsForAnalysis(): Promise<number> {
  return getConfigNumber('credits', 'credits_analysis', 1);
}

/**
 * 获取图片生成消耗积分数
 */
export async function getCreditsForImage(): Promise<number> {
  return getConfigNumber('credits', 'credits_image', 5);
}

/**
 * 获取新用户赠送积分数
 */
export async function getNewUserCredits(): Promise<number> {
  return getConfigNumber('credits', 'new_user_credits', 100);
}

/**
 * 获取邀请奖励积分数
 */
export async function getInviteRewardCredits(): Promise<number> {
  return getConfigNumber('credits', 'invite_reward', 50);
}

/**
 * 检查功能是否启用
 */
export async function isFeatureEnabled(featureKey: string): Promise<boolean> {
  return getConfigBoolean('features', featureKey, true);
}

/**
 * 检查是否维护模式
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return getConfigBoolean('features', 'maintenance_mode', false);
}
