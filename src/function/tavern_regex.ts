import { partition } from '@/util/helper';

import { characters, reloadCurrentChat, saveChatConditional, saveSettings, this_chid } from '@sillytavern/script';
import { RegexScriptData } from '@sillytavern/scripts/char-data';
import { extension_settings, writeExtensionField } from '@sillytavern/scripts/extensions';
import { regex_placement } from '@sillytavern/scripts/extensions/regex/engine';

interface TavernRegex {
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
}

interface GetTavernRegexesOption {
  scope?: 'all' | 'global' | 'character'; // 按所在区域筛选正则
  enable_state?: 'all' | 'enabled' | 'disabled'; // 按是否被开启筛选正则
}

export function isCharacterTavernRegexEnabled(): boolean {
  // @ts-ignore 2345
  return extension_settings?.character_allowed_regex?.includes(characters?.[this_chid]?.avatar);
}

export function getGlobalRegexes(): RegexScriptData[] {
  return extension_settings.regex ?? [];
}

export function getCharacterRegexes(): RegexScriptData[] {
  if (this_chid === undefined) {
    throw new Error('当前没有选中角色，无法获取角色正则');
  }
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

interface ReplaceTavernRegexesOption {
  scope?: 'all' | 'global' | 'character'; // 要替换的酒馆正则部分
}

/**
 * 判断局部正则是否启用
 * @returns 布尔值
 */
export function isCharacterTavernRegexesEnabled(): boolean {
  const result = isCharacterTavernRegexEnabled();

  console.info(`查询到局部正则${result ? '被启用' : '被禁用'}`);
  return result;
}

/**
 * 获取酒馆正则
 *
 * @param option 可选选项
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 `TavernRegex`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 */
export function getTavernRegexes(option: GetTavernRegexesOption = { scope: 'all', enable_state: 'all' }): TavernRegex[] {
  const { scope = 'all', enable_state = 'all' } = option;

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

  return regexes;
}

/**
 * 完全替换酒馆正则为 `regexes`.
 * - **这是一个很慢的操作!** 尽量对正则做完所有事后再一次性 replaceTavernRegexes.
 * - **为了重新应用正则, 它会重新载入整个聊天消息**, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载全局脚本和楼层消息.
 *     这意味着如果你在全局脚本中运行本函数, 则该函数之后的内容将不会被执行.
 *
 * 之所以提供这么直接的函数, 是因为你可能需要调换正则顺序等.
 *
 * @param regexes 要用于替换的酒馆正则
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 */
export async function replaceTavernRegexes(
  regexes: TavernRegex[],
  option: ReplaceTavernRegexesOption = { scope: 'all' },
): Promise<void> {
  const { scope = 'all' } = option;

  if (!['all', 'global', 'character'].includes(scope)) {
    throw Error(`提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${scope}`);
  }

  // FIXME: `trimStrings` and `substituteRegex` are not considered
  const emptied_regexes = regexes.filter(regex => regex.script_name == '');
  if (emptied_regexes.length > 0) {
    throw Error(`不能将酒馆正则的名称设置为空字符串:\n${JSON.stringify(emptied_regexes.map(regex => regex.id))}`);
  }
  const [global_regexes, character_regexes] = partition(regexes, regex => regex.scope === 'global').map(regexes =>
    regexes.map(fromTavernRegex),
  );

  if (this_chid === undefined) {
    throw new Error('当前没有选中角色，无法获取角色正则');
  }
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
  await saveSettings();
  if (character) {
    await saveChatConditional();
  }
  await reloadCurrentChat();

  console.info(`替换酒馆正则\
${scope === 'all' || scope === 'global' ? `, 全局正则:\n${JSON.stringify(global_regexes, undefined, 2)}` : ``}\
${scope === 'all' || scope === 'character' ? `, 局部正则:\n${JSON.stringify(character_regexes, undefined, 2)}` : ``}`);
}
