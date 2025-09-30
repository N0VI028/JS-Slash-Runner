import {
  characters,
  clearChat,
  event_types,
  eventSource,
  printMessages,
  saveChatConditional,
  this_chid,
} from '@sillytavern/script';

export async function reloadChatWithoutEvents() {
  if (characters.at(this_chid as unknown as number)) {
    await saveChatConditional();
    await clearChat();
    await printMessages();
  }
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
