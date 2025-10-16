import { event_types, eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export function useButtonDestinationElement(): Readonly<Ref<HTMLElement | null>> {
  const force_key = ref<symbol>(Symbol());
  eventSource.on(event_types.CHAT_CHANGED, () => {
    force_key.value = Symbol();
  });

  const qr_settings = shallowRef(klona(_.get(extension_settings, 'quickReplyV2') as unknown as Record<string, any>));
  // 当设置在本地界面变更时，DOM 会立即更新，但 SETTINGS_UPDATED 事件是去抖的。
  // 为了消除可见延迟，监听 #send_form 的子树变更以即时触发重新计算目标元素。
  onMounted(() => {
    const root = document.getElementById('send_form');
    if (!root) return;
    const observer = new MutationObserver(() => {
      force_key.value = Symbol();
    });
    observer.observe(root, { childList: true, subtree: true });
    onBeforeUnmount(() => observer.disconnect());
  });
  eventSource.on(event_types.SETTINGS_UPDATED, () => {
    const new_qr_settings = _.get(extension_settings, 'quickReplyV2') as unknown as Record<string, any>;
    if (_.isEqual(qr_settings.value, new_qr_settings)) {
      return;
    }
    qr_settings.value = klona(new_qr_settings);
    force_key.value = Symbol();
  });

  const element = shallowRef<HTMLElement | null>(null);
  watch([qr_settings, force_key], ([qr_settings]) => {
    const $send_form = $('#send_form');
    const $possible_qr_bar = $send_form.children('#qr--bar');
    const $qr_bar =
      $possible_qr_bar.length > 0
        ? $possible_qr_bar
        : $('<div id="qr--bar" class="flex-container flexGap5">').appendTo($send_form);
    if (qr_settings.isCombined) {
      const $qr_buttons = $qr_bar.children('.qr--buttons');
      if ($qr_buttons.length > 0) {
        element.value = $qr_buttons[0];
        return;
      }
    }
    element.value = $qr_bar[0];
  });

  return element;
}
