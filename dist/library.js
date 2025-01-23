export { libraries_text, library_load_events, initializeLibraries };
import { getCharacterRegexes, getGlobalRegexes, isCharacterTavernRegexEnabled } from './iframe_server/tavern_regex.js';
import { event_types } from '../../../../../script.js';
import { partition } from './util/helper.js';
let libraries_text = "";
const library_load_events = [
    event_types.CHAT_CHANGED
];
function initializeLibraries() {
    const filterScriptFromRegex = (script) => script.scriptName.startsWith("库-");
    const isEnabled = (script) => !script.disabled;
    const toName = (script) => script.scriptName.replace('库-', '');
    let scripts = [];
    console.info(`[Library] 加载库...`);
    const global_regexes = getGlobalRegexes().filter(filterScriptFromRegex);
    console.info(`[Library] 加载全局正则中的库:`);
    const [enabled_global_regexes, disabled_global_regexes] = partition(global_regexes, isEnabled);
    console.info(`[Library]   将会使用: ${JSON.stringify(enabled_global_regexes.map(toName))}`);
    console.info(`[Library]   将会禁用: ${JSON.stringify(disabled_global_regexes.map(toName))}`);
    scripts = [...scripts, ...enabled_global_regexes];
    const character_regexes = getCharacterRegexes().filter(filterScriptFromRegex);
    if (isCharacterTavernRegexEnabled()) {
        console.info(`[Library] 局部正则目前正启用, 加载局部正则中的库:`);
        const [enabled_character_regexes, disabled_character_regexes] = partition(character_regexes, isEnabled);
        console.info(`[Library]   将会使用: ${JSON.stringify(enabled_character_regexes.map(toName))}`);
        console.info(`[Library]   将会禁用: ${JSON.stringify(disabled_character_regexes.map(toName))}`);
        scripts = [...scripts, ...enabled_character_regexes];
    }
    else {
        console.info(`[Library] 局部正则目前正禁用, 仅使用局部正则中 "在编辑时运行" 的库:`);
        const [editing_character_regexes, nonediting_character_regexes] = partition(character_regexes, script => script.runOnEdit);
        const [enabled_character_regexes, disabled_character_regexes] = partition(editing_character_regexes, isEnabled);
        console.info(`[Library]   将会使用: ${JSON.stringify(enabled_character_regexes.map(toName))}`);
        console.info(`[Library]   将会禁用以下被禁用的库: ${JSON.stringify(disabled_character_regexes.map(toName))}`);
        console.info(`[Library]   将会禁用以下未开启 "在编辑时运行" 的库: ${JSON.stringify(nonediting_character_regexes.map(toName))}`);
        scripts = [...scripts, ...enabled_character_regexes];
    }
    console.info(`[Library] 库加载成功!`);
    libraries_text = scripts.map(script => script.replaceString).join('\n');
}
//# sourceMappingURL=library.js.map