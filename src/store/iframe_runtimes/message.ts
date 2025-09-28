import { useGlobalSettingsStore } from '@/store/settings';
import { toMessageDepth } from '@/util/message';
import { event_types, eventSource } from '@sillytavern/script';
import { uuidv4 } from '@sillytavern/scripts/utils';

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

export const useMessageIframeRuntimesStore = defineStore('message_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();

  const runtimes = shallowRef<MessageIframeRuntime>({});
  watch(
    () => global_settings.settings.render.enabled,
    (value, old_value) => {
      if (value) {
        runtimes.value = parseAll(global_settings.settings.render.depth);
      } else if (!value && old_value) {
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

  const reload_memos = ref<{ [message_id: number]: string }>([]);
  watchEffect(() => {
    const reload_memo = uuidv4();
    reload_memos.value = _.mapValues(runtimes.value, () => reload_memo);
  });

  const reload = (message_id: number) => {
    reload_memos.value[message_id] = uuidv4();
  };

  const reloadAll = () => {
    const reload_memo = uuidv4();
    reload_memos.value = _.mapValues(runtimes.value, () => reload_memo);
  };

  return { runtimes: runtimes, reload_memos: readonly(reload_memos), reload, reloadAll };
});
