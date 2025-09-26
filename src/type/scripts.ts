import { uuidv4 } from '@sillytavern/scripts/utils';

export const ScriptButton = z.object({
  name: z.string(),
  visible: z.boolean(),
});
export type ScriptButton = z.infer<typeof ScriptButton>;

export const Script = z.object({
  type: z.literal('script').default('script'),
  enabled: z.boolean().default(false),
  name: z.string().default(''),
  id: z.string().default(uuidv4()),
  content: z.string().default(''),
  info: z.string().default(''),
  buttons_enabled: z.boolean().default(true),
  buttons: z.array(ScriptButton).default([]),
  data: z.record(z.string(), z.any()).default({}),
});
export type Script = z.infer<typeof Script>;

export const ScriptFolder = z.object({
  type: z.literal('folder').default('folder'),
  enabled: z.boolean().default(false),
  name: z.string().default(''),
  // TODO: 开发时脚本数据发生改变，因而 catch，但正式上线时应该去除
  id: z.string().default(uuidv4()).catch(uuidv4()),
  icon: z.string().default('fa-folder'),
  color: z
    .string()
    .default(getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeBodyColor').trim()),
  scripts: z.array(Script).default([]),
});
export type ScriptFolder = z.infer<typeof ScriptFolder>;

export const ScriptTree = z.discriminatedUnion('type', [Script, ScriptFolder]);
export type ScriptTree = z.infer<typeof ScriptTree>;
export function isScript(script_tree: ScriptTree): script_tree is Script {
  return script_tree.type === 'script';
}
export function isScriptFolder(script_tree: ScriptTree): script_tree is ScriptFolder {
  return script_tree.type === 'folder';
}
