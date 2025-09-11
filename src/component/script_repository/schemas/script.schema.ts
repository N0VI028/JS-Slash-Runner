import { uuidv4 } from '@sillytavern/scripts/utils';
import { z } from 'zod';


/**
 * 单个脚本的 Zod schema
 */
export const ScriptSchema = z.object({
  id: z.string().min(1, '脚本ID不能为空').default(uuidv4()),
  name: z.string().min(1, '脚本名称不能为空').default('未命名'),
  content: z.string().default(''),
  info: z.string().default(''),
  buttons: z.array(
    z.object({
      name: z.string().default(''),
      visible: z.boolean().default(true),
    }),
  ).default([]),
  data: z.record(z.string(), z.any()).default({}),
  enabled: z.boolean().default(false),
});

/**
 * 单个仓库条目的 Zod schema（文件夹或脚本）
 */
export const ScriptRepositoryItemSchema = z.object({
  type: z.enum(['folder', 'script']),
  id: z.string().min(1, '脚本ID不能为空').optional().default(uuidv4()), // 文件夹才需要
  name: z.string().min(1, '脚本名称不能为空').optional().default('未命名'), // 文件夹才需要
  icon: z.string().optional().default('fa-folder'), // 文件夹才需要
  color: z.string().optional().default(document.documentElement.style.getPropertyValue('--SmartThemeBodyColor')), // 文件夹才需要
  value: z.union([
    z.array(ScriptSchema), // 文件夹包含的脚本数组
    ScriptSchema, // 单个脚本
  ]),
});

/**
 * 存储中脚本数据结构的 Zod schema（数组形式）
 */
export const ScriptRepositorySchema = z.array(ScriptRepositoryItemSchema);

/**
 * 脚本类型枚举的 Zod schema
 */
export const ScriptTypeSchema = z.enum(['global', 'character', 'preset']);

/**
 * 创建文件夹的 schema
 */
export const ScriptFolderSchema = z.object({
  name: z.string().min(1, '文件夹名称不能为空').max(50, '文件夹名称不能超过50个字符'),
  icon: z.string().optional().default('fa-folder'),
  color: z.string().optional().default(document.documentElement.style.getPropertyValue('--SmartThemeBodyColor')),
  target: z.enum(['global', 'character', 'preset']).default('global'),
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
 * 导入脚本载荷 schema
 */
export const ImportScriptSchema = z.object({
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
export const ExportScriptSchema = z.object({
  scriptIds: z.array(z.string().min(1)),
  format: z.enum(['json', 'zip']),
  includeData: z.boolean().default(true), // 是否包含脚本数据
});

/**
 * TypeScript 类型推断
 */
export type ScriptFolder = z.infer<typeof ScriptFolderSchema>;
export type SearchFilters = z.infer<typeof SearchFiltersSchema>;
export type ImportScript = z.infer<typeof ImportScriptSchema>;
export type ExportScript = z.infer<typeof ExportScriptSchema>;

export type Script = z.infer<typeof ScriptSchema>;
export type ScriptRepository = z.infer<typeof ScriptRepositorySchema>;
export type ScriptRepositoryItem = z.infer<typeof ScriptRepositoryItemSchema>;
export type ScriptType = z.infer<typeof ScriptTypeSchema>;


/**
 * 默认脚本设置
 */
export const defaultScriptSettings = {
  global_script_enabled: true,
  scriptsRepository: [] as ScriptRepository,
  characters_with_scripts: [] as string[],
};