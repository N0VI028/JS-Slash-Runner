import { z } from 'zod';

/**
 * 创建脚本的载荷 schema
 */
export const CreateScriptPayloadSchema = z.object({
  name: z.string().min(1, '脚本名称不能为空').max(100, '脚本名称不能超过100个字符'),
  folderId: z.string().nullable(), // null 表示放在根目录
  content: z.string().optional(),
  info: z.string().optional(),
  enabled: z.boolean().default(false),
});

/**
 * 更新脚本的载荷 schema
 */
export const UpdateScriptPayloadSchema = z.object({
  id: z.string().min(1, '脚本ID不能为空'),
  name: z.string().min(1, '脚本名称不能为空').max(100, '脚本名称不能超过100个字符').optional(),
  content: z.string().optional(),
  info: z.string().optional(),
  enabled: z.boolean().optional(),
  buttons: z
    .array(
      z.object({
        name: z.string(),
        visible: z.boolean(),
      }),
    )
    .optional(),
  data: z.record(z.string(), z.any()).optional(),
});

/**
 * 移动脚本的载荷 schema
 */
export const MoveScriptPayloadSchema = z.object({
  id: z.string().min(1, '脚本ID不能为空'),
  toFolderId: z.string().nullable(), // null 表示移动到根目录
});

/**
 * 创建文件夹的载荷 schema
 */
export const CreateFolderPayloadSchema = z.object({
  name: z.string().min(1, '文件夹名称不能为空').max(50, '文件夹名称不能超过50个字符'),
  parentId: z.string().nullable(), // null 表示创建在根目录
  icon: z.string().optional(),
  color: z.string().optional(),
});

/**
 * 重命名文件夹的载荷 schema
 */
export const RenameFolderPayloadSchema = z.object({
  id: z.string().min(1, '文件夹ID不能为空'),
  name: z.string().min(1, '文件夹名称不能为空').max(50, '文件夹名称不能超过50个字符'),
});

/**
 * 移动文件夹的载荷 schema
 */
export const MoveFolderPayloadSchema = z.object({
  id: z.string().min(1, '文件夹ID不能为空'),
  parentId: z.string().nullable(), // null 表示移动到根目录
});

/**
 * 删除载荷 schema
 */
export const DeletePayloadSchema = z.object({
  id: z.string().min(1, 'ID不能为空'),
  type: z.enum(['script', 'folder']),
});

/**
 * 搜索过滤器 schema
 */
export const SearchFiltersSchema = z.object({
  keyword: z.string().optional(),
  types: z.array(z.enum(['global', 'character', 'preset'])).optional(),
  folderId: z.string().nullable().optional(), // null 表示搜索根目录，undefined 表示搜索全部
  enabled: z.boolean().optional(), // undefined 表示不按启用状态过滤
});

/**
 * 排序选项 schema
 */
export const SortOptionsSchema = z.object({
  field: z.enum(['name', 'created', 'modified', 'enabled']),
  order: z.enum(['asc', 'desc']),
});

/**
 * 导入脚本载荷 schema
 */
export const ImportScriptPayloadSchema = z.object({
  scripts: z.array(
    z.object({
      name: z.string(),
      content: z.string(),
      info: z.string().optional(),
    }),
  ),
  folderId: z.string().nullable(), // 导入到哪个文件夹
  overwrite: z.boolean().default(false), // 是否覆盖同名脚本
});

/**
 * 导出脚本载荷 schema
 */
export const ExportScriptPayloadSchema = z.object({
  scriptIds: z.array(z.string().min(1)),
  format: z.enum(['json', 'zip']),
  includeData: z.boolean().default(true), // 是否包含脚本数据
});

/**
 * TypeScript 类型推断
 */
export type CreateScriptPayload = z.infer<typeof CreateScriptPayloadSchema>;
export type UpdateScriptPayload = z.infer<typeof UpdateScriptPayloadSchema>;
export type MoveScriptPayload = z.infer<typeof MoveScriptPayloadSchema>;
export type CreateFolderPayload = z.infer<typeof CreateFolderPayloadSchema>;
export type RenameFolderPayload = z.infer<typeof RenameFolderPayloadSchema>;
export type MoveFolderPayload = z.infer<typeof MoveFolderPayloadSchema>;
export type DeletePayload = z.infer<typeof DeletePayloadSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type SortOptions = z.infer<typeof SortOptionsSchema>;
export type ImportScriptPayload = z.infer<typeof ImportScriptPayloadSchema>;
export type ExportScriptPayload = z.infer<typeof ExportScriptPayloadSchema>;
