export const ScriptButton = z.object({
  name: z.string(),
  visible: z.boolean(),
});
export type ScriptButton = z.infer<typeof ScriptButton>;

export const Script = z.object({
  type: z.literal('script'),
  enabled: z.boolean(),
  name: z.string(),
  id: z.string(),
  content: z.string(),
  info: z.string(),
  buttons: z
    .object({
      enabled: z.boolean(),
      button: z.array(ScriptButton),
    })
    // TODO: 开发时调整了数据结构, 发布时去掉 .catch
    .catch({
      enabled: true,
      button: [],
    }),
  data: z.record(z.string(), z.any()),
});
export type Script = z.infer<typeof Script>;

export const ScriptFolder = z.object({
  type: z.literal('folder'),
  enabled: z.boolean(),
  name: z.string(),
  id: z.string(),
  icon: z.string(),
  color: z.string(),
  scripts: z.array(Script),
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
