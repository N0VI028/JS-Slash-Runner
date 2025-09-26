import { ScriptButton } from '@/type/scripts';

export interface ScriptRuntime {
  id: string;
  content: string;
}

export const ScriptForm = z.object({
  name: z.string(),
  content: z.string().min(1, '脚本内容不能为空'),
  info: z.string(),
  buttons_enabled: z.boolean(),
  buttons: z.array(ScriptButton),
  data: z.record(z.string(), z.any()),
});
export type ScriptForm = z.infer<typeof ScriptForm>;
