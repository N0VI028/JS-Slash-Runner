import { z } from 'zod';

/**
 * Script 数据结构的 Zod schema - 与V1保持完全一致
 */
export const ScriptSchema = z.object({
  id: z.string().min(1, '脚本ID不能为空'),
  name: z.string().min(1, '脚本名称不能为空'),
  content: z.string(),
  info: z.string(),
  buttons: z.array(
    z.object({
      name: z.string(),
      visible: z.boolean(),
    }),
  ),
  data: z.record(z.string(), z.any()),
  enabled: z.boolean(),
});

/**
 * ScriptRepositoryItem 的 Zod schema
 */
export const ScriptRepositoryItemSchema = z.object({
  type: z.enum(['folder', 'script']),
  id: z.string().optional(),
  name: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  value: z.union([
    z.array(ScriptSchema), // 文件夹包含的脚本数组
    ScriptSchema, // 单个脚本
  ]),
});

/**
 * 脚本类型枚举的 Zod schema
 */
export const ScriptTypeSchema = z.enum(['global', 'character', 'preset']);

// V1数据结构中，文件夹信息直接包含在ScriptRepositoryItem中，不需要独立的Folder schema

/**
 * Repository 整体数据结构的 Zod schema - 使用V1的数据结构
 */
export const RepositorySchema = z.array(
  z.union([
    ScriptSchema, // 直接的脚本对象（兼容旧数据）
    ScriptRepositoryItemSchema, // 脚本或文件夹项
  ]),
);

/**
 * TypeScript 类型推断
 */
export type Script = z.infer<typeof ScriptSchema>;
export type ScriptRepositoryItem = z.infer<typeof ScriptRepositoryItemSchema>;
export type ScriptType = z.infer<typeof ScriptTypeSchema>;
// Folder类型不再需要，使用ScriptRepositoryItem代替
export type Repository = z.infer<typeof RepositorySchema>;

/**
 * 创建默认的 Script 对象 - 与V1保持一致
 */
export function createDefaultScript(data?: Partial<Script>): Script {
  return ScriptSchema.parse({
    id: data?.id || crypto.randomUUID(),
    name: data?.name || '',
    content: data?.content || '',
    info: data?.info || '',
    enabled: data?.enabled || false,
    buttons: data?.buttons || [],
    data: data?.data || {},
  });
}

/**
 * 创建默认的 ScriptRepositoryItem（文件夹类型）
 */
export function createDefaultFolderItem(data?: {
  id?: string;
  name?: string;
  icon?: string;
  color?: string;
  scripts?: Script[];
}): ScriptRepositoryItem {
  return ScriptRepositoryItemSchema.parse({
    type: 'folder',
    id: data?.id || crypto.randomUUID(),
    name: data?.name || '',
    icon: data?.icon,
    color: data?.color,
    value: data?.scripts || [],
  });
}
