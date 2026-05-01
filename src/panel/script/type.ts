import { ScriptButton, ScriptExportWith } from '@/type/scripts';

export const ScriptForm = z.object({
  name: z.string().nonempty('脚本名称不能为空'),
  content: z.string(),
  info: z.string(),
  button: z.object({
    enabled: z.boolean(),
    buttons: z.array(ScriptButton),
  }),
  data: z.record(z.string(), z.any()),
  export_with: ScriptExportWith,
});
export type ScriptForm = z.infer<typeof ScriptForm>;

export const ScriptFolderForm = z.object({
  name: z.string().nonempty('文件夹名称不能为空'),
  icon: z.string(),
  color: z.string(),
});
export type ScriptFolderForm = z.infer<typeof ScriptFolderForm>;

export const ScriptExportOptions = z.object({
  include_data: z.boolean(),
  include_button: z.boolean(),
});
export type ScriptExportOptions = z.infer<typeof ScriptExportOptions>;

export const ScriptFolderExportOptions = z.object({
  scripts: z.record(z.string(), ScriptExportOptions),
});
export type ScriptFolderExportOptions = z.infer<typeof ScriptFolderExportOptions>;
