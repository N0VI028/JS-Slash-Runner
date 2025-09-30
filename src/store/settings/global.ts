import { GlobalSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { event_types, eventSource, saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';

export const useGlobalSettingsStore = defineStore('global_settings', () => {
  const app_ready = ref<boolean>(false);
  [event_types.APP_READY, 'chatLoaded', event_types.SETTINGS_UPDATED].forEach(event =>
    eventSource.once(event, () => {
      app_ready.value = true;
    }),
  );

  const settings = ref(validateInplace(GlobalSettings, _.get(extension_settings, setting_field)));
  watch(
    settings,
    new_settings => {
      _.set(extension_settings, setting_field, toRaw(new_settings));
      saveSettingsDebounced();
    },
    { deep: true },
  );

  return { app_ready, settings };
});
