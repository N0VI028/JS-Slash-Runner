import { APP_READY_EVENTS } from '@/util/tavern';
import { eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export function useButtonDestinationElement(): Readonly<Ref<HTMLElement | null>> {
  const element = shallowRef<HTMLElement | null>(null);
  const force_key = ref<symbol>(Symbol());

  const $send_form = $('#send_form');

  APP_READY_EVENTS.forEach(event =>
    eventSource.once(event, () => {
      force_key.value = Symbol();
    }),
  );
  watch(
    force_key,
    () => {
      const $possible_qr_bar = $send_form.find('#qr--bar');
      const $qr_bar =
        $possible_qr_bar.length > 0
          ? $possible_qr_bar
          : $('<div id="qr--bar" class="flex-container flexGap5">').prependTo($send_form);
      if (_.get(extension_settings, 'quickReplyV2.isCombined')) {
        const $possible_qr_buttons = $qr_bar.children('.qr--buttons');
        const $qr_buttons =
          $possible_qr_buttons.length > 0 ? $possible_qr_buttons : $('<div class="qr--buttons">').appendTo($qr_bar);
        element.value = $qr_buttons[0];
        return;
      }
      element.value = $qr_bar[0];
    },
    { immediate: true },
  );

  $(document)
    .off('change.qrCombined', '#qr--isCombined')
    .on('change.qrCombined', '#qr--isCombined', () => {
      force_key.value = Symbol();
    });

  new MutationObserver(mutations => {
    const should_update = mutations.some(mutation => {
      if (mutation.type !== 'childList') {
        return false;
      }

      return (
        (mutation.target.nodeType === Node.ELEMENT_NODE && (mutation.target as Element).id === 'qr--bar') ||
        mutation.addedNodes
          .values()
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .some(node => {
            const element = node as Element;
            return (
              (element.id === 'qr--bar' && element.children.length > 0) ||
              element.classList?.contains('qr--button') ||
              element.classList?.contains('qr--buttons')
            );
          }) ||
        mutation.removedNodes
          .values()
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .some(node => {
            const element = node as Element;
            return element.id === 'qr--bar' || element.classList?.contains('qr--buttons');
          })
      );
    });
    if (should_update) {
      force_key.value = Symbol();
    }
  }).observe($send_form[0], { childList: true, subtree: true });

  return element;
}
