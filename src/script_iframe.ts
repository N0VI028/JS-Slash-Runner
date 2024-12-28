export { script_load_events, initializeScripts, destroyScriptsIfInitialized }

import { iframe_client } from './iframe_client_exported/index.js';
import { partition } from './util/helper.js';
import { script_url } from './script_url.js';

import { RegexScriptData } from '../../../../char-data.js';
import { getCharacterRegexes, getGlobalRegexes, isCharacterRegexEnabled } from './iframe_server/regex_data.js';

import { event_types } from '../../../../../script.js';

interface Script {
  name: string;
  code: string;
};

let script_map: Map<string, HTMLIFrameElement> = new Map();

const script_load_events = [
  event_types.CHAT_CHANGED
];

function loadScripts(): Script[] {
  const filterScriptFromRegex = (script: RegexScriptData) => script.scriptName.startsWith("脚本-");
  const isEnabled = (script: RegexScriptData) => !script.disabled;
  const toName = (script: RegexScriptData) => script.scriptName.replace('脚本-', '');

  let scripts: RegexScriptData[] = [];

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
  } else {
    console.info(`[Script] 局部正则目前正禁用, 仅加载局部正则中 "在编辑时运行" 的全局脚本:`);
    const [editing_character_regexes, nonediting_character_regexes] = partition(character_regexes, script => script.runOnEdit);
    const [enabled_character_regexes, disabled_character_regexes] = partition(editing_character_regexes, isEnabled);
    console.info(`[Script]   将会加载: ${JSON.stringify(enabled_character_regexes.map(toName))}`);
    console.info(`[Script]   将会禁用以下被禁用的正则: ${JSON.stringify(disabled_character_regexes.map(toName))}`);
    console.info(`[Script]   将会禁用以下未开启 "在编辑时运行" 的正则: ${JSON.stringify(nonediting_character_regexes.map(toName))}`);
    scripts = [...scripts, ...enabled_character_regexes];
  }

  const to_script = (script: RegexScriptData) => ({ name: toName(script), code: script.replaceString });
  return scripts.map(to_script);
}

function makeScriptIframe(script: Script): { iframe: HTMLIFrameElement; load_promise: Promise<void>; } {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = `script-iframe-${script.name}`;

  const load_promise = new Promise<void>((resolve) => {
    iframe.onload = () => {
      // @ts-ignore: 18047
      const doc = iframe.contentDocument || iframe.contentWindow.document;

      const iframeContent = `
        <html>
        <head>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js" integrity="sha512-v2CJ7UaYy4JwqLDIrZUI/4hqeoQieOmAZNXBeQyjo21dadnwR+8ZaIJVT8EE2iyI61OV8e6M8PP2/4hpQINQ/g==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
          <script src="${script_url.get(iframe_client)}"></script>
        </head>
        <body>
          ${script.code}
        </body>
        </html>
      `;

      doc.open();
      doc.write(iframeContent);
      doc.close();

      console.info(`[Script](${iframe.id}) 加载完毕`)
      resolve();
    }
  });

  document.body.appendChild(iframe);

  return { iframe, load_promise };
}

function destroyScriptsIfInitialized(): void {
  if (script_map.size !== 0) {
    console.log(`[Script] 清理全局脚本...`);
    script_map.forEach((iframe, _) => {
      iframe.remove();
    });
    script_map.clear();
    console.log(`[Script] 全局脚本清理完成!`);
  }
}

async function initializeScripts(): Promise<void> {
  try {
    destroyScriptsIfInitialized();

    const scripts = loadScripts();

    const load_promises: Promise<void>[] = [];

    scripts.forEach((script) => {
      const { iframe, load_promise } = makeScriptIframe(script);
      script_map.set(script.name, iframe);
      load_promises.push(load_promise);
    })

    await Promise.allSettled(load_promises);
    console.log('[Script] 全局脚本加载成功!')
  } catch (error) {
    console.error('[Script] 全局脚本加载失败:', error);
    throw error;
  }
}
