import { ExtensionSettings, setting_field } from '@/type/settings';
import { validateInplace } from '@/util/zod';
import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings } from '@sillytavern/scripts/extensions';
import { defineStore } from 'pinia';
import { ref, toRaw, watch } from 'vue';

export const useExtensionStore = defineStore('extension', () => {
  const settings = ref(validateInplace(ExtensionSettings, _.get(extension_settings, setting_field)));
  watch(
    settings,
    new_settings => {
      _.set(extension_settings, setting_field, toRaw(new_settings));
      saveSettingsDebounced();
    },
    { deep: true },
  );

  return { settings };
});
