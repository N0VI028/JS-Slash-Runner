import { characters, getCurrentChatId, reloadCurrentChat, saveSettingsDebounced, this_chid } from "../../../../../../script.js";
import { RegexScriptData } from "../../../../../char-data.js";
import { extension_settings, writeExtensionField } from "../../../../../extensions.js";
import { regex_placement, substitute_find_regex } from "../../../../regex/engine.js";
import { partition } from "../util/helper.js";
import { getLogPrefix, IframeMessage, registerIframeHandler } from "./index.js";

interface IframeIsCharacterTavernRegexEnabled extends IframeMessage {
  request: '[TavernRegex][isCharacterTavernRegexesEnabled]';
}

interface IframeGetTavernRegexes extends IframeMessage {
  request: '[TavernRegex][getTavernRegexes]';
  option: Required<GetTavernRegexesOption>;
}

interface IframeReplaceTavernRegexes extends IframeMessage {
  request: '[TavernRegex][replaceTavernRegexes]';
  regexes: TavernRegex[];
  option: Required<ReplaceTavernRegexesOption>;
}

export function isCharacterTavernRegexEnabled(): boolean {
  // @ts-ignore 2345
  return extension_settings?.character_allowed_regex?.includes(characters?.[this_chid]?.avatar);
}

export function getGlobalRegexes(): RegexScriptData[] {
  return extension_settings.regex ?? [];
}

export function getCharacterRegexes(): RegexScriptData[] {
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
    trimStrings: [],  // TODO: handle this?

    placement: [
      ...(tavern_regex.source.user_input ? [regex_placement.USER_INPUT] : []),
      ...(tavern_regex.source.ai_output ? [regex_placement.AI_OUTPUT] : []),
      ...(tavern_regex.source.slash_command ? [regex_placement.SLASH_COMMAND] : []),
      ...(tavern_regex.source.world_info ? [regex_placement.WORLD_INFO] : []),
    ],

    substituteRegex: substitute_find_regex.NONE,  // TODO: handle this?

    // @ts-ignore
    minDepth: tavern_regex.min_depth,
    // @ts-ignore
    maxDepth: tavern_regex.max_depth,

    markdownOnly: tavern_regex.destination.display,
    promptOnly: tavern_regex.destination.prompt,
  };
}

export function registerIframeTavernRegexHandler() {
  registerIframeHandler(
    '[TavernRegex][isCharacterTavernRegexesEnabled]',
    async (event: MessageEvent<IframeIsCharacterTavernRegexEnabled>): Promise<boolean> => {
      const result = isCharacterTavernRegexEnabled();

      console.info(`${getLogPrefix(event)}查询到局部正则${result ? '被启用' : '被禁用'}`);
      return result;
    },
  );

  registerIframeHandler(
    '[TavernRegex][getTavernRegexes]',
    async (event: MessageEvent<IframeGetTavernRegexes>): Promise<TavernRegex[]> => {
      const option = event.data.option;

      if (!['all', 'enabled', 'disabled'].includes(option.enable_state)) {
        throw Error(`${getLogPrefix(event)}提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled', 你提供的是: ${option.enable_state}`)
      }
      if (!['all', 'global', 'character'].includes(option.scope)) {
        throw Error(`${getLogPrefix(event)}提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${option.scope}`)
      }

      let regexes: TavernRegex[] = [];
      if (option.scope === 'all' || option.scope === 'global') {
        regexes = [...regexes, ...getGlobalRegexes().map(regex => toTavernRegex(regex, 'global'))]
      }
      if (option.scope === 'all' || option.scope === 'character') {
        regexes = [...regexes, ...getCharacterRegexes().map(regex => toTavernRegex(regex, 'character'))]
      }
      if (option.enable_state !== 'all') {
        regexes = regexes.filter(regex => regex.enabled === (option.enable_state === 'enabled'));
      }

      console.info(`${getLogPrefix(event)}获取酒馆正则数据, 选项: ${JSON.stringify(option)}`);
      return regexes;
    },
  );

  registerIframeHandler(
    '[TavernRegex][replaceTavernRegexes]',
    async (event: MessageEvent<IframeReplaceTavernRegexes>): Promise<void> => {
      const regexes = event.data.regexes;
      const option = event.data.option;
      if (!['all', 'global', 'character'].includes(option.scope)) {
        throw Error(`${getLogPrefix(event)}提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${option.scope}`)
      }

      // FIXME: `trimStrings` and `substituteRegex` are not considered
      const emptied_regexes = regexes.filter(regex => regex.script_name == '');
      if (emptied_regexes.length > 0) {
        throw Error(`${getLogPrefix(event)}不能将酒馆正则的名称设置为空字符串: ${JSON.stringify(emptied_regexes.map(regex => regex.id))}`);
      }
      const [global_regexes, character_regexes]
        = partition(regexes, regex => regex.scope === 'global')
          .map(regexes => regexes.map(fromTavernRegex));

      if (option.scope === 'all' || option.scope === 'global') {
        extension_settings.regex = global_regexes;
      }
      if (option.scope === 'all' || option.scope === 'character') {
        characters[this_chid].data.extensions.regex_scripts = character_regexes;
        await writeExtensionField(this_chid, 'regex_scripts', character_regexes);
      }
      saveSettingsDebounced();

      const current_chat_id = getCurrentChatId();
      if (current_chat_id !== undefined && current_chat_id !== null) {
        await reloadCurrentChat();
      }

      console.info(`${getLogPrefix(event)}替换酒馆正则\
${option.scope === 'all' || option.scope === 'global' ? `, 全局正则: ${JSON.stringify(global_regexes)}` : ``}\
${option.scope === 'all' || option.scope === 'character' ? `, 局部正则: ${JSON.stringify(character_regexes)}` : ``}`);
    },
  );
}
