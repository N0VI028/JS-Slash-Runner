import { refreshMessageRenders, registerMessageRenderer } from '@/panel/render/message_recovery';
import { useGlobalSettingsStore } from '@/store/settings';
import { isFrontend } from '@/util/is_frontend';
import { chat } from '@sillytavern/script';
import { uuidv4 } from '@sillytavern/scripts/utils';

type Runtime = { message_id: number; reload_memo: string; elements: HTMLElement[] };

function render$mes($mes: JQuery<HTMLElement>, reload_memo: string): Runtime[] {
  return _($mes.toArray())
    .map(div => {
      const message_id = Number($(div).attr('mesid'));
      const $element = $(div)
        .find('pre')
        .filter((_index, pre) => isFrontend($(pre).text()))
        .filter((_index, pre) => {
          if (useGlobalSettingsStore().settings.render.allow_streaming) {
            return $(pre).closest('.mes_text, .TH-streaming').length === 0;
          }
          return true;
        })
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

export function calcToRender(depth: number, ignore_hidden: boolean): number[] {
  const min_showed_message_id = Number($('#chat > .mes').first().attr('mesid'));

  // 虽然两路可以合并，但是还是拆开，这样 !ignore_hidden 时性能应好一些
  if (!ignore_hidden) {
    return _.range(
      depth === 0 ? min_showed_message_id : Math.max(min_showed_message_id, chat.length - depth),
      chat.length,
    );
  }
  return _(_.range(min_showed_message_id, chat.length))
    .filter(message_id => !chat[message_id]?.is_system)
    .takeRight(depth === 0 ? chat.length : depth)
    .value();
}

export const useMessageIframeRuntimesStore = defineStore('message_iframe_runtimes', () => {
  const global_settings = useGlobalSettingsStore();
  const runtimes = ref<Runtime[]>([]);
  const eligible = (element: HTMLElement) =>
    calcToRender(global_settings.settings.render.depth, global_settings.settings.render.depth_ignore_hidden).includes(
      Number(element.getAttribute('mesid')),
    );
  registerMessageRenderer({
    order: 30,
    revision: eligible,
    isAttached: element => {
      if (!global_settings.settings.render.enabled || !eligible(element)) return true;
      return $(element)
        .find('pre')
        .toArray()
        .filter(
          pre =>
            isFrontend($(pre).text()) &&
            (!global_settings.settings.render.allow_streaming || !$(pre).closest('.mes_text, .TH-streaming').length),
        )
        .every(pre => pre.parentElement?.querySelector('iframe[id^="TH-message--"]'));
    },
    audit: () => {
      const ids = calcToRender(
        global_settings.settings.render.depth,
        global_settings.settings.render.depth_ignore_hidden,
      );
      runtimes.value = runtimes.value.filter(
        runtime => ids.includes(runtime.message_id) && runtime.elements.every(el => el.isConnected),
      );
    },
    reset: () => {
      runtimes.value = [];
    },
    render: (element, context) => {
      if (!context.isCurrent()) return;
      if (!global_settings.settings.render.enabled) {
        runtimes.value = [];
        return;
      }
      const id = Number(element.getAttribute('mesid'));
      const to_render = calcToRender(
        global_settings.settings.render.depth,
        global_settings.settings.render.depth_ignore_hidden,
      );
      runtimes.value = runtimes.value.filter(
        runtime =>
          runtime.message_id !== id &&
          to_render.includes(runtime.message_id) &&
          runtime.elements.every(el => el.isConnected),
      );
      if (eligible(element)) runtimes.value.push(...render$mes($(element), uuidv4()));
    },
  });
  return { runtimes, reloadAll: refreshMessageRenders };
});
