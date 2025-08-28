import { macros } from '@/component/macrolike';
import {
  characters,
  chat,
  reloadCurrentChat,
  saveChatConditional,
  saveSettings,
  substituteParams,
  this_chid,
} from '@sillytavern/script';
import { RegexScriptData } from '@sillytavern/scripts/char-data';
import { extension_settings, writeExtensionField } from '@sillytavern/scripts/extensions';
import { getRegexedString, regex_placement } from '@sillytavern/scripts/extensions/regex/engine';

import log from 'loglevel';

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

export function isCharacterTavernRegexEnabled(): boolean {
  // @ts-ignore 2345
  return extension_settings?.character_allowed_regex?.includes(characters?.[this_chid]?.avatar);
}

export function getGlobalRegexes(): RegexScriptData[] {
  return extension_settings.regex ?? [];
}

export function getCharacterRegexes(): RegexScriptData[] {
  // @ts-ignore
  return characters[this_chid]?.data?.extensions?.regex_scripts ?? [];
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

    // @ts-ignore
    minDepth: tavern_regex.min_depth,
    // @ts-ignore
    maxDepth: tavern_regex.max_depth,

    markdownOnly: tavern_regex.destination.display,
    promptOnly: tavern_regex.destination.prompt,
  };
}

export function isCharacterTavernRegexesEnabled(): boolean {
  const result = isCharacterTavernRegexEnabled();

  log.info(`查询到局部正则${result ? '被启用' : '被禁用'}`);
  return result;
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

  return structuredClone(regexes);
}

type ReplaceTavernRegexesOption = {
  scope?: 'all' | 'global' | 'character'; // 要替换的酒馆正则部分
};

export async function render_tavern_regexes() {
  await saveSettings();
  // @ts-ignore
  if (characters[this_chid]) {
    await saveChatConditional();
  }
  await reloadCurrentChat();
}
export const render_tavern_regexes_debounced = _.debounce(render_tavern_regexes, 1000);

export async function replaceTavernRegexes(
  regexes: TavernRegex[],
  { scope = 'all' }: ReplaceTavernRegexesOption,
): Promise<void> {
  if (!['all', 'global', 'character'].includes(scope)) {
    throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
  }

  // FIXME: `trimStrings` and `substituteRegex` are not considered
  const emptied_regexes = regexes.filter(regex => regex.script_name == '');
  if (emptied_regexes.length > 0) {
    throw Error(`不能将酒馆正则的名称设置为空字符串:\n${JSON.stringify(emptied_regexes.map(regex => regex.id))}`);
  }
  const [global_regexes, character_regexes] = _.partition(regexes, regex => regex.scope === 'global').map(paritioned =>
    paritioned.map(fromTavernRegex),
  );

  // @ts-ignore
  const character = characters[this_chid];
  if (scope === 'all' || scope === 'global') {
    extension_settings.regex = global_regexes;
  }
  if (scope === 'all' || scope === 'character') {
    if (character) {
      // @ts-ignore
      characters[this_chid].data.extensions.regex_scripts = character_regexes;
      // @ts-ignore
      await writeExtensionField(this_chid, 'regex_scripts', character_regexes);
    }
  }
  render_tavern_regexes_debounced();

  log.info(`替换酒馆正则\
${scope === 'all' || scope === 'global' ? `, 全局正则:\n${JSON.stringify(global_regexes)}` : ``}\
${scope === 'all' || scope === 'character' ? `, 局部正则:\n${JSON.stringify(character_regexes)}` : ``}`);
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
  log.info(`对${{ all: '全部', global: '全局', character: '局部' }[scope]}变量表进行更新`);
  await replaceTavernRegexes(regexes, { scope });
  return regexes;
}
