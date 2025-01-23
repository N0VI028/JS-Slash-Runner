import { characters, this_chid } from "../../../../../../script.js";
import { RegexScriptData } from "../../../../../char-data.js";
import { extension_settings } from "../../../../../extensions.js";
import { regex_placement } from "../../../../regex/engine.js";
import { getIframeName, IframeMessage, registerIframeHandler } from "./index.js";

interface IframeIsCharacterTavernRegexEnabled extends IframeMessage {
  request: 'iframe_is_character_tavern_regexes_enabled';
}

interface IframeGetTavernRegexes extends IframeMessage {
  request: 'iframe_get_tavern_regexes';
  option: Required<GetTavernRegexesOption>;
}

interface IframeSetTavernRegexes extends IframeMessage {
  request: 'iframe_set_tavern_regexes';
  regexes: (Pick<TavernRegex, "id"> & Omit<Partial<TavernRegex>, "id">)[];
}

interface IframeCreateTavernRegex extends IframeMessage {
  request: 'iframe_create_tavern_regex';
  field_values: Pick<TavernRegex, "scope"> & Omit<Partial<TavernRegex>, "id" | "scope">;
}

interface IframeDeleteTavernRegex extends IframeMessage {
  request: 'iframe_delete_tavern_regex';
  id: string;
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

function fromPartialTavernRegex(tavern_regex: Partial<TavernRegex>): { data: Partial<RegexScriptData>, scope?: 'global' | 'character' } {
  const transformers = {
    id: (value: TavernRegex['id']) => ({ id: value }),
    script_name: (value: TavernRegex['script_name']) => ({ scriptName: value }),
    enabled: (value: TavernRegex['enabled']) => ({ disabled: !value }),
    run_on_edit: (value: TavernRegex['run_on_edit']) => ({ runOnEdit: !value }),

    find_regex: (value: TavernRegex['find_regex']) => ({ findRegex: value }),
    replace_string: (value: TavernRegex['replace_string']) => ({ replaceString: value }),

    min_depth: (value: TavernRegex['min_depth']) => ({ minDepth: value }),
    max_depth: (value: TavernRegex['max_depth']) => ({ maxDepth: value }),

    destination: (value: TavernRegex['destination']) => ({ markdownOnly: value.display, promptOnly: value.prompt }),
  };

  const placement: number[] | undefined = tavern_regex.source
    ? [
      ...(tavern_regex.source.user_input ? [regex_placement.USER_INPUT] : []),
      ...(tavern_regex.source.ai_output ? [regex_placement.AI_OUTPUT] : []),
      ...(tavern_regex.source.slash_command ? [regex_placement.SLASH_COMMAND] : []),
      ...(tavern_regex.source.world_info ? [regex_placement.WORLD_INFO] : []),
    ]
    : undefined;

  // destination: {
  //   display: regex_script_data.markdownOnly,
  //   prompt: regex_script_data.promptOnly,
  // },

  return {
    data: Object.entries(tavern_regex)
      .filter(([_, value]) => value !== undefined)
      .reduce((result, [field, value]) => (
        {
          ...result,
          // @ts-ignore
          ...transformers[field]?.(value)
        }),
        {
          placement: placement
        }),
    scope: tavern_regex.scope,
  };
}

export function registerIframeTavernRegexHandler() {
  registerIframeHandler(
    'iframe_is_character_tavern_regexes_enabled',
    async (event: MessageEvent<IframeIsCharacterTavernRegexEnabled>): Promise<boolean> => {
      const iframe_name = getIframeName(event);

      const result = isCharacterTavernRegexEnabled();

      console.info(`[Regex][isCharacterRegexEnabled](${iframe_name}) 查询到局部正则${result ? '被启用' : '被禁用'}`);
      return result;
    },
  );

  registerIframeHandler(
    'iframe_get_tavern_regexes',
    async (event: MessageEvent<IframeGetTavernRegexes>): Promise<TavernRegex[]> => {
      const iframe_name = getIframeName(event);
      const option = event.data.option;

      if (!['all', 'enabled', 'disabled'].includes(option.enable_state)) {
        throw Error(`[Regex][getTavernRegexes](${iframe_name}) 提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled', 你提供的是: ${option.enable_state}`)
      }
      if (!['all', 'global', 'character'].includes(option.scope)) {
        throw Error(`[Regex][getTavernRegexes](${iframe_name}) 提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${option.scope}`)
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

      console.info(`[Regex][getTavernRegexes](${iframe_name}) 获取酒馆正则数据, 选项: ${JSON.stringify(option)}`);
      return regexes;
    },
  );

  registerIframeHandler(
    'iframe_set_tavern_regexes',
    async (event: MessageEvent<IframeSetTavernRegexes>): Promise<void> => {
      const iframe_name = getIframeName(event);
      const regexes = event.data.regexes;

      console.info(`[Regex][setTavernRegexes](${iframe_name}) 修改以下酒馆正则中的以下字段: ${JSON.stringify(regexes)}`);
    },
  );
}
