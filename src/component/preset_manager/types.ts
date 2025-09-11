/**
 * 预设绑定功能类型定义
 * 复用现有的 Script 和 TavernRegex 类型
 */

import { z } from 'zod';
// 导入现有类型

export type PresetName = string;

export type PresetBinding = {
  scripts: string[];
  regexes: string[];
};

export type PresetBindingsMap = Record<PresetName, PresetBinding>;


// 导出的绑定数据结构
export type ExportedBundles = {
  regexes?: TavernRegex[];
};

// 从 tavern_regex.ts 中导入 TavernRegex 类型
// 这里重新定义以避免循环导入，与 tavern_regex.ts 中的定义保持一致
export type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;
  run_on_edit: boolean;
  scope: 'global' | 'character';

  find_regex: string;
  replace_string: string;

  source: {
    user_input: boolean;
    ai_output: boolean;
    slash_command: boolean;
    world_info: boolean;
  };

  destination: {
    display: boolean;
    prompt: boolean;
  };

  min_depth: number | null;
  max_depth: number | null;
};

// Zod 验证模式
export const PresetNameSchema = z.string().min(1).max(100);

export const PresetBindingSchema = z.object({
  scripts: z.array(z.string().min(1)),
  regexes: z.array(z.string().min(1)),
});

export const PresetBindingsMapSchema = z.record(PresetNameSchema, PresetBindingSchema);

export const TavernRegexSchema = z.object({
  id: z.string().min(1),
  script_name: z.string(),
  enabled: z.boolean(),
  run_on_edit: z.boolean(),
  scope: z.enum(['global', 'character']),
  find_regex: z.string(),
  replace_string: z.string(),
  source: z.object({
    user_input: z.boolean(),
    ai_output: z.boolean(),
    slash_command: z.boolean(),
    world_info: z.boolean(),
  }),
  destination: z.object({
    display: z.boolean(),
    prompt: z.boolean(),
  }),
  min_depth: z.number().nullable(),
  max_depth: z.number().nullable(),
});

export const PresetScriptSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  enabled: z.boolean(),
  type: z.literal('preset'),
  presetName: PresetNameSchema,
  originalScope: z.enum(['GLOBAL', 'CHARACTER']),
});

export const ExportedBundlesSchema = z.object({
  scripts: z.array(PresetScriptSchema).optional(),
  regexes: z.array(TavernRegexSchema).optional(),
});

// 验证辅助函数
export function validatePresetName(name: unknown): name is PresetName {
  return PresetNameSchema.safeParse(name).success;
}

export function validatePresetBinding(binding: unknown): binding is PresetBinding {
  return PresetBindingSchema.safeParse(binding).success;
}

export function validatePresetBindingsMap(bindings: unknown): bindings is PresetBindingsMap {
  return PresetBindingsMapSchema.safeParse(bindings).success;
}

export function validateExportedBundles(bundles: unknown): bundles is ExportedBundles {
  return ExportedBundlesSchema.safeParse(bundles).success;
}
