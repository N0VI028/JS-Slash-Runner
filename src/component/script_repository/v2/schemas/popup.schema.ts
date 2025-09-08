import { z } from 'zod';

/**
 * 脚本编辑器表单数据的 Zod schema
 */
export const ScriptEditorFormSchema = z.object({
  name: z
    .string()
    .min(1, '脚本名称不能为空')
    .max(100, '脚本名称不能超过100个字符')
    .refine(
      name => {
        // 检查无效字符（不使用控制字符范围）
        const invalidChars = /[<>:"/\\|?*]/;
        const controlChars = name.split('').some(char => {
          const code = char.charCodeAt(0);
          return code < 32 || code === 127; // 控制字符
        });
        return !invalidChars.test(name) && !controlChars;
      },
      {
        message: '脚本名称包含无效字符',
      },
    ),
  content: z.string(),
  info: z.string(),
  buttons: z
    .array(
      z.object({
        name: z.string().min(1, '按钮名称不能为空'),
        visible: z.boolean().default(true),
      }),
    )
    .default([]),
  data: z.record(z.string(), z.any()).default({}),
});

/**
 * 文件夹创建表单数据的 Zod schema
 */
export const FolderCreateFormSchema = z.object({
  name: z
    .string()
    .min(1, '文件夹名称不能为空')
    .max(50, '文件夹名称不能超过50个字符')
    .refine(
      name => {
        // 检查无效字符（不使用控制字符范围）
        const invalidChars = /[<>:"/\\|?*]/;
        const controlChars = name.split('').some(char => {
          const code = char.charCodeAt(0);
          return code < 32 || code === 127; // 控制字符
        });
        return !invalidChars.test(name) && !controlChars;
      },
      {
        message: '文件夹名称包含无效字符',
      },
    ),
  icon: z.string().default('fa-folder'),
  color: z
    .string()
    .regex(
      /^#(#[0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})$|^rgb(a?)\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(\s*,\s*(0|1|0?\.\d+|1\.0))?\s*\)$/,
      '颜色格式无效',
    )
    .optional(),
  target: z.enum(['global', 'character', 'preset']).default('global'),
});

/**
 * 目标选择器表单数据的 Zod schema
 */
export const TargetSelectorFormSchema = z.object({
  target: z.enum(['global', 'character', 'preset']),
  showPresetOption: z.boolean().default(false),
});

/**
 * 脚本信息显示配置的 Zod schema
 */
export const ScriptInfoDisplaySchema = z.object({
  scriptId: z.string().min(1, '脚本ID不能为空'),
  title: z.string().optional(),
  content: z.string(),
  wide: z.boolean().default(true),
});

/**
 * 内置脚本库选择配置的 Zod schema
 */
export const BuiltinLibraryConfigSchema = z.object({
  selectedScriptIds: z.array(z.string()).default([]),
  allowMultiple: z.boolean().default(false),
  filterEnabled: z.boolean().default(true),
});

/**
 * 确认对话框配置的 Zod schema
 */
export const ConfirmDialogConfigSchema = z.object({
  title: z.string().default('确认操作'),
  message: z.string().min(1, '消息内容不能为空'),
  confirmText: z.string().default('确认'),
  cancelText: z.string().default('取消'),
  type: z.enum(['info', 'warning', 'danger']).default('info'),
});

/**
 * 文本输入对话框配置的 Zod schema
 */
export const TextInputDialogConfigSchema = z.object({
  title: z.string().default('输入信息'),
  message: z.string().optional(),
  placeholder: z.string().optional(),
  defaultValue: z.string().default(''),
  multiline: z.boolean().default(false),
  required: z.boolean().default(true),
  maxLength: z.number().positive().optional(),
  validation: z.function().optional(),
});

/**
 * Popup通用配置的 Zod schema
 */
export const PopupConfigSchema = z.object({
  wide: z.boolean().default(false),
  large: z.boolean().default(false),
  okButton: z.string().optional(),
  cancelButton: z.string().optional(),
  customButtons: z.array(z.string()).optional(),
  allowEscapeKey: z.boolean().default(true),
  allowClickOutside: z.boolean().default(true),
  persistent: z.boolean().default(false),
});

/**
 * TypeScript 类型推断
 */
export type ScriptEditorFormData = z.infer<typeof ScriptEditorFormSchema>;
export type FolderCreateFormData = z.infer<typeof FolderCreateFormSchema>;
export type TargetSelectorFormData = z.infer<typeof TargetSelectorFormSchema>;
export type ScriptInfoDisplayConfig = z.infer<typeof ScriptInfoDisplaySchema>;
export type BuiltinLibraryConfig = z.infer<typeof BuiltinLibraryConfigSchema>;
export type ConfirmDialogConfig = z.infer<typeof ConfirmDialogConfigSchema>;
export type TextInputDialogConfig = z.infer<typeof TextInputDialogConfigSchema>;
export type PopupConfig = z.infer<typeof PopupConfigSchema>;

/**
 * 表单验证结果类型
 */
export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: Record<string, string[]>;
}

/**
 * Popup操作结果类型
 */
export interface PopupResult<T = any> {
  confirmed: boolean;
  data?: T;
  cancelled?: boolean;
}
