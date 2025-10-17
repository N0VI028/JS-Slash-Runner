import { Script as NewScript, ScriptFolder as NewScriptFolder } from '@/type/scripts';
import { CharacterSettings as NewCharacterSettings, GlobalSettings as NewGlobalSettings } from '@/type/settings';
import { getSmartThemeQuoteColor } from '@/util/color';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const ScriptData = z
  .object({
    enabled: z.boolean().default(false),
    name: z.string().default(''),
    id: z.string().default(() => uuidv4()),
    content: z.string().default(''),
    info: z.string().default(''),
    buttons: z
      .array(
        z
          .object({
            name: z.string().default(''),
            visible: z.boolean().default(true),
          })
          .prefault({}),
      )
      .default([]),
    data: z.record(z.string(), z.any()).default({}),
  })
  .prefault({})
  .transform(item => {
    return NewScript.parse({
      type: 'script',
      enabled: item.enabled,
      name: item.name,
      id: item.id,
      content: item.content,
      info: item.info,
      button: {
        enabled: true,
        buttons: item.buttons,
      },
      data: item.data,
    } satisfies NewScript);
  });

const ScriptItem = z
  .object({
    type: z.literal('script').default('script'),
    value: ScriptData,
  })
  .transform(item => item.value);
const ScriptFolder = z
  .object({
    type: z.literal('folder').default('folder'),
    id: z.string().default(() => uuidv4()),
    name: z.string().default(''),
    icon: z.string().default('fa-solid fa-folder'),
    color: z.string().default(getSmartThemeQuoteColor),
    value: z.array(ScriptData).default([]),
  })
  .transform(folder => {
    return NewScriptFolder.parse({
      type: 'folder',
      enabled: true,
      name: folder.name,
      id: folder.id,
      icon: folder.icon,
      color: folder.color,
      scripts: folder.value,
    } satisfies NewScriptFolder);
  });

const ScriptTree = z.discriminatedUnion('type', [ScriptItem, ScriptFolder]);

export const GlobalSettings = z
  .object({
    macro: z
      .object({
        replace: z.boolean().default(true),
      })
      .prefault({}),
    render: z
      .object({
        render_enabled: z.boolean().default(true),
        render_depth: z.number().default(0),
        render_hide_style: z.boolean().default(false),
        render_blob_url: z.boolean().default(false),
      })
      .prefault({}),
    script: z
      .object({
        global_script_enabled: z.boolean().default(true),
        scriptsRepository: z.array(ScriptTree).default([]),
        characters_with_scripts: z.array(z.string()).default([]),
      })
      .prefault({}),
  })
  .prefault({})
  .transform(settings => {
    return NewGlobalSettings.parse({
      macro: {
        enabled: settings.macro.replace,
      },
      render: {
        enabled: settings.render.render_enabled,
        collapse_code_block: settings.render.render_hide_style,
        use_blob_url: settings.render.render_blob_url,
        depth: settings.render.render_depth,
      },
      script: {
        enabled: {
          global: settings.script.global_script_enabled,
          presets: [],
          characters: settings.script.characters_with_scripts.map(character => character.replace('.png', '')),
        },
        scripts: settings.script.scriptsRepository,
      },
    } satisfies Pick<NewGlobalSettings, 'macro' | 'render' | 'script'>);
  });

export const CharacterSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]),
    variables: z.record(z.string(), z.any()).default({}),
  })
  .prefault({})
  .transform(settings => {
    return NewCharacterSettings.parse({
      scripts: settings.scripts,
      variables: settings.variables,
    } satisfies NewCharacterSettings);
  });
