import { useGlobalSettingsStore } from '@/store/settings';

function createAudioStore(type: 'bgm' | 'ambient') {
  return defineStore(`${type}_audio`, () => {
    const store = useGlobalSettingsStore();

    const playing = ref(false);

    const settings = computed({
      get: () => store.settings.audio[type],
      set: value => {
        store.settings.audio[type] = value;
      },
    });
    const { mode, muted, volume } = toRefs(settings.value);

    const src = ref('');
    const playlist = ref([] as string[]);

    return { playing, mode, muted, volume, src, playlist };
  });
}

export const useBgmAudioStore = createAudioStore('bgm');
export const useAmbientAudioStore = createAudioStore('ambient');
