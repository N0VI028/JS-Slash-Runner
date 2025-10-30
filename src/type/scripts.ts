import { getSmartThemeQuoteColor } from '@/util/color';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const ScriptButton = z.object({
  name: z.coerce.string(),
  visible: z.boolean(),
});
export type ScriptButton = z.infer<typeof ScriptButton>;

export const Script = z.object({
  type: z.literal('script').default('script'),
  enabled: z.boolean().default(false),
  name: z.coerce.string().default(''),
  id: z.coerce.string().default(() => uuidv4()),
  content: z.coerce.string().default(''),
  info: z.coerce.string().default(''),
  button: z
    .object({
      enabled: z.boolean().default(true),
      buttons: z.array(ScriptButton).default([]),
    })
    .prefault({}),
  data: z.record(z.string(), z.any()).default({}).catch({}),
});
export type Script = z.infer<typeof Script>;

export const ScriptFolder = z.object({
  type: z.literal('folder').default('folder'),
  enabled: z.boolean().default(false),
  name: z.coerce.string().default(''),
  id: z.coerce.string().default(() => uuidv4()),
  icon: z.string().default('fa-solid fa-folder'),
  color: z.string().default(getSmartThemeQuoteColor),
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
