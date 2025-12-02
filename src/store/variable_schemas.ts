import { useCharacterSettingsStore, usePresetSettingsStore } from '@/store/settings';

export const useVariableSchemasStore = defineStore('variable_schemas', () => {
  const global = ref<z.ZodType<any>>();

  const preset = ref<z.ZodType<any>>();
  const preset_settings = usePresetSettingsStore();
  watch(
    () => preset_settings.name,
    () => {
      preset.value = undefined;
    },
  );

  const character = ref<z.ZodType<any>>();
  const chat = ref<z.ZodType<any>>();
  const message = ref<z.ZodType<any>>();
  const character_settings = useCharacterSettingsStore();
  watch(
    () => character_settings.name,
    () => {
      character.value = undefined;
      chat.value = undefined;
      message.value = undefined;
    },
  );

  return { global, preset, character, chat, message };
});
