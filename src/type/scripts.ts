import { uuidv4 } from '@sillytavern/scripts/utils';

export const ScriptButton = z.object({
  name: z.string(),
  visible: z.boolean(),
});
export type ScriptButton = z.infer<typeof ScriptButton>;

export const Script = z.object({
  enabled: z.boolean().default(false),
  name: z.string().default('未命名'),
  id: z.string().default(uuidv4()),
  content: z.string().default(''),
  info: z.string().default(''),
  buttons: z.array(ScriptButton).default([]),
  data: z.record(z.string(), z.any()).default({}),
});
export type Script = z.infer<typeof Script>;
