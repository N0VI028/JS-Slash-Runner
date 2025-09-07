import { z } from 'zod';

/**
 * Script 数据结构的 Zod schema
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
  folderId: z.string().nullable(), // null 表示在根目录
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

/**
 * 文件夹数据结构的 Zod schema
 */
export const FolderSchema = z.object({
  id: z.string().min(1, '文件夹ID不能为空'),
  name: z.string().min(1, '文件夹名称不能为空'),
  parentId: z.string().nullable(), // null 表示根文件夹
  icon: z.string().optional(),
  color: z.string().optional(),
  expanded: z.boolean().default(false), // 是否展开
  scripts: z.array(z.string()), // 包含的脚本ID列表
});

/**
 * Repository 整体数据结构的 Zod schema
 */
export const RepositorySchema = z.object({
  scripts: z.array(ScriptSchema),
  folders: z.array(FolderSchema),
  rootItems: z.array(z.string()), // 根级别的脚本和文件夹ID
});

/**
 * TypeScript 类型推断
 */
export type Script = z.infer<typeof ScriptSchema>;
export type ScriptRepositoryItem = z.infer<typeof ScriptRepositoryItemSchema>;
export type ScriptType = z.infer<typeof ScriptTypeSchema>;
export type Folder = z.infer<typeof FolderSchema>;
export type Repository = z.infer<typeof RepositorySchema>;

/**
 * 创建默认的 Script 对象
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
 * 创建默认的 Folder 对象
 */
export function createDefaultFolder(data?: Partial<Folder>): Folder {
  return FolderSchema.parse({
    id: data?.id || crypto.randomUUID(),
    name: data?.name || '',
    parentId: data?.parentId || null,
    icon: data?.icon,
    color: data?.color,
    expanded: data?.expanded || false,
    scripts: data?.scripts || [],
  });
}
