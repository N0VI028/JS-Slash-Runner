import { macros } from '@/function/macro_like';
import { reloadAndRenderChatWithoutEvents } from '@/util/tavern';
import {
  characters,
  chat,
  event_types,
  eventSource,
  getCurrentChatId,
  saveSettings,
  substituteParams,
  this_chid,
} from '@sillytavern/script';
import { RegexScriptData } from '@sillytavern/scripts/char-data';
import { extension_settings, writeExtensionField } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';

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

type TavernRegex = {
  id: string;
  script_name: string;
  enabled: boolean;
  run_on_edit: boolean;
  scope: 'global' | 'character';

  find_regex: string;
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

  min_depth: number | null;
  max_depth: number | null;
};

export function getGlobalRegexes(): RegexScriptData[] {
  return extension_settings.regex ?? [];
}

export function getCharacterRegexes(): RegexScriptData[] {
  return characters.at(this_chid as unknown as number)?.data?.extensions?.regex_scripts ?? [];
}

function toTavernRegex(regex_script_data: RegexScriptData, scope: 'global' | 'character'): TavernRegex {
  return {
    id: regex_script_data.id,
    script_name: regex_script_data.scriptName,
    enabled: !regex_script_data.disabled,
    run_on_edit: regex_script_data.runOnEdit,
    scope: scope,

    find_regex: regex_script_data.findRegex,
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

    min_depth: typeof regex_script_data.minDepth === 'number' ? regex_script_data.minDepth : null,
    max_depth: typeof regex_script_data.maxDepth === 'number' ? regex_script_data.maxDepth : null,
  };
}

function fromTavernRegex(tavern_regex: TavernRegex): RegexScriptData {
  return {
    id: tavern_regex.id,
    scriptName: tavern_regex.script_name,
    disabled: !tavern_regex.enabled,
    runOnEdit: tavern_regex.run_on_edit,

    findRegex: tavern_regex.find_regex,
    replaceString: tavern_regex.replace_string,
    trimStrings: [], // TODO: handle this?

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
    characters.at(this_chid as unknown as number)?.avatar ?? '',
  );
}

type GetTavernRegexesOption = {
  scope?: 'all' | 'global' | 'character'; // 按所在区域筛选正则
  enable_state?: 'all' | 'enabled' | 'disabled'; // 按是否被开启筛选正则
};

export function getTavernRegexes({ scope = 'all', enable_state = 'all' }: GetTavernRegexesOption = {}): TavernRegex[] {
  if (!['all', 'enabled', 'disabled'].includes(enable_state)) {
    throw Error(`提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled', 你提供的是: ${enable_state}`);
  }
  if (!['all', 'global', 'character'].includes(scope)) {
    throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
  }

  let regexes: TavernRegex[] = [];
  if (scope === 'all' || scope === 'global') {
    regexes = [...regexes, ...getGlobalRegexes().map(regex => toTavernRegex(regex, 'global'))];
  }
  if (scope === 'all' || scope === 'character') {
    regexes = [...regexes, ...getCharacterRegexes().map(regex => toTavernRegex(regex, 'character'))];
  }
  if (enable_state !== 'all') {
    regexes = regexes.filter(regex => regex.enabled === (enable_state === 'enabled'));
  }

  return klona(regexes);
}

type ReplaceTavernRegexesOption = {
  scope?: 'all' | 'global' | 'character'; // 要替换的酒馆正则部分
};

export async function render_tavern_regexes() {
  await saveSettings();
  await reloadAndRenderChatWithoutEvents();
  await eventSource.emit(event_types.CHAT_CHANGED, getCurrentChatId());
}
export const render_tavern_regexes_debounced = _.debounce(render_tavern_regexes, 1000);

export async function replaceTavernRegexes(
  regexes: TavernRegex[],
  { scope = 'all' }: ReplaceTavernRegexesOption,
): Promise<void> {
  if (!['all', 'global', 'character'].includes(scope)) {
    throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
  }

  // TODO: `trimStrings` and `substituteRegex` are not considered
  regexes
    .filter(regex => regex.script_name == '')
    .forEach(regex => {
      regex.script_name = `未命名-${regex.id}`;
    });
  const [global_regexes, character_regexes] = _.partition(regexes, regex => regex.scope === 'global').map(paritioned =>
    paritioned.map(fromTavernRegex),
  );

  const character = characters.at(this_chid as unknown as number);
  if (scope === 'all' || scope === 'global') {
    extension_settings.regex = global_regexes;
  }
  if (scope === 'all' || scope === 'character') {
    if (character) {
      character.data.extensions.regex_scripts = character_regexes;
      await writeExtensionField(this_chid as unknown as string, 'regex_scripts', character_regexes);
    }
  }
  render_tavern_regexes_debounced();
}

type TavernRegexUpdater =
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);

export async function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  { scope = 'all' }: ReplaceTavernRegexesOption = {},
): Promise<TavernRegex[]> {
  let regexes = getTavernRegexes({ scope });
  regexes = await updater(regexes);
  await replaceTavernRegexes(regexes, { scope });
  return regexes;
}
