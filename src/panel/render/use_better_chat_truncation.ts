import { addOneMessage, chat, event_types, eventSource, scrollChatToBottom } from '@sillytavern/script';
import { power_user } from '@sillytavern/scripts/power-user';

export async function auditChatMessages() {
  if (power_user.chat_truncation > 0) {
    const mesid = $('#chat > .mes').first().attr('mesid');

    const last_showed = mesid ? Number(mesid) : undefined;
    if (last_showed === undefined || chat.length - power_user.chat_truncation < last_showed) {
      const should_show = _.range(Math.max(0, chat.length - power_user.chat_truncation), last_showed ?? chat.length);
      for (const message_id of should_show) {
        const message = chat[message_id];
        addOneMessage(message, { insertBefore: last_showed, forceId: message_id, scroll: false });
        await eventSource.emit(
          message.is_user ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
          message_id,
        );
      }
      scrollChatToBottom({ waitForFrame: true });
    }
  }
}

export function useBetterChatTruncation(enabled: Readonly<Ref<boolean>>) {
  $('#chat_truncation, #chat_truncation_counter').attr('step', 1);
  [event_types.CHARACTER_MESSAGE_RENDERED, event_types.USER_MESSAGE_RENDERED].forEach(event =>
    eventSource.on(event, (message_id: number) => {
      if (message_id >= chat.length - 1 && enabled.value && power_user.chat_truncation > 0) {
        const $mes = $('#chat > .mes');
        $mes.slice(0, Math.max(0, $mes.length - power_user.chat_truncation)).remove();

        const first_mesid = Number($mes.first().attr('mesid'));
        const $show_more_messages = $('#show_more_messages');
        if (first_mesid > 0 && $show_more_messages.length === 0) {
          $('#chat').append('<div id="show_more_messages">Show more messages</div>');
        } else if (first_mesid === 0 && $show_more_messages.length > 0) {
          $show_more_messages.remove();
        }
      }
    }),
  );
  eventSource.on(event_types.MESSAGE_DELETED, async () => {
    if (enabled.value) {
      await auditChatMessages();
    }
  });
}
