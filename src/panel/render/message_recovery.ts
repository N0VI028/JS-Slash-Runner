import { eventSource } from '@sillytavern/script';

export const REQUEST_RENDER_MESSAGE_EVENT = 'TH_REQUEST_RENDER_MESSAGE';

/**
 * 取消空 swipe 生成等情况下, 酒馆可能直接替换楼层 DOM 而不发送任何渲染事件, 导致前端界面等变回代码块.
 * 因此监听 `#chat` 直接子节点的替换: 同一 mesid 的楼层被移除又被添加时, 发送 `TH_REQUEST_RENDER_MESSAGE` 请求重新渲染该楼层.
 */
export function useMessageRecovery(enabled: Readonly<Ref<boolean>>) {
  const chat_element = document.getElementById('chat');
  if (!chat_element) {
    return;
  }

  const getMessageId = (node: Node): number | undefined => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      return undefined;
    }
    const element = node as HTMLElement;
    if (!element.classList.contains('mes')) {
      return undefined;
    }
    const mesid = element.getAttribute('mesid');
    return mesid === null ? undefined : Number(mesid);
  };

  const observer = new MutationObserver(records => {
    const collect = (key: 'removedNodes' | 'addedNodes') =>
      records.flatMap(record => Array.from(record[key], getMessageId)).filter(id => id !== undefined);
    _.intersection(collect('removedNodes'), collect('addedNodes')).forEach(message_id => {
      void eventSource.emit(REQUEST_RENDER_MESSAGE_EVENT, message_id);
    });
  });

  watch(
    enabled,
    value => {
      observer.disconnect();
      if (value) {
        observer.observe(chat_element, { childList: true });
      }
    },
    { immediate: true },
  );

  onScopeDispose(() => observer.disconnect());
}
