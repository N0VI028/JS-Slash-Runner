import Iframe from '@/panel/render/Iframe.vue';
import { collapseCodeBlocksInContent } from '@/panel/render/use_collapse_code_block';
import { replaceMacroLike } from '@/panel/render/macro_like';
import { useGlobalSettingsStore } from '@/store/settings';
import { isFrontend } from '@/util/is_frontend';
import { chat, redisplayChat } from '@sillytavern/script';
import { h, render } from 'vue';

type DetachedContext = { mesid: number; content: HTMLElement };
type RuntimeContext = DetachedContext & { source: Element };
type RuntimeClaims = { claim(source: Element, activate: (context: RuntimeContext) => () => void): void };
type Registration = { fault(error: unknown): void };

// A static import of TauriTavern's syntax sugar would make this bundle unloadable in upstream SillyTavern.
function getChatSurfaceApi(): any {
  return (window as any).__TAURITAVERN__?.api?.chatSurface;
}

export const usesManagedChatSurface = (() => {
  if (!(window as any).__TAURITAVERN__) {
    return false;
  }
  const query = getChatSurfaceApi()?.isManagedOwnershipRequired;
  if (typeof query !== 'function') {
    throw new Error('TauriTavern ChatSurface ownership query is unavailable');
  }
  const managed = query();
  if (typeof managed !== 'boolean') {
    throw new TypeError('TauriTavern ChatSurface ownership query must return a boolean');
  }
  return managed;
})();

function settings() {
  const value = useGlobalSettingsStore().settings;
  if (value.render.allow_streaming) {
    throw new Error('JS-Slash-Runner streaming rendering is not supported by managed ChatSurface');
  }
  return value;
}

function prepareContent({ mesid, content }: DetachedContext) {
  if (!settings().macro.enabled) {
    return;
  }
  const message = chat[mesid];
  const html = content.innerHTML;
  const replaced = replaceMacroLike(html, {
    message_id: mesid,
    role: message?.is_user ? 'user' : 'assistant',
  });
  if (replaced !== html) {
    content.innerHTML = replaced;
  }
}

function isEligibleMessage(mesid: number, depth: number, ignore_hidden: boolean) {
  if (ignore_hidden && chat[mesid]?.is_system) {
    return false;
  }
  if (depth === 0) {
    return true;
  }
  let remaining = depth;
  for (let index = chat.length - 1; index >= 0; index--) {
    if (ignore_hidden && chat[index]?.is_system) {
      continue;
    }
    if (index === mesid) {
      return remaining > 0;
    }
    remaining--;
    if (remaining === 0) {
      return false;
    }
  }
  return false;
}

function runtimeContainer(pre: HTMLPreElement) {
  const parent = pre.parentElement;
  if (parent?.matches('div.TH-render') && parent.querySelectorAll('pre').length === 1) {
    return parent;
  }
  const container = document.createElement('div');
  container.className = 'TH-render';
  pre.replaceWith(container);
  container.append(pre);
  return container;
}

function mountRuntime({ source, mesid, content }: RuntimeContext, useBlobUrl: boolean) {
  if (!(source instanceof HTMLPreElement) || !isFrontend(source.textContent ?? '')) {
    throw new Error('JS-Slash-Runner managed runtime source is no longer eligible');
  }
  const container = source.parentElement;
  if (!(container instanceof HTMLDivElement) || !container.matches('div.TH-render')) {
    throw new Error('JS-Slash-Runner managed runtime container is missing');
  }
  const index = Array.from(content.querySelectorAll('pre'))
    .filter(pre => isFrontend(pre.textContent ?? ''))
    .indexOf(source);

  try {
    render(h(Iframe, { id: `${mesid}--${index}`, element: container, useBlobUrl }), container);
  } catch (error) {
    render(null, container);
    throw error;
  }

  return () => render(null, container);
}

function claimRuntimes({ mesid, content }: DetachedContext, claims: RuntimeClaims) {
  const { render: render_settings } = settings();
  if (
    !render_settings.enabled ||
    !isEligibleMessage(mesid, render_settings.depth, render_settings.depth_ignore_hidden)
  ) {
    return;
  }

  for (const pre of content.querySelectorAll<HTMLPreElement>('pre')) {
    if (!isFrontend(pre.textContent ?? '')) {
      continue;
    }
    runtimeContainer(pre);
    claims.claim(pre, context => mountRuntime(context, render_settings.use_blob_url));
  }
}

function didCommitContent({ content }: DetachedContext) {
  const { render: render_settings } = settings();
  if (!render_settings.enabled || render_settings.collapse_code_block === 'none') {
    return;
  }
  return collapseCodeBlocksInContent(content, render_settings.collapse_code_block);
}

let registration: Registration | undefined;

export function activateTauriTavernChatSurface(): void {
  if (!usesManagedChatSurface) {
    return;
  }
  if (registration) {
    throw new Error('JS-Slash-Runner managed ChatSurface participant is already registered');
  }
  settings();
  const api = getChatSurfaceApi();
  if (api?.protocolVersion !== 1 || typeof api.registerParticipant !== 'function') {
    throw new Error('TauriTavern ChatSurface participant v1 API is unavailable');
  }

  registration = api.registerParticipant({
    id: 'js-slash-runner/message-runtime',
    protocolVersion: 1,
    prepareContent,
    claimRuntimes,
    didCommitContent,
  });
}

export async function refreshManagedChatSurface(): Promise<void> {
  if (!usesManagedChatSurface) {
    return;
  }
  try {
    await redisplayChat({ startIndex: 0, fade: false });
  } catch (error) {
    registration?.fault(error);
    throw error;
  }
}
