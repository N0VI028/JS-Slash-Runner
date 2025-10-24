import { ChatSettings, setting_field } from '@/type/settings';
import { chat_metadata, eventSource, event_types, getCurrentChatId } from '@sillytavern/script';
import { saveMetadataDebounced } from '@sillytavern/scripts/extensions';

function getSettings(): ChatSettings {
  const settings = _.get(chat_metadata, setting_field, {});
  const parsed = ChatSettings.safeParse(settings);
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取聊天数据失败, 将使用空数据`);
    return ChatSettings.parse({});
  }
  return ChatSettings.parse(parsed.data);
}

export const useChatSettingsStore = defineStore('chat_settings', () => {
  const id = ref<string | undefined>(getCurrentChatId());
  // 切换聊天时刷新 id 和 settings
  eventSource.makeFirst(event_types.CHAT_CHANGED, (new_chat_id: string | undefined) => {
    if (id.value !== new_chat_id) {
      id.value = new_chat_id;
    }
  });

  const settings = ref<ChatSettings>(getSettings());

  // 切换聊天时刷新 settings, 但不触发 settings 保存
  watch(id, () => {
    ignoreUpdates(() => {
      settings.value = getSettings();
    });
  });

  // 在某聊天内修改 settings 时保存
  const { ignoreUpdates } = watchIgnorable(
    settings,
    new_settings => {
      if (id.value !== undefined) {
        _.set(chat_metadata, setting_field, klona(new_settings));
        saveMetadataDebounced();
      }
    },
    { deep: true },
  );

  return { id: readonly(id), settings };
});
