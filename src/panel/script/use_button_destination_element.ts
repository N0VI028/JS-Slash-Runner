import { APP_READY_EVENTS } from '@/util/tavern';
import { eventSource } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

function recalculateElement($send_form: JQuery<HTMLElement>): HTMLElement {
  // $('#qr--bar') 要求 id 唯一, 因此此处不使用
  let $possible_qr_bar = $send_form.find('div').filter(function () {
    return $(this).attr('id') === 'qr--bar';
  });
  if ($possible_qr_bar.length > 1) {
    $possible_qr_bar.filter('.TH--qr--bar').remove();
    $possible_qr_bar = $send_form.find('div').filter(function () {
      return $(this).attr('id') === 'qr--bar';
    });
  }
  const $qr_bar =
    $possible_qr_bar.length > 0
      ? $possible_qr_bar.first()
      : $('<div id="qr--bar" class="TH--qr--bar flex-container flexGap5">').prependTo($send_form);
  if (_.get(extension_settings, 'quickReplyV2.isCombined')) {
    const $possible_qr_buttons = $qr_bar.children('.qr--buttons');
    const $qr_buttons =
      $possible_qr_buttons.length > 0 ? $possible_qr_buttons.first() : $('<div class="qr--buttons">').appendTo($qr_bar);
    return $qr_buttons[0];
  }
  return $qr_bar[0];
}

export function useButtonDestinationElement(): Readonly<Ref<HTMLElement | null>> {
  const element = shallowRef<HTMLElement | null>(null);
  const force_key = ref<symbol>(Symbol());
  const $send_form = $('#send_form');

  watch(force_key, () => {
    element.value = recalculateElement($send_form);
  });

  APP_READY_EVENTS.forEach(event =>
    eventSource.once(event, () => {
      force_key.value = Symbol();
    }),
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
        [...mutation.addedNodes.values()]
          .filter(node => node.nodeType === Node.ELEMENT_NODE)
          .some(node => {
            const element = node as Element;
            return (
              (element.id === 'qr--bar' && element.children.length > 0) ||
              element.classList?.contains('qr--button') ||
              element.classList?.contains('qr--buttons')
            );
          }) ||
        [...mutation.removedNodes.values()]
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
