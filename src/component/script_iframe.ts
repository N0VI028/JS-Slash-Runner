import { getCharacterRegexes, getGlobalRegexes, isCharacterTavernRegexEnabled } from '@/function/tavern_regex';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';

import { event_types, eventSource } from '@sillytavern/script';
import { RegexScriptData } from '@sillytavern/scripts/char-data';

import log from 'loglevel';

interface Script {
  name: string;
  code: string;
}

function loadScripts(): Script[] {
  const prefix = '脚本-';
  const filterScriptFromRegex = (script: RegexScriptData) =>
    script.scriptName.replace(/^【.*】/, '').startsWith(prefix);
  const isEnabled = (script: RegexScriptData) => !script.disabled;
  const toName = (script: RegexScriptData) => script.scriptName.replace(/^【.*】/, '').replace(prefix, '');

  const scripts: RegexScriptData[] = [];

  const enabled_global_regexes = getGlobalRegexes().filter(filterScriptFromRegex).filter(isEnabled);
  scripts.push(...enabled_global_regexes);

  const enabled_character_regexes = getCharacterRegexes()
    .filter(filterScriptFromRegex)
    .filter(isEnabled)
    .filter(script => (isCharacterTavernRegexEnabled() ? true : script.runOnEdit));
  scripts.push(...enabled_character_regexes);

  const to_script = (script: RegexScriptData) => ({ name: toName(script), code: script.replaceString });
  return scripts.map(to_script);
}

const script_map: Map<string, { iframe: HTMLIFrameElement; blobUrl: string }> = new Map();

function makeScriptIframe(script: Script): { iframe: HTMLIFrameElement; load_promise: Promise<void>; blobUrl: string } {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.id = `script-iframe-${script.name}`;

  const srcdocContent = `
    <html>
    <head>
      <base href="${window.location.origin}/">
      ${third_party}
      <script src="${script_url.get('iframe_client')}"></script>
    </head>
    <body>
      ${script.code}
    </body>
    </html>
  `;

  const blob = new Blob([srcdocContent], { type: 'text/html' });
  const blobUrl = URL.createObjectURL(blob);
  iframe.src = blobUrl;

  const load_promise = new Promise<void>(resolve => {
    iframe.onload = () => {
      log.info(`[(deprecated)Script](${iframe.id}) 加载完毕`);
      resolve();
    };
  });

  document.body.appendChild(iframe);

  return { iframe, load_promise, blobUrl };
}

function destroy(): void {
  if (script_map.size !== 0) {
    log.info(`[(deprecated)Script] 清理全局脚本...`);
    script_map.forEach(({ iframe, blobUrl }, _) => {
      iframe.remove();
      URL.revokeObjectURL(blobUrl);
    });
    script_map.clear();
    log.info(`[(deprecated)Script] 全局脚本清理完成!`);
  }
}

async function initialize(): Promise<void> {
  try {
    destroy();

    const scripts = loadScripts();
    log.info(`[(deprecated)Script] 加载全局脚本: ${JSON.stringify(scripts.map(script => script.name))}`);

    const load_promises: Promise<void>[] = [];

    scripts.forEach(script => {
      const { iframe, load_promise, blobUrl } = makeScriptIframe(script);
      script_map.set(script.name, { iframe, blobUrl });
      load_promises.push(load_promise);
    });

    await Promise.allSettled(load_promises);
  } catch (error) {
    log.error('[(deprecated)Script] 全局脚本加载失败:', error);
    throw error;
  }
}

const load_events = [event_types.CHAT_CHANGED] as const;

export function initializeCharacterLevelOnExtension() {
  initialize();
  load_events.forEach(eventType => {
    eventSource.makeFirst(eventType, initialize);
  });
}

export function destroyCharacterLevelOnExtension() {
  load_events.forEach(eventType => {
    eventSource.removeListener(eventType, initialize);
  });
  destroy();
}
