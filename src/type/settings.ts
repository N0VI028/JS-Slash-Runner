import { z } from 'zod';

export const setting_field = 'tavern_helper';

export const ExtensionSettings = z
  .object({
    enabled: z.boolean().default(true),
  })
  .prefault({});
export type ExtensionSettings = z.infer<typeof ExtensionSettings>;

// const Settings = z.object({
//   enabled_extension: z.boolean().default(true),
//   render: z.object({
//     render_enabled: z.boolean().default(true),
//     render_depth: z.number().default(0),
//     render_optimize: z.boolean().default(false),
//     render_hide_style: z.boolean().default(false),
//     render_loading: z.boolean().default(true),
//     render_blob_url: z.boolean().default(false),
//   }),
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
