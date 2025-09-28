import { clearChat, event_types, eventSource, printMessages, saveChatConditional } from '@sillytavern/script';

export async function reloadChatWithoutEvents() {
  await saveChatConditional();
  await clearChat();
  await printMessages();
}

// TODO: 考虑到 @/panel/render/use_message_iframe_runtimes 中每次 MESSAGE_RENDERED 事件都会刷新整个 runtimes, 这样可能会在后台有额外开销?
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
