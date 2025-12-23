'use server';

import { getDb } from '@/db';
import { systemConfig } from '@/db/schema';
import { adminActionClient } from '@/lib/safe-action';
import type { User } from '@/lib/auth-types';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { eq, and } from 'drizzle-orm';
import { DEFAULT_CONFIGS, type ConfigItem, type ConfigCategory } from '@/config/system-defaults';

// Re-export types for convenience
export type { ConfigCategory, ConfigValueType, ConfigItem } from '@/config/system-defaults';

// ============================================================
// Schema 定义
// ============================================================

const updateConfigSchema = z.object({
  id: z.string(),
  value: z.string(),
});

const updateConfigsSchema = z.object({
  configs: z.array(z.object({
    id: z.string(),
    value: z.string(),
  })),
});

const getCategorySchema = z.object({
  category: z.enum(['ai', 'credits', 'pricing', 'limits', 'features', 'site']),
});

// ============================================================
// Actions
// ============================================================

/**
 * 获取所有配置
 */
export const getAllConfigsAction = adminActionClient
  .action(async () => {
    try {
      const db = await getDb();

      const configs = await db
        .select()
        .from(systemConfig)
        .orderBy(systemConfig.category, systemConfig.key);

      // 对敏感信息进行脱敏处理
      const sanitizedConfigs = configs.map(config => ({
        ...config,
        value: config.isSecret ? maskSecret(config.value) : config.value,
      }));

      return {
        success: true,
        configs: sanitizedConfigs as ConfigItem[],
      };
    } catch (error) {
      console.error('Get all configs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configs',
      };
    }
  });

/**
 * 获取指定分类的配置
 */
export const getConfigsByCategoryAction = adminActionClient
  .schema(getCategorySchema)
  .action(async ({ parsedInput }) => {
    const { category } = parsedInput;

    try {
      const db = await getDb();

      const configs = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.category, category))
        .orderBy(systemConfig.key);

      // 对敏感信息进行脱敏处理
      const sanitizedConfigs = configs.map(config => ({
        ...config,
        value: config.isSecret ? maskSecret(config.value) : config.value,
      }));

      return {
        success: true,
        configs: sanitizedConfigs as ConfigItem[],
      };
    } catch (error) {
      console.error('Get configs by category error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configs',
      };
    }
  });

/**
 * 更新单个配置
 */
export const updateConfigAction = adminActionClient
  .schema(updateConfigSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { id, value } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 检查配置是否存在
      const existing = await db
        .select()
        .from(systemConfig)
        .where(eq(systemConfig.id, id))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: '配置项不存在' };
      }

      // 更新配置
      await db
        .update(systemConfig)
        .set({
          value,
          updatedBy: currentUser.id,
          updatedAt: new Date(),
        })
        .where(eq(systemConfig.id, id));

      return {
        success: true,
        message: '配置已更新',
      };
    } catch (error) {
      console.error('Update config error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update config',
      };
    }
  });

/**
 * 批量更新配置
 */
export const updateConfigsAction = adminActionClient
  .schema(updateConfigsSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { configs } = parsedInput;
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      for (const { id, value } of configs) {
        await db
          .update(systemConfig)
          .set({
            value,
            updatedBy: currentUser.id,
            updatedAt: new Date(),
          })
          .where(eq(systemConfig.id, id));
      }

      return {
        success: true,
        message: `已更新 ${configs.length} 项配置`,
      };
    } catch (error) {
      console.error('Update configs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update configs',
      };
    }
  });

/**
 * 初始化默认配置（首次使用时调用）
 */
export const initDefaultConfigsAction = adminActionClient
  .action(async ({ ctx }) => {
    const currentUser = (ctx as { user: User }).user;

    try {
      const db = await getDb();

      // 获取现有配置
      const existingConfigs = await db.select().from(systemConfig);
      const existingKeys = new Set(existingConfigs.map(c => `${c.category}:${c.key}`));

      // 只插入不存在的配置
      const newConfigs = DEFAULT_CONFIGS.filter(
        c => !existingKeys.has(`${c.category}:${c.key}`)
      );

      if (newConfigs.length === 0) {
        return {
          success: true,
          message: '配置已是最新',
          added: 0,
        };
      }

      for (const config of newConfigs) {
        await db.insert(systemConfig).values({
          id: nanoid(),
          category: config.category,
          key: config.key,
          value: config.value,
          valueType: config.valueType,
          label: config.label,
          description: config.description,
          isSecret: config.isSecret ?? false,
          updatedBy: currentUser.id,
        });
      }

      return {
        success: true,
        message: `已初始化 ${newConfigs.length} 项配置`,
        added: newConfigs.length,
      };
    } catch (error) {
      console.error('Init default configs error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to init configs',
      };
    }
  });

// ============================================================
// 辅助函数
// ============================================================

/**
 * 脱敏处理
 */
function maskSecret(value: string): string {
  if (!value || value.length <= 8) {
    return '********';
  }
  return value.slice(0, 4) + '****' + value.slice(-4);
}

/**
 * 获取配置值（服务端使用，不脱敏）
 */
export async function getConfigValue(category: ConfigCategory, key: string): Promise<string | null> {
  try {
    const db = await getDb();

    const result = await db
      .select({ value: systemConfig.value })
      .from(systemConfig)
      .where(and(
        eq(systemConfig.category, category),
        eq(systemConfig.key, key)
      ))
      .limit(1);

    return result[0]?.value ?? null;
  } catch (error) {
    console.error(`Get config ${category}.${key} error:`, error);
    return null;
  }
}

/**
 * 获取所有配置（服务端使用，带缓存）
 */
let configCache: Map<string, string> | null = null;
let configCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 分钟缓存

export async function getAllConfigValues(): Promise<Map<string, string>> {
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
    console.error('Get all config values error:', error);
    return new Map();
  }
}

/**
 * 清除配置缓存
 */
export async function clearConfigCache() {
  configCache = null;
  configCacheTime = 0;
}
