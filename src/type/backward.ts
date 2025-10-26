import { Script as NewScript, ScriptFolder as NewScriptFolder } from '@/type/scripts';
import { CharacterSettings as NewCharacterSettings, GlobalSettings as NewGlobalSettings } from '@/type/settings';
import { getSmartThemeQuoteColor } from '@/util/color';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const ScriptData = z
  .object({
    enabled: z.boolean().default(false).catch(false),
    name: z.string().default('').catch(''),
    id: z
      .string()
      .default(() => uuidv4())
      .catch(() => uuidv4()),
    content: z.string().default('').catch(''),
    info: z.string().default('').catch(''),
    buttons: z
      .array(
        z
          .object({
            name: z.string().default('').catch(''),
            visible: z.boolean().default(true).catch(true),
          })
          .prefault({}),
      )
      .default([])
      .catch([]),
    data: z.record(z.string(), z.any()).default({}).catch({}),
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
    type: z.literal('script').default('script').catch('script'),
    value: ScriptData,
  })
  .transform(item => item.value);
const ScriptFolder = z
  .object({
    type: z.literal('folder').default('folder').catch('folder'),
    id: z
      .string()
      .default(() => uuidv4())
      .catch(() => uuidv4()),
    name: z.string().default('').catch(''),
    icon: z.string().default('fa-solid fa-folder').catch('fa-solid fa-folder'),
    color: z.string().default(getSmartThemeQuoteColor).catch(getSmartThemeQuoteColor),
    value: z.array(ScriptData).default([]).catch([]),
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

const ScriptTree = z.union([z.discriminatedUnion('type', [ScriptItem, ScriptFolder]), ScriptData]);

export const GlobalSettings = z
  .object({
    macro: z
      .object({
        replace: z.boolean().default(true).catch(true),
      })
      .prefault({}),
    render: z
      .object({
        render_enabled: z.boolean().default(true).catch(true),
        render_depth: z.number().default(0).catch(0),
        render_blob_url: z.boolean().default(false).catch(false),
      })
      .prefault({}),
    script: z
      .object({
        global_script_enabled: z.boolean().default(true).catch(true),
        scriptsRepository: z.array(ScriptTree).default([]).catch([]),
        characters_with_scripts: z
          .array(z.union([z.string(), z.null()]))
          .default([])
          .catch([])
          .transform(characters => characters.filter(character => character !== null))
          .transform(characters => characters.map(character => character.replace('.png', ''))),
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
        collapse_code_block: 'frontend_only',
        use_blob_url: settings.render.render_blob_url,
        depth: settings.render.render_depth,
      },
      script: {
        enabled: {
          global: settings.script.global_script_enabled,
          presets: [],
          characters: settings.script.characters_with_scripts,
        },
        popuped: {
          presets: [],
          characters: [],
        },
        scripts: settings.script.scriptsRepository,
      },
    } satisfies Pick<NewGlobalSettings, 'macro' | 'render' | 'script'>);
  });

export const CharacterSettings = z
  .object({
    scripts: z.array(ScriptTree).default([]).catch([]),
    variables: z.record(z.string(), z.any()).default({}).catch({}),
  })
  .prefault({})
  .transform(settings => {
    return NewCharacterSettings.parse({
      scripts: settings.scripts,
      variables: settings.variables,
    } satisfies NewCharacterSettings);
  });
