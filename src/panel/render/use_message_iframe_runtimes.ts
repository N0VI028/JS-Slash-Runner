import { chat, event_types, eventSource } from '@sillytavern/script';
import _ from 'lodash';

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

function parseMessageId(message_id: number): MessageIframeRuntime {
  return renderCodeBlockForMessage($(`.mes[mesid=${message_id}]`));
}

function parseAll(depth: number): MessageIframeRuntime {
  let $mes = $('.mes');
  if (depth !== 0) {
    $mes = $mes.filter((_index, div) => chat.length - Number($(div).attr('mesid')) <= depth);
  }
  return renderCodeBlockForMessage($mes);
}

interface MessageIframeRuntime {
  [message_id: number]: HTMLElement[];
}

export function useMessageIframeRuntimes(
  enabled: Readonly<Ref<boolean>>,
  depth: Readonly<Ref<number>>,
): Ref<MessageIframeRuntime> {
  const iframe_runtimes = ref<MessageIframeRuntime>({});
  watch(
    enabled,
    (value, old_value) => {
      if (value) {
        iframe_runtimes.value = parseAll(depth.value);
      } else if (!value && old_value) {
        iframe_runtimes.value = {};
      }
    },
    { immediate: true },
  );

  eventSource.on('chatLoaded', () => {
    iframe_runtimes.value = parseAll(depth.value);
  });
  [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ].forEach(event => {
    eventSource.on(event, (message_id: string | number) => {
      if (enabled.value) {
        _.unset(iframe_runtimes.value, Number(message_id));
        _.assign(iframe_runtimes.value, parseMessageId(Number(message_id)));
      }
    });
  });
  eventSource.on(event_types.MESSAGE_DELETED, (message_id: string | number) => {
    if (enabled.value) {
      _.unset(iframe_runtimes.value, Number(message_id));
    }
  });

  return iframe_runtimes;
}
