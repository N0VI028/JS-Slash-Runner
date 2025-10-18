import { ChatSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { chat_metadata, eventSource, event_types, getCurrentChatId } from '@sillytavern/script';
import { saveMetadataDebounced } from '@sillytavern/scripts/extensions';

function getSettings(): ChatSettings {
  return validateInplace(ChatSettings, _.get(chat_metadata, setting_field, {}));
}

export const useChatSettingsStore = defineStore('chat_settings', () => {
  const id = ref<string | undefined>(getCurrentChatId());
  // 切换聊天时刷新 id 和 settings
  eventSource.on(event_types.CHAT_CHANGED, (new_chat_id: string | undefined) => {
    if (id.value !== new_chat_id) {
      id.value = new_chat_id;
    }
  });

  const settings = ref<ChatSettings>(getSettings());

  watch(
    [id, settings],
    ([new_id, new_settings], [old_id, old_settings]) => {
      // 切换聊天时刷新 settings
      if (new_id !== old_id) {
        settings.value = getSettings();
        return;
      }
      // 在某聊天内修改 settings 时保存
      if (new_id !== undefined && !_.isEqual(new_settings, old_settings)) {
        _.set(chat_metadata, setting_field, klona(new_settings));
        saveMetadataDebounced();
      }
    },
    { deep: true },
  );

  return { id: readonly(id), settings };
});
