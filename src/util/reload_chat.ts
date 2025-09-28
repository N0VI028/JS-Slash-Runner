import { clearChat, event_types, eventSource, printMessages, saveChatConditional } from '@sillytavern/script';

export async function reloadChatWithoutEvents() {
  await saveChatConditional();
  await clearChat();
  await printMessages();
}

export function invokeMessageRenders() {
  $('div .mes').each((_index, element) => {
    eventSource.emit(
      $(element).attr('is_user') ? event_types.USER_MESSAGE_RENDERED : event_types.CHARACTER_MESSAGE_RENDERED,
      $(element).attr('mesid'),
    );
  });
}

export async function reloadAndRenderChatWithoutEvents() {
  await reloadChatWithoutEvents();
  invokeMessageRenders();
}
