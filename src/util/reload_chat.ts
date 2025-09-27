import { clearChat, printMessages, saveChatConditional } from '@sillytavern/script';

export async function reloadChatWithoutEvents() {
  await saveChatConditional();
  await clearChat();
  await printMessages();
}
