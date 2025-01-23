export { script_load_events, initializeScripts, destroyScriptsIfInitialized };
import { event_types } from '../../../../../script.js';
import { iframe_client } from './iframe_client_exported/index.js';
import { script_url } from './script_url.js';
import { libraries_text } from './library.js';
import { third_party } from './third_party.js';
import { loadScripts } from './util/load_script.js';
let script_map = new Map();
const script_load_events = [
    event_types.CHAT_CHANGED
];
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
        const scripts = loadScripts("脚本-");
        console.info(`[Script] 加载全局脚本: ${JSON.stringify(scripts.map(script => script.name))}`);
        const load_promises = [];
        scripts.forEach((script) => {
            const { iframe, load_promise } = makeScriptIframe(script);
            script_map.set(script.name, iframe);
            load_promises.push(load_promise);
        });
        await Promise.allSettled(load_promises);
    }
    catch (error) {
        console.error('[Script] 全局脚本加载失败:', error);
        throw error;
    }
}
//# sourceMappingURL=script_iframe.js.map