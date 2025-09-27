import { ScriptButton } from '@/type/scripts';

export interface ScriptRuntime {
  id: string;
  hash: string;
  content: string;
}

export const ScriptForm = z.object({
  name: z.string().nonempty('脚本名称不能为空'),
  content: z.string(),
  info: z.string(),
  buttons: z.array(ScriptButton),
  data: z.record(z.string(), z.any()),
});
export type ScriptForm = z.infer<typeof ScriptForm>;
