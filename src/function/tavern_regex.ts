// TODO: 重制酒馆正则函数
import { refreshOneMessage } from '@/function/displayed_message';
import { macros } from '@/function/macro_like';
import { RawCharacter } from '@/function/raw_character';
import { getCompletionPresetByName, preset_manager, writeExtensionField } from '@/util/tavern';
import {
  characters,
  chat,
  event_types,
  eventSource,
  getCurrentChatId,
  saveSettings,
  saveSettingsDebounced,
  substituteParams,
  this_chid
} from '@sillytavern/script';
import { RegexScriptData } from '@sillytavern/scripts/char-data';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';
import { oai_settings } from '@sillytavern/scripts/openai';

type FormatAsTavernRegexedStringOption = {
  depth?: number;
  character_name?: string;
};

export function formatAsTavernRegexedString(
  text: string,
  source: 'user_input' | 'ai_output' | 'slash_command' | 'world_info' | 'reasoning',
  destination: 'display' | 'prompt',
  { depth, character_name }: FormatAsTavernRegexedStringOption = {},
) {
  let result = getRegexedString(
    text,
    (
      {
        user_input: regex_placement.USER_INPUT,
        ai_output: regex_placement.AI_OUTPUT,
        slash_command: regex_placement.SLASH_COMMAND,
        world_info: regex_placement.WORLD_INFO,
        reasoning: regex_placement.REASONING,
      } as const
    )[source],
    {
      characterOverride: character_name,
      isMarkdown: destination === 'display',
      isPrompt: destination === 'prompt',
      depth,
    },
  );
  result = substituteParams(result, undefined, character_name, undefined, undefined);
  macros.forEach(macro => {
    result = result.replace(macro.regex, (substring, ...args) =>
      macro.replace(
        {
          role: (
            {
              user_input: 'user',
              ai_output: 'assistant',
              slash_command: 'system',
              world_info: 'system',
              reasoning: 'system',
            } as const
          )[source],
          message_id: depth !== undefined ? chat.length - depth - 1 : undefined,
        },
        substring,
        ...args,
      ),
    );
  });
  return result;
}

export type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;

  find_regex: string;
  trim_strings: string[];
  replace_string: string;

  source: {
    user_input: boolean;
    ai_output: boolean;
    slash_command: boolean;
    world_info: boolean;
  };

  destination: {
    display: boolean;
    prompt: boolean;
  };
  run_on_edit: boolean;

  min_depth: number | null;
  max_depth: number | null;
};

type TavernRegexOptionGlobal = {
  type: 'global';
};
type TavernRegexOptionCharacter = {
  type: 'character';
  name?: string | 'current';
};
type TavernRegexOptionPreset = {
  type: 'preset';
  name?: string | 'in_use';
};
type TavernRegexOption = TavernRegexOptionGlobal | TavernRegexOptionCharacter | TavernRegexOptionPreset;

export function get_tavern_regexes_without_clone(option: TavernRegexOption): TavernRegex[] {
  let data: RegexScriptData[];
  switch (option.type) {
    case 'global':
      data = extension_settings.regex ?? [];
      break;
    case 'character': {
      const id = RawCharacter.findIndex(option.name ?? 'current');
      data = characters.at(id)?.data?.extensions?.regex_scripts ?? [];
      break;
    }
    case 'preset': {
      option.name ??= 'in_use';
      const preset = option.name === 'in_use' ? oai_settings : getCompletionPresetByName(option.name);
      data = preset?.extensions?.regex_scripts ?? [];
      break;
    }
  }
  return data.map(to_tavern_regex);
}

export function to_tavern_regex(regex_script_data: RegexScriptData): TavernRegex {
  return {
    id: regex_script_data.id,
    script_name: regex_script_data.scriptName,
    enabled: !regex_script_data.disabled,

    find_regex: regex_script_data.findRegex,
    trim_strings: regex_script_data.trimStrings || [],
    replace_string: regex_script_data.replaceString,

    source: {
      user_input: regex_script_data.placement.includes(regex_placement.USER_INPUT),
      ai_output: regex_script_data.placement.includes(regex_placement.AI_OUTPUT),
      slash_command: regex_script_data.placement.includes(regex_placement.SLASH_COMMAND),
      world_info: regex_script_data.placement.includes(regex_placement.WORLD_INFO),
    },

    destination: {
      display: regex_script_data.markdownOnly,
      prompt: regex_script_data.promptOnly,
    },
    run_on_edit: regex_script_data.runOnEdit,

    min_depth: typeof regex_script_data.minDepth === 'number' ? regex_script_data.minDepth : null,
    max_depth: typeof regex_script_data.maxDepth === 'number' ? regex_script_data.maxDepth : null,
  };
}

export function from_tavern_regex(tavern_regex: TavernRegex): RegexScriptData {
  return {
    id: tavern_regex.id,
    scriptName: tavern_regex.script_name,
    disabled: !tavern_regex.enabled,
    runOnEdit: tavern_regex.run_on_edit,

    findRegex: tavern_regex.find_regex,
    trimStrings: tavern_regex.trim_strings || [],
    replaceString: tavern_regex.replace_string,

    placement: [
      ...(tavern_regex.source.user_input ? [regex_placement.USER_INPUT] : []),
      ...(tavern_regex.source.ai_output ? [regex_placement.AI_OUTPUT] : []),
      ...(tavern_regex.source.slash_command ? [regex_placement.SLASH_COMMAND] : []),
      ...(tavern_regex.source.world_info ? [regex_placement.WORLD_INFO] : []),
    ],

    substituteRegex: 0, // TODO: handle this?

    // @ts-expect-error 类型是正确的
    minDepth: tavern_regex.min_depth,
    // @ts-expect-error 类型是正确的
    maxDepth: tavern_regex.max_depth,

    markdownOnly: tavern_regex.destination.display,
    promptOnly: tavern_regex.destination.prompt,
  };
}

