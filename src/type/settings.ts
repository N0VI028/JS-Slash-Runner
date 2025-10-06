import { ScriptTree } from '@/type/scripts';

export const setting_field = 'tavern_helper';

export const GlobalSettings = z
  .object({
    audio: z
      .object({
        enabled: z.boolean().default(true),
        bgm: z
          .object({
            mode: z.string().default('repeat'),
            muted: z.boolean().default(false),
            volume: z.number().default(100),
          })
          .prefault({}),
        ambient: z
          .object({
            mode: z.string().default('stop'),
            muted: z.boolean().default(false),
            volume: z.number().default(100),
          })
          .prefault({}),
      })
      .prefault({}),
    listener: z
      .object({
        enabled: z.boolean().default(false),
        enable_echo: z.boolean().default(true),
        url: z.string().default('http://localhost:6621'),
        duration: z.number().default(1000),
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
        collapse_code_block: z.boolean().default(false),
        with_loading: z.boolean().default(true),
        use_blob_url: z.boolean().default(false),
        depth: z.number().default(0),
      })
      .prefault({}),
    script: z
      .object({
        enabled: z
          .object({
            global: z.boolean().default(true),
            characters: z.array(z.string()).default([]),
            presets: z.array(z.string()).default([]),
          })
          .prefault({}),
        scripts: z.array(ScriptTree).default([]),
      })
      .prefault({}),
  })
  .prefault({});
export type GlobalSettings = z.infer<typeof GlobalSettings>;

// const Settings = z.object({
//   enabled_extension: z.boolean().default(true),
//   script: z.object({
//     global_script_enabled: z.boolean().default(true),
//     scriptsRepository: z.array(ScriptRepositoryItemSchema),
//     characters_with_scripts: z.array(z.string()),
//   }),
//   audio: z.object({
//     audio_enabled: z.boolean().default(true),
//     bgm_enabled: z.boolean().default(true),
//     ambient_enabled: z.boolean().default(true),
//     bgm_mode: z.string().default('repeat'),
//     bgm_muted: z.boolean().default(false),
//     bgm_volume: z.number().default(50),
//     bgm_selected: z.string().nullable().default(null),
//     bgm_current_time: z.number().default(0),
//     ambient_mode: z.string().default('stop'),
//     ambient_muted: z.boolean().default(false),
//     ambient_volume: z.number().default(50),
//     ambient_selected: z.string().nullable().default(null),
//     ambient_current_time: z.number().default(0),
//     audio_cooldown: z.number().default(0),
//   }),
//   listener: z.object({
//     enabled: z.boolean().default(false),
//     enable_echo: z.boolean().default(true),
//     url: z.string().default('http://localhost:6621'),
//     duration: z.number().default(1000),
//   }),
//   macro: z.object({
//     replace: z.boolean().default(true),
//   }),
//   debug: z.object({
//     enabled: z.boolean().default(false),
//   }),
// });

export const CharacterSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]),
    variables: z.record(z.string(), z.any()).default({}),
  })
  .prefault({});
export type CharacterSettings = z.infer<typeof CharacterSettings>;

export const PresetSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]),
    variables: z.record(z.string(), z.any()).default({}),
  })
  .prefault({});
export type PresetSettings = z.infer<typeof CharacterSettings>;
