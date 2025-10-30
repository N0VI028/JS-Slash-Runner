import { GlobalSettings as BackwardGlobalSettings } from '@/type/backward';
import { GlobalSettings, setting_field } from '@/type/settings';
import { APP_READY_EVENTS } from '@/util/tavern';
import { eventSource, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

function getSettings() {
  const backward_settings = _.get(extension_settings, 'TavernHelper');
  // TODO: 等 4.0 稳定后去掉 `&& !_.has(extension_settings, setting_field)`
  if (backward_settings !== undefined && !_.has(extension_settings, setting_field)) {
    const parsed = BackwardGlobalSettings.safeParse(backward_settings);
    if (parsed.success) {
      _.set(extension_settings, setting_field, parsed.data);
      // TODO: 等 4.0 稳定后移除旧配置
      // _.unset(extension_settings, 'TavernHelper');
      saveSettingsDebounced();
    } else {
      toastr.warning(parsed.error.message, t`[酒馆助手]迁移旧数据失败, 将使用空数据`);
    }
  }

  const settings = _.get(extension_settings, setting_field, {});
  const parsed = GlobalSettings.safeParse(settings);
  if (!parsed.success) {
    toastr.warning(parsed.error.message, t`[酒馆助手]读取全局数据失败, 将使用空数据`);
    return GlobalSettings.parse({});
  }
  return GlobalSettings.parse(parsed.data);
}

export const useGlobalSettingsStore = defineStore('global_settings', () => {
  const app_ready = ref<boolean>(false);
  APP_READY_EVENTS.forEach(event =>
    eventSource.once(event, () => {
      app_ready.value = true;
    }),
  );

  const settings = ref<GlobalSettings>(getSettings());
  watch(
    settings,
    new_settings => {
      _.set(extension_settings, setting_field, klona(new_settings));
      saveSettingsDebounced();
    },
    { deep: true },
  );

  return { app_ready, settings };
});
