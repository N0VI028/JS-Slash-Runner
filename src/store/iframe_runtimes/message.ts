import { useGlobalSettingsStore } from '@/store/settings';
import { isFrontend } from '@/util/is_frontend';
import { toMessageDepth } from '@/util/message';
import { reloadAndRenderChatWithoutEvents } from '@/util/tavern';
import { event_types, eventSource } from '@sillytavern/script';

function renderCodeBlockForMessage($mes: JQuery<HTMLElement>): MessageIframeRuntime {
  return _($mes.toArray())
    .map(div => {
      const message_id = Number($(div).attr('mesid'));
      const $element = $(div)
        .find('pre')
        .filter((_index, pre) => isFrontend($(pre).text()))
        .map((_index, pre) => {
          const $pre = $(pre);
          const $possible_div = $pre.parent('div.TH-render');
          if ($possible_div.length > 0) {
            return $possible_div[0];
          }
          $pre.wrap('<div class="TH-render">');
          return $pre.parent('div.TH-render')[0];
        });
      return [message_id, $element.toArray()] as const;
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

export const useMessageIframeRuntimesStore = defineStore('message_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();

  const runtimes = shallowRef<MessageIframeRuntime>({});
  watch(
    () => [global_settings.settings.render.enabled, global_settings.settings.render.depth] as const,
    ([new_enabled, new_depth], old_value) => {
      if (new_enabled) {
        runtimes.value = parseAll(new_depth);
        return;
      }
      if (!new_enabled && old_value !== undefined && old_value[0]) {
        runtimes.value = {};
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
      if (global_settings.settings.render.enabled) {
        runtimes.value = parseAll(global_settings.settings.render.depth);
      }
    });
  });

  const reloadAll = () => {
    reloadAndRenderChatWithoutEvents();
  };

  return { runtimes, reloadAll };
});
