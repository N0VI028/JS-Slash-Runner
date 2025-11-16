import { useGlobalSettingsStore } from '@/store/settings';
import { isFrontend } from '@/util/is_frontend';
import { chat, event_types, eventSource } from '@sillytavern/script';
import { uuidv4 } from '@sillytavern/scripts/utils';

type Runtime = { message_id: number; reload_memo: string; elements: HTMLElement[] };

function render$mes($mes: JQuery<HTMLElement>, reload_memo: string): Runtime[] {
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
      return { message_id, reload_memo, elements: $element.toArray() };
    })
    .filter(({ elements }) => elements.length > 0)
    .value();
}

function renderMessages(ids: number[], reload_memo: string): Runtime[] {
  const $mes = $('#chat > .mes').filter((_index, div) => _.includes(ids, Number($(div).attr('mesid'))));
  return render$mes($mes, reload_memo);
}

function calcToRender(depth: number): number[] {
  const min_showed_message_id = Number($('#chat > .mes').first().attr('mesid'));
  return _.range(
    depth === 0 ? min_showed_message_id : Math.max(min_showed_message_id, chat.length - depth),
    chat.length,
  );
}

function auditRuntimes(runtimes: Runtime[], depth: number): Runtime[] {
  const rendered = _.map(runtimes, runtime => runtime.message_id);
  const to_render = calcToRender(depth);
  return _.concat(
    _.filter(runtimes, runtime => _.includes(to_render, runtime.message_id)),
    renderMessages(_.difference(to_render, rendered), uuidv4()),
  );
}

export const useMessageIframeRuntimesStore = defineStore('message_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();

  const runtimes = ref<Runtime[]>([]);
  watch(
    () => [global_settings.settings.render.enabled, global_settings.settings.render.depth] as const,
    ([new_enabled, new_depth]) => {
      if (new_enabled) {
        runtimes.value = auditRuntimes(runtimes.value, new_depth);
      } else {
        runtimes.value = [];
      }
    },
    { immediate: true },
  );

  eventSource.on('chatLoaded', () => {
    if (global_settings.settings.render.enabled) {
      runtimes.value = renderMessages(calcToRender(global_settings.settings.render.depth), uuidv4());
    }
  });

  [
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
  ].forEach(event => {
    eventSource.on(event, (message_id: number | string) => {
      if (global_settings.settings.render.enabled) {
        const numbered_message_id = Number(message_id);
        runtimes.value = auditRuntimes(
          _.reject(runtimes.value, runtime => runtime.message_id === numbered_message_id),
          global_settings.settings.render.depth,
        );
      }
    });
  });

  eventSource.on(event_types.MESSAGE_DELETED, () => {
    if (global_settings.settings.render.enabled) {
      runtimes.value = auditRuntimes(runtimes.value, global_settings.settings.render.depth);
    }
  });

  const reloadAll = () => {
    const reload_memo = uuidv4();
    runtimes.value = runtimes.value.map(runtime => ({ ...runtime, reload_memo }));
  };

  return { runtimes, reloadAll };
});
