export { handleRegexData, isCharacterRegexEnabled, getGlobalRegexes, getCharacterRegexes };
import { characters, this_chid } from "../../../../../../script.js";
import { extension_settings } from "../../../../../extensions.js";
import { regex_placement } from "../../../../regex/engine.js";
// TODO: don't repeat this in all files
function getIframeName(event) {
    const window = event.source;
    return window.frameElement?.id;
}
function isCharacterRegexEnabled() {
    // @ts-ignore 2345
    return extension_settings?.character_allowed_regex?.includes(characters?.[this_chid]?.avatar);
}
function getGlobalRegexes() {
    return extension_settings.regex ?? [];
}
function getCharacterRegexes() {
    return characters[this_chid]?.data?.extensions?.regex_scripts ?? [];
}
function toRegexData(regex_script_data, scope) {
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
        min_depth: typeof regex_script_data.minDepth === 'number' ? regex_script_data.minDepth : undefined,
        max_depth: typeof regex_script_data.maxDepth === 'number' ? regex_script_data.maxDepth : undefined,
    };
}
const event_handlers = {
    iframe_is_character_regex_enabled: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        event.source.postMessage({
            request: 'iframe_is_character_regex_enabled_callback',
            uid: uid,
            result: isCharacterRegexEnabled(),
        }, { targetOrigin: "*" });
        console.info(`[Regex][isCharacterRegexEnabled](${iframe_name}) 获取局部正则是否被启用`);
    },
    iframe_get_regex_data: async (event) => {
        const iframe_name = getIframeName(event);
        const uid = event.data.uid;
        const option = event.data.option;
        if (!['all', 'enabled', 'disabled'].includes(option.enable_state)) {
            throw Error(`[Regex][getRegexData](${iframe_name}) 提供的 enable_state 无效, 请提供 'all', 'enabled' 或 'disabled', 你提供的是: ${option.enable_state}`);
        }
        if (!['all', 'global', 'character'].includes(option.scope)) {
            throw Error(`[Regex][getRegexData](${iframe_name}) 提供的 scope 无效, 请提供 'all', 'global' 或 'character', 你提供的是: ${option.scope}`);
        }
        let regexes = [];
        if (option.scope === 'all' || option.scope === 'global') {
            regexes = [...regexes, ...getGlobalRegexes().map(regex => toRegexData(regex, 'global'))];
        }
        if (option.scope === 'all' || option.scope === 'character') {
            regexes = [...regexes, ...getCharacterRegexes().map(regex => toRegexData(regex, 'character'))];
        }
        if (option.enable_state !== 'all') {
            regexes = regexes.filter(regex => regex.enabled === (option.enable_state === 'enabled'));
        }
        event.source.postMessage({
            request: 'iframe_get_regex_data_callback',
            uid: uid,
            result: regexes,
        }, { targetOrigin: "*" });
        console.info(`[Regex][getRegexData](${iframe_name}) 获取正则数据, 选项: ${JSON.stringify(option)}`);
    },
};
async function handleRegexData(event) {
    if (!event.data)
        return;
    try {
        const handler = event_handlers[event.data.request];
        if (handler) {
            handler(event);
        }
    }
    catch (error) {
        console.error(`${error}`);
        throw error;
    }
}
//# sourceMappingURL=regex_data.js.map