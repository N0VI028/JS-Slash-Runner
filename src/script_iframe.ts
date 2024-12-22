export { script_load_events, initializeScripts, destroyScriptsIfInitialized }

import { iframe_client } from './iframe_client_exported/index.js';
import { partition } from './util/helper.js';

import { RegexScriptData } from '../../../../char-data.js';
import { extension_settings } from '../../../../extensions.js';
import { characters, event_types, this_chid } from '../../../../../script.js';

function getGlobalScripts(): RegexScriptData[] {
  return extension_settings.regex ?? [];
}

function getCharacterScripts(): RegexScriptData[] {
  const scripts: RegexScriptData[] = characters[this_chid]?.data?.extensions?.regex_scripts ?? [];

  // @ts-ignore 2345
  const is_enabled = extension_settings?.character_allowed_regex?.includes(characters?.[this_chid]?.avatar);
  if (!is_enabled) {
    return scripts.filter((script) => script.runOnEdit);
  }
  return scripts;
}

interface Script {
  name: string;
  code: string;
};

let script_map: Map<string, HTMLIFrameElement> = new Map();

const script_load_events = [
  event_types.CHAT_CHANGED
];

function loadScripts(): Script[] {
  const scripts = [...getGlobalScripts(), ...getCharacterScripts()].filter((script) => script.scriptName.startsWith("脚本-"));
  const [disabled, enabled] = partition(scripts, (script) => script.disabled);

  const to_name = (script: RegexScriptData) => script.scriptName.replace('脚本-', '');
  console.info(`[Script] 加载全局脚本...`);
  console.info(`[Script] 将会加载以下全局脚本: ${enabled.map(to_name)}`);
  console.info(`[Script] 将会禁用以下全局脚本: ${disabled.map(to_name)}`);

  const to_script = (script: RegexScriptData) => ({ name: to_name(script), code: script.replaceString });
  return enabled.map(to_script);
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
            <script>
              ${iframe_client}
            </script>
          <script>
          </script>
          </head>
        <body>
          ${script.code}
        </body>
        </html>
      `;

      doc.open();
      doc.write(iframeContent);
      doc.close();

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
