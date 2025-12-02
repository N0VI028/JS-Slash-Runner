import { event_types, eventSource } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';

export function useBetterChatTruncation(enabled: Readonly<Ref<boolean>>) {
  $('#chat_truncation, #chat_truncation_counter').attr('step', 1);
  [event_types.CHARACTER_MESSAGE_RENDERED, event_types.USER_MESSAGE_RENDERED].forEach(event =>
    eventSource.on(event, () => {
      if (enabled.value && power_user.chat_truncation > 0) {
        const $mes = $('#chat > .mes');
        if ($mes.length > power_user.chat_truncation && $('#show_more_messages').length === 0) {
          $('#chat').append('<div id="show_more_messages">Show more messages</div>');
        }
        $mes.slice(0, Math.max(0, $mes.length - power_user.chat_truncation)).remove();
      }
    }),
  );
  eventSource.on(event_types.MESSAGE_DELETED, () => {
    if (enabled.value && Number($('#chat > .mes').first().attr('mesid')) > 0 && $('#show_more_messages').length === 0) {
      $('#chat').append('<div id="show_more_messages">Show more messages</div>');
    }
  });
}
