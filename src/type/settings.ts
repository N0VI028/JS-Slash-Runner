import { ScriptTree } from '@/type/scripts';

export const setting_field = 'tavern_helper';

export const audio_mode_enum = ['repeat_one', 'repeat_all', 'shuffle', 'play_one_and_stop'] as const;
export const AudioMode = z.enum(audio_mode_enum);
export type AudioMode = z.infer<typeof AudioMode>;

export const collapse_code_block_enum = ['none', 'frontend_only', 'all'] as const;
export const CollapseCodeBlock = z.enum(collapse_code_block_enum);
export type CollapseCodeBlock = z.infer<typeof CollapseCodeBlock>;

export const GlobalSettings = z
  .object({
    audio: z
      .object({
        enabled: z.boolean().default(true),
        bgm: z
          .object({
            enabled: z.boolean().default(true),
            mode: AudioMode.default('repeat_all'),
            muted: z.boolean().default(false),
            volume: z.number().default(50),
          })
          .prefault({}),
        ambient: z
          .object({
            enabled: z.boolean().default(true),
            mode: AudioMode.default('play_one_and_stop'),
            muted: z.boolean().default(false),
            volume: z.number().default(50),
          })
          .prefault({}),
      })
      .prefault({}),
    listener: z
      .object({
        enabled: z.boolean().default(false),
        enable_echo: z.boolean().default(true),
        url: z.string().default('http://localhost:6621').catch('http://localhost:6621'),
        duration: z.number().default(1000).catch(1000),
      })
      .prefault({}),
    macro: z
      .object({
        enabled: z.boolean().default(true),
      })
      .prefault({}),
    render: z
      .object({
        enabled: z.boolean().default(true),
        collapse_code_block: CollapseCodeBlock.default('frontend_only').catch('frontend_only'),
        use_blob_url: z.boolean().default(false),
        // 之前没做判定, depth 可能被设置成 "", 因此 .catch
        depth: z.number().default(0).catch(0),
      })
      .prefault({}),
    script: z
      .object({
        enabled: z
          .object({
            global: z.boolean().default(true),
            presets: z.array(z.coerce.string()).default([]),
            characters: z.array(z.coerce.string()).default([]),
          })
          .prefault({}),
        popuped: z
          .object({
            presets: z.array(z.coerce.string()).default([]),
            characters: z.array(z.coerce.string()).default([]),
          })
          .prefault({}),
        scripts: z.array(ScriptTree).default([]),
      })
      .prefault({}),
    $impl: z
      .object({
        已经提醒过查看提示词模板问号: z.boolean().default(false),
      })
      .prefault({}),
  })
  .prefault({});
export type GlobalSettings = z.infer<typeof GlobalSettings>;

export const ChatSettings = z
  .object({
    bgm: z.array(z.object({ url: z.string(), title: z.coerce.string() })).default([]),
    ambient: z.array(z.object({ url: z.string(), title: z.coerce.string() })).default([]),
  })
  .prefault({});
export type ChatSettings = z.infer<typeof ChatSettings>;

export const PresetSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]).catch([]),
    variables: z.record(z.string(), z.any()).default({}).catch({}),
  })
  .prefault({});
export type PresetSettings = z.infer<typeof CharacterSettings>;

export const CharacterSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]).catch([]),
    variables: z.record(z.string(), z.any()).default({}).catch({}),
  })
  .prefault({});
export type CharacterSettings = z.infer<typeof CharacterSettings>;
