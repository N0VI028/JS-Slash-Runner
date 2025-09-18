import { clearChat, eventSource, event_types, printMessages, saveChatConditional } from '@sillytavern/script';

export async function reloadChatWithoutEvents() {
  await saveChatConditional();
  await clearChat();
  await printMessages();
}

export function rerenderMessageIframes() {
  $('div .mes').each((_index, element) => {
    eventSource.emit(
      $(element).attr('is_user') ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
      $(element).attr('mesid'),
    );
  });
}

export async function reloadChatWithoutEventsButRender() {
  await reloadChatWithoutEvents();
  rerenderMessageIframes();
}
