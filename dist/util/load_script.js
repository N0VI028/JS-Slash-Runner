import { getCharacterRegexes, getGlobalRegexes, isCharacterTavernRegexEnabled } from "../iframe_server/tavern_regex.js";
;
export function loadScripts(prefix) {
    const filterScriptFromRegex = (script) => script.scriptName.startsWith(prefix);
    const isEnabled = (script) => !script.disabled;
    const toName = (script) => script.scriptName.replace(prefix, '');
    let scripts = [];
    const enabled_global_regexes = getGlobalRegexes()
        .filter(filterScriptFromRegex)
        .filter(isEnabled);
    scripts.push(...enabled_global_regexes);
    const enabled_character_regexes = getCharacterRegexes()
        .filter(filterScriptFromRegex)
        .filter(isEnabled)
        .filter(script => isCharacterTavernRegexEnabled() ? true : script.runOnEdit);
    scripts.push(...enabled_character_regexes);
    const to_script = (script) => ({ name: toName(script), code: script.replaceString });
    return scripts.map(to_script);
}
export function is_equal_scripts(lhs, rhs) {
    if (lhs === rhs) {
        return true;
    }
    if (lhs == null || rhs == null) {
        return false;
    }
    if (lhs.length !== rhs.length) {
        return false;
    }
    for (let i = 0; i < lhs.length; i++) {
        if (lhs[i].name !== rhs[i].name && lhs[i].code !== rhs[i].code) {
            return false;
        }
        ;
    }
    return true;
}
//# sourceMappingURL=load_script.js.map