import { event_types, eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export function useButtonDestinationElement(): Readonly<Ref<HTMLElement | null>> {
  const force_key = ref<symbol>(Symbol());
  eventSource.on(event_types.CHAT_CHANGED, () => {
    force_key.value = Symbol();
  });

  const qr_settings = shallowRef(klona(_.get(extension_settings, 'quickReplyV2') as unknown as Record<string, any>));
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
        : $('<div id="qr--bar" class="flex-container flexGap5">').prependTo($send_form);
    if (qr_settings.isCombined) {
      const $possible_qr_buttons = $qr_bar.children('.qr--buttons');
      const $qr_buttons =
        $possible_qr_buttons.length > 0 ? $possible_qr_buttons : $('<div class="qr--buttons">').appendTo($qr_bar);
      element.value = $qr_buttons[0];
      return;
    }
    element.value = $qr_bar[0];
  });

  return element;
}
