import { toMessageDepth } from '@/util/message';
import { event_types, eventSource } from '@sillytavern/script';

function renderCodeBlockForMessage($mes: JQuery<HTMLElement>): MessageIframeRuntime {
  return _($mes.toArray())
    .map(div => {
      const message_id = Number($(div).attr('mesid'));
      return [
        message_id,
        $(div)
          .find('pre')
          .filter((_index, pre) => $(pre).text().includes('<body'))
          .toArray(),
      ] as const;
    })
    .filter(([_message_id, elements]) => elements.length > 0)
    .fromPairs()
    .value();
}

function parseAll(depth: number): MessageIframeRuntime {
  let $mes = $('.mes');
  if (depth !== 0) {
    $mes = $mes.filter((_index, div) => toMessageDepth(Number($(div).attr('mesid'))) <= depth);
  }
  return renderCodeBlockForMessage($mes);
}

interface MessageIframeRuntime {
  [message_id: number]: HTMLElement[];
}

export function useMessageIframeRuntimes(
  enabled: Readonly<Ref<boolean>>,
  depth: Readonly<Ref<number>>,
): ShallowRef<MessageIframeRuntime> {
  const iframe_runtimes = shallowRef<MessageIframeRuntime>({});
  watch(
    enabled, // depth 很少调整, 无须绑定
    (value, old_value) => {
      if (value) {
        iframe_runtimes.value = parseAll(depth.value);
      } else if (!value && old_value) {
        iframe_runtimes.value = {};
      }
    },
    { immediate: true },
  );

  [
    'chatLoaded',
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
    event_types.MESSAGE_DELETED,
  ].forEach(event => {
    eventSource.on(event, () => {
      if (enabled.value) {
        iframe_runtimes.value = parseAll(depth.value);
      }
    });
  });
  return iframe_runtimes;
}
