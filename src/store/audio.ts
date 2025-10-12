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

    const chat_settings = useChatSettingsStore();
    const playlist = ref<{ url: string; title: string }[]>(chat_settings.settings.playlist);
    watch(
      () => chat_settings.id,
      () => {
        src.value = '';
        playing.value = false;
        progress.value = 0;
        playlist.value = [];
      },
    );
    watch(playlist, () => {
      chat_settings.settings.playlist = playlist.value;
    });

    return { src, playing, progress, enabled, mode, muted, volume, playlist };
  });
}

export const useBgmAudioStore = createAudioStore('bgm');
export const useAmbientAudioStore = createAudioStore('ambient');
