import { MessageRenderCoordinator, type RenderContext } from '@/util/message_render_coordinator';
import { chat, event_types, eventSource } from '@sillytavern/script';
import { nextTick, onScopeDispose, watch, type Ref } from 'vue';

type Handler = {
  order: number;
  streaming?: boolean;
  render: (element: HTMLElement, context: RenderContext, streaming: boolean) => void | Promise<void>;
  reset?: () => void;
  audit?: () => void;
  revision?: (element: HTMLElement) => unknown;
  isAttached?: (element: HTMLElement) => boolean;
};
const handlers = new Set<Handler>();
let active = false;
let scan: () => void = () => {};
const getElement = (id: number) => document.querySelector<HTMLElement>(`#chat > .mes[mesid="${id}"]`);

/** Exclude our output, preserving the message's actual formatted source. */
export function messageSource(element: HTMLElement): string {
  const source = element.cloneNode(true) as HTMLElement;
  source
    .querySelectorAll('.TH-streaming, .TH-collapse-code-block-button, iframe[id^="TH-message--"]')
    .forEach(el => el.remove());
  source.querySelectorAll('.TH-render').forEach(el => el.replaceWith(...el.childNodes));
  source.querySelectorAll('.hidden\\!').forEach(el => {
    el.classList.remove('hidden!');
    if (!el.className) el.removeAttribute('class');
  });
  source.querySelectorAll('code').forEach(el => {
    const text = el.textContent;
    el.textContent = text;
    el.removeAttribute('data-highlighted');
    el.classList.remove('hljs');
    if (!el.className) el.removeAttribute('class');
    el.style.removeProperty('position');
    if (!el.getAttribute('style')) el.removeAttribute('style');
  });
  // Counters, timers and message action controls are not render input.
  return JSON.stringify([
    Array.from(source.querySelectorAll('.mes_text'), el => el.innerHTML),
    Array.from(source.querySelectorAll('pre'))
      .filter(el => !el.closest('.mes_text'))
      .map(el => el.textContent),
  ]);
}

const coordinator = new MessageRenderCoordinator<HTMLElement>(
  (id, element) => active && element.isConnected && getElement(id) === element,
  (id, element) =>
    JSON.stringify([
      chat[id]?.mes,
      chat[id]?.swipe_id,
      chat[id]?.is_system,
      messageSource(element),
      Array.from(handlers, handler => handler.revision?.(element)),
    ]),
  (_id, element) => Array.from(handlers).every(handler => handler.isAttached?.(element) !== false),
);

export function registerMessageRenderer(handler: Handler) {
  handlers.add(handler);
  onScopeDispose(() => {
    handlers.delete(handler);
  });
  // A conditional streaming component may register after its parent's settings watcher.
  if (active) {
    coordinator.invalidate();
    queueMicrotask(() => scan());
  }
}

export function requestMessageRender(id: number, streaming = false): Promise<void> {
  const element = getElement(id);
  if (!element) return Promise.resolve();
  return coordinator
    .request(
      id,
      element,
      async context => {
        for (const handler of Array.from(handlers).sort((a, b) => a.order - b.order)) {
          if (!context.isCurrent()) return;
          const result = handler.render(element, context, streaming);
          context.acceptChanges();
          if (result) await result;
          if (!context.isCurrent()) return;
        }
        await nextTick();
        if (!context.isCurrent()) return;
        context.acceptChanges();
      },
      streaming ? 'streaming' : 'settled',
    )
    .catch(error => {
      console.error('[Tavern Helper] Message render failed', error);
    });
}

export function refreshMessageRenders() {
  coordinator.invalidate();
  handlers.forEach(handler => handler.reset?.());
  void nextTick().then(() => scan());
}

/** Owned by the render panel, rather than a permanent module-level observer. */
export function useMessageRecovery(
  enabled: Readonly<Ref<boolean>>,
  settingsRevision: () => unknown,
  observeEnabled: Readonly<Ref<boolean>> = enabled,
) {
  const observer = new MutationObserver(records => {
    const removed = new Set<number>();
    const added = new Set<HTMLElement>();
    for (const record of records) {
      record.removedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.matches('.mes[mesid]')) removed.add(Number(node.getAttribute('mesid')));
      });
      record.addedNodes.forEach(node => {
        if (node instanceof HTMLElement && node.matches('.mes[mesid]')) added.add(node);
      });
    }
    for (const element of added) {
      const id = Number(element.getAttribute('mesid'));
      if (removed.has(id) && getElement(id) === element) void requestMessageRender(id);
    }
  });
  scan = () => {
    if (active) {
      handlers.forEach(handler => handler.audit?.());
      document.querySelectorAll<HTMLElement>('#chat > .mes[mesid]').forEach(el => {
        void requestMessageRender(Number(el.getAttribute('mesid')));
      });
    }
  };
  const messageEvents = [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_EDITED,
    event_types.MESSAGE_SWIPED,
  ];
  const onMessage = (id: number | string) => requestMessageRender(Number(id));
  const onToken = () => {
    if (Array.from(handlers).some(handler => handler.streaming)) {
      return requestMessageRender(Number(document.querySelector('#chat > .mes.last_mes')?.getAttribute('mesid')), true);
    }
    return Promise.resolve();
  };
  const onChatChanged = () => {
    coordinator.invalidate();
    handlers.forEach(handler => handler.reset?.());
    void nextTick().then(() => scan());
  };
  const onChatLoaded = () => {
    onChatChanged();
    scan();
  };
  messageEvents.forEach(event => eventSource.on(event, onMessage));
  eventSource.on(event_types.STREAM_TOKEN_RECEIVED, onToken);
  eventSource.on(event_types.CHAT_CHANGED, onChatChanged);
  eventSource.on('chatLoaded', onChatLoaded);
  eventSource.on(event_types.MORE_MESSAGES_LOADED, scan);
  eventSource.on(event_types.MESSAGE_DELETED, scan);
  watch(
    () => [enabled.value, observeEnabled.value, settingsRevision()],
    () => {
      active = enabled.value;
      observer.disconnect();
      refreshMessageRenders();
      const chatElement = document.getElementById('chat');
      if (active && observeEnabled.value && chatElement) observer.observe(chatElement, { childList: true });
    },
    { immediate: true, deep: true, flush: 'sync' },
  );
  onScopeDispose(() => {
    active = false;
    coordinator.invalidate();
    observer.disconnect();
    messageEvents.forEach(event => eventSource.removeListener(event, onMessage));
    eventSource.removeListener(event_types.STREAM_TOKEN_RECEIVED, onToken);
    eventSource.removeListener(event_types.CHAT_CHANGED, onChatChanged);
    eventSource.removeListener('chatLoaded', onChatLoaded);
    eventSource.removeListener(event_types.MORE_MESSAGES_LOADED, scan);
    eventSource.removeListener(event_types.MESSAGE_DELETED, scan);
    scan = () => {};
  });
}
