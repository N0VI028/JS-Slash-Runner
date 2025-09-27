import Iframe from '@/panel/render/Iframe.vue';
import { reloadChatWithoutEvents } from '@/util/reload_chat';
import { chat, event_types, eventSource } from '@sillytavern/script';

async function renderCodeBlock($pre: JQuery<HTMLPreElement>, id: string, with_loading: boolean, use_blob_url: boolean) {
  createApp(Iframe, { id, content: $pre.text(), withLoading: with_loading, useBlobUrl: use_blob_url }).mount($pre[0]);
}

async function renderCodeBlockForMessage($mes: JQuery<HTMLElement>, with_loading: boolean, use_blob_url: boolean) {
  await Promise.all(
    $mes.toArray().flatMap(div => {
      const message_id = Number($(div).attr('mesid'));
      return $(div)
        .find('pre')
        .filter((_index, pre) => $(pre).text().includes('<body'))
        .map((index, pre) => {
          return renderCodeBlock($(pre), `message-iframe-${message_id}-${index}`, with_loading, use_blob_url);
        });
    }),
  );
}

async function renderCodeBlockForMessageId(message_id: number, with_loading: boolean, use_blob_url: boolean) {
  await renderCodeBlockForMessage($(`.mes[mesid=${message_id}]`), with_loading, use_blob_url);
}

async function renderCodeBlockForAll(with_loading: boolean, use_blob_url: boolean, depth: number) {
  let $mes = $('.mes');
  if (depth !== 0) {
    $mes = $mes.filter((_index, div) => chat.length - Number($(div).attr('mesid')) <= depth);
  }
  await renderCodeBlockForMessage($mes, with_loading, use_blob_url);
}

function derenderCodeBlockForAll() {
  reloadChatWithoutEvents();
}

export function useRenderIframe(
  enabled: Readonly<Ref<boolean>>,
  with_loading: Readonly<Ref<boolean>>,
  use_blob_url: Readonly<Ref<boolean>>,
  depth: Readonly<Ref<number>>,
) {
  watch(
    enabled,
    async (value, old_value) => {
      if (value) {
        await renderCodeBlockForAll(with_loading.value, use_blob_url.value, depth.value);
        return;
      }
      if (!value && old_value) {
        derenderCodeBlockForAll();
      }
    },
    { immediate: true },
  );

  const render_message_id_events = [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ];
  render_message_id_events.forEach(event => {
    eventSource.on(event, async (message_id: string | number) => {
      if (enabled.value) {
        await renderCodeBlockForMessageId(Number(message_id), with_loading.value, use_blob_url.value);
      }
    });
  });
  eventSource.on(event_types.MESSAGE_DELETED, async () => {
    if (enabled.value) {
      await renderCodeBlockForAll(with_loading.value, use_blob_url.value, depth.value);
    }
  });
}
