import { useChatSettingsStore, useGlobalSettingsStore } from '@/store/settings';

function createAudioStore(type: 'bgm' | 'ambient') {
  return defineStore(`${type}_audio`, () => {
    const global_settings = useGlobalSettingsStore();

    const src = ref('');
    const playing = ref(false);
    const progress = ref(0);
    const settings = computed({
      get: () => global_settings.settings.audio[type],
      set: value => {
        global_settings.settings.audio[type] = value;
      },
    });
    const { enabled, mode, muted, volume } = toRefs(settings.value);

    watchDebounced(
      volume,
      new_volume => {
        if (new_volume > 0 && muted.value) {
          muted.value = false;
        } else if (new_volume === 0 && !muted.value) {
          muted.value = true;
        }
      },
      { debounce: 100 },
    );

    const chat_settings = useChatSettingsStore();
    const playlist = ref<{ title: string; url: string }[]>(chat_settings.settings[type]);
    watch(
      () => chat_settings.id,
      () => {
        src.value = '';
        playing.value = false;
        progress.value = 0;
        playlist.value = chat_settings.settings[type];
      },
    );
    watch(playlist, () => {
      chat_settings.settings[type] = playlist.value;
    });

    return { src, playing, progress, enabled, mode, muted, volume, playlist };
  });
}

export const useBgmAudioStore = createAudioStore('bgm');
export const useAmbientAudioStore = createAudioStore('ambient');
