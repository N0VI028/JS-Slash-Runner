import { GlobalSettings as BackwardGlobalSettings } from '@/type/backward';
import { GlobalSettings, setting_field } from '@/type/settings';
import { APP_READY_EVENTS } from '@/util/tavern';
import { validateInplace } from '@/util/zod';
import { eventSource, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

function getSettings() {
  const backward_settings = _.get(extension_settings, 'TavernHelper');
  // TODO: 正式发布时要去掉 `&& !_.has(extension_settings, setting_field)`
  if (backward_settings !== undefined && !_.has(extension_settings, setting_field)) {
    _.set(extension_settings, setting_field, BackwardGlobalSettings.parse(backward_settings));
    // TODO: 正式发布时要移除旧配置
    // _.unset(extension_settings, 'TavernHelper');
    saveSettingsDebounced();
  }
  return validateInplace(GlobalSettings, _.get(extension_settings, setting_field));
}

export const useGlobalSettingsStore = defineStore('global_settings', () => {
  const app_ready = ref<boolean>(false);
  APP_READY_EVENTS.forEach(event =>
    eventSource.once(event, () => {
      app_ready.value = true;
    }),
  );

  const settings = ref(getSettings());
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
