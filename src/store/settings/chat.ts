import { eventSource, event_types, getCurrentChatId } from '@sillytavern/script';

export const useChatSettingsStore = defineStore('chat_settings', () => {
  const id = ref<string | undefined>(getCurrentChatId());
  eventSource.on(event_types.CHAT_CHANGED, (new_chat_id: string | undefined) => {
    if (id.value !== new_chat_id) {
      id.value = new_chat_id;
    }
  });

  return { id: readonly(id) };
});
