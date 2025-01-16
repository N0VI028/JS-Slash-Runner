export { script_load_events, initializeScripts, destroyScriptsIfInitialized };
import { event_types } from '../../../../../script.js';
import { iframe_client } from './iframe_client_exported/index.js';
import { script_url } from './script_url.js';
import { getCharacterRegexes, getGlobalRegexes, isCharacterRegexEnabled } from './iframe_server/regex_data.js';
import { libraries_text } from './library.js';
import { partition } from './util/helper.js';
import { third_party } from './third_party.js';
;
let script_map = new Map();
const script_load_events = [
    event_types.CHAT_CHANGED
];
function loadScripts() {
    const filterScriptFromRegex = (script) => script.scriptName.startsWith("脚本-");
    const isEnabled = (script) => !script.disabled;
    const toName = (script) => script.scriptName.replace('脚本-', '');
    let scripts = [];
    console.info(`[Script] 加载全局脚本...`);
    const global_regexes = getGlobalRegexes().filter(filterScriptFromRegex);
    console.info(`[Script] 加载全局正则中的全局脚本:`);
    const [enabled_global_regexes, disabled_global_regexes] = partition(global_regexes, isEnabled);
    console.info(`[Script]   将会加载: ${JSON.stringify(enabled_global_regexes.map(toName))}`);
    console.info(`[Script]   将会禁用: ${JSON.stringify(disabled_global_regexes.map(toName))}`);
    scripts = [...scripts, ...enabled_global_regexes];
    const character_regexes = getCharacterRegexes().filter(filterScriptFromRegex);
    if (isCharacterRegexEnabled()) {
        console.info(`[Script] 局部正则目前正启用, 加载局部正则中的全局脚本:`);
        const [enabled_character_regexes, disabled_character_regexes] = partition(character_regexes, isEnabled);
        console.info(`[Script]   将会加载: ${JSON.stringify(enabled_character_regexes.map(toName))}`);
        console.info(`[Script]   将会禁用: ${JSON.stringify(disabled_character_regexes.map(toName))}`);
        scripts = [...scripts, ...enabled_character_regexes];
    }
    else {
        console.info(`[Script] 局部正则目前正禁用, 仅加载局部正则中 "在编辑时运行" 的全局脚本:`);
        const [editing_character_regexes, nonediting_character_regexes] = partition(character_regexes, script => script.runOnEdit);
        const [enabled_character_regexes, disabled_character_regexes] = partition(editing_character_regexes, isEnabled);
        console.info(`[Script]   将会加载: ${JSON.stringify(enabled_character_regexes.map(toName))}`);
        console.info(`[Script]   将会禁用以下被禁用的全局脚本: ${JSON.stringify(disabled_character_regexes.map(toName))}`);
        console.info(`[Script]   将会禁用以下未开启 "在编辑时运行" 的全局脚本: ${JSON.stringify(nonediting_character_regexes.map(toName))}`);
        scripts = [...scripts, ...enabled_character_regexes];
    }
    const to_script = (script) => ({ name: toName(script), code: script.replaceString });
    return scripts.map(to_script);
}
function makeScriptIframe(script) {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.id = `script-iframe-${script.name}`;
    const srcdocContent = `
    <html>
    <head>
      ${third_party}
      <script src="${script_url.get(iframe_client)}"></script>
      ${libraries_text}
    </head>
    <body>
      ${script.code}
    </body>
    </html>
  `;
    iframe.srcdoc = srcdocContent;
    const load_promise = new Promise((resolve) => {
        iframe.onload = () => {
            console.info(`[Script](${iframe.id}) 加载完毕`);
            resolve();
        };
    });
    document.body.appendChild(iframe);
    return { iframe, load_promise };
}
function destroyScriptsIfInitialized() {
    if (script_map.size !== 0) {
        console.log(`[Script] 清理全局脚本...`);
        script_map.forEach((iframe, _) => {
            iframe.remove();
        });
        script_map.clear();
        console.log(`[Script] 全局脚本清理完成!`);
    }
}
async function initializeScripts() {
    try {
        destroyScriptsIfInitialized();
        const scripts = loadScripts();
        const load_promises = [];
        scripts.forEach((script) => {
            const { iframe, load_promise } = makeScriptIframe(script);
            script_map.set(script.name, iframe);
            load_promises.push(load_promise);
        });
        await Promise.allSettled(load_promises);
        console.log('[Script] 全局脚本加载成功!');
    }
    catch (error) {
        console.error('[Script] 全局脚本加载失败:', error);
        throw error;
    }
}
//# sourceMappingURL=script_iframe.js.map