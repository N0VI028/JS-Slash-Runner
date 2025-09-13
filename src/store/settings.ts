import { Settings } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { defineStore } from 'pinia';
import { ref, toRaw, watch } from 'vue';

const extension_setting_name = 'tavern_helper';
export const useSettingsStore = defineStore('settings', () => {
  const settings = ref(validateInplace(Settings, _.get(extension_settings, extension_setting_name, {})));

  watch(settings, new_settings => {
    _.set(extension_settings, extension_setting_name, toRaw(new_settings));
    saveSettingsDebounced();
  });

  return { settings };
});
