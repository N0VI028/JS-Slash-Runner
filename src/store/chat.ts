import { eventSource, event_types, getCurrentChatId } from '@sillytavern/script';
import { defineStore } from 'pinia';
import { readonly, ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const id = ref<string | undefined>(getCurrentChatId());
  eventSource.on(event_types.CHAT_CHANGED, (new_chat_id: string | undefined) => {
    if (id.value != new_chat_id) {
      id.value = new_chat_id;
    }
  });

  // eslint-disable-next-line pinia/require-setup-store-properties-export
  return { id: readonly(id) };
});
