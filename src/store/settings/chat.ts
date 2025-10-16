import { ChatSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { chat_metadata, eventSource, event_types, getCurrentChatId } from '@sillytavern/script';
import { saveMetadataDebounced } from '@sillytavern/scripts/extensions';

function getSettings(): ChatSettings {
  return validateInplace(ChatSettings, _.get(chat_metadata, setting_field, {}));
}

export const useChatSettingsStore = defineStore('chat_settings', () => {
  const id = ref<string | undefined>(getCurrentChatId());
  const settings = ref<ChatSettings>(getSettings());
  // 切换聊天时刷新 id 和 settings
  eventSource.on(event_types.CHAT_CHANGED, (new_chat_id: string | undefined) => {
    if (id.value !== new_chat_id) {
      id.value = new_chat_id;
      settings.value = getSettings();
    }
  });

  // 在某聊天内修改 settings 时保存
  watch(
    [id, settings],
    ([new_id, new_settings], [previous_id]) => {
      if (new_id !== previous_id) {
        return;
      }
      if (new_id !== undefined) {
        _.set(chat_metadata, setting_field, klona(new_settings));
        saveMetadataDebounced();
      }
    },
    { deep: true },
  );

  return { id: readonly(id), settings };
});