export function isCharacterTavernRegexesEnabled(): boolean {
  return (extension_settings?.character_allowed_regex as string[])?.includes(
    characters.at(Number(this_chid))?.avatar ?? '',
  );
}

type GetTavernRegexesOption = TavernRegexOption & {
  /** @deprecated 请使用 `type` */
  scope?: 'all' | 'global' | 'character';
  /** @deprecated 请获取所有正则然后筛选 */
  enable_state?: 'all' | 'enabled' | 'disabled'; // 按是否被开启筛选正则
};

export function getTavernRegexes(option?: GetTavernRegexesOption): TavernRegex[] {
  if (option?.type === undefined) {
    option ??= { type: 'global' };
    const { scope = 'all', enable_state = 'all' } = option;

    if (!['all', 'enabled', 'disabled'].includes(enable_state)) {
      throw Error(`提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled', 你提供的是: ${enable_state}`);
    }
    if (!['all', 'global', 'character'].includes(scope)) {
      throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
    }

    let regexes: TavernRegex[] = [];
    if (scope === 'all' || scope === 'global') {
      regexes = [
        ...regexes,
        ...get_tavern_regexes_without_clone({ type: 'global' }).map(regex => ({ ...regex, scope: 'global' })),
      ];
    }
    if (scope === 'all' || scope === 'character') {
      regexes = [
        ...regexes,
        ...get_tavern_regexes_without_clone({ type: 'character' }).map(regex => ({ ...regex, scope: 'character' })),
      ];
    }
    if (enable_state !== 'all') {
      regexes = regexes.filter(regex => regex.enabled === (enable_state === 'enabled'));
    }

    return klona(regexes);
  }

  return klona(get_tavern_regexes_without_clone(option));
}

type ReplaceTavernRegexesOption = TavernRegexOption & {
  /** @deprecated 请使用 `type` */
  scope?: 'all' | 'global' | 'character';
};

export async function render_tavern_regexes() {
  await saveSettings();
  await Promise.all(
    $('#chat > .mes').map((_index, element) => {
      return refreshOneMessage(Number($(element).attr('mesid')));
    }),
  );
  await eventSource.emit(event_types.CHAT_CHANGED, getCurrentChatId());
}
export const render_tavern_regexes_debounced = _.debounce(render_tavern_regexes, 1000);

export async function replaceTavernRegexes(regexes: TavernRegex[], option?: ReplaceTavernRegexesOption): Promise<void> {
  regexes
    .filter(regex => regex.script_name == '')
    .forEach(regex => {
      regex.script_name = `未命名-${regex.id}`;
    });

  if (option?.type === undefined) {
    option ??= { type: 'global' };
    const { scope = 'all' } = option;
    if (!['all', 'global', 'character'].includes(scope)) {
      throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
    }

    // TODO: `trimStrings` and `substituteRegex` are not considered
    // @ts-expect-error 确实有 `scope` 字段, 之后想办法弃用整个函数
    const [global_regexes, character_regexes] = _.partition(regexes, regex => regex.scope === 'global').map(
      paritioned => paritioned.map(from_tavern_regex),
    );

    const character = characters.at(this_chid as unknown as number);
    if (scope === 'all' || scope === 'global') {
      extension_settings.regex = global_regexes;
    }
    if (scope === 'all' || scope === 'character') {
      if (!character) {
        return;
      }
      character.data.extensions.regex_scripts = character_regexes;
      await writeExtensionField(this_chid as unknown as string, 'regex_scripts', character_regexes);
    }
    return render_tavern_regexes_debounced();
  }

  const converted = regexes.map(from_tavern_regex);
  switch (option.type) {
    case 'global':
      extension_settings.regex = converted;
      break;
    case 'preset': {
      option.name ??= 'in_use';
      if (option.name !== 'in_use' && !preset_manager.getAllPresets().includes(option.name)) {
        return;
      }
      if (option.name === 'in_use') {
        _.set(oai_settings, 'extensions.regex_scripts', converted);
        saveSettingsDebounced();
      } else {
        const data = getCompletionPresetByName(option.name);
        _.set(data, 'extensions.regex_scripts', converted);
        await preset_manager.savePreset(option.name, data, { skipUpdate: true });
      }
      break;
    }
    case 'character': {
      const id = RawCharacter.findIndex(option.name ?? 'current');
      if (id === -1) {
        const errorMsg = `未能找到角色 '${option.name ?? 'current'}'`;
        toastr.error(errorMsg, '角色不存在');
        throw Error(errorMsg);
      }
      const character = characters.at(id);
      if (!character) {
        return;
      }
      character.data.extensions.regex_scripts = converted;
      await writeExtensionField(String(id), 'regex_scripts', converted);
      break;
    }
  }
  return render_tavern_regexes_debounced();
}

type TavernRegexUpdater =
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);

export async function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  option?: ReplaceTavernRegexesOption,
): Promise<TavernRegex[]> {
  let regexes = getTavernRegexes(option);
  regexes = await updater(regexes);
  await replaceTavernRegexes(regexes, option);
  return regexes;
}
