import { useAmbientAudioStore, useBgmAudioStore } from '@/store/audio';

export function get_store_by_type(type: 'bgm' | 'ambient') {
  switch (type) {
    case 'bgm': {
      return useBgmAudioStore();
    }
    case 'ambient': {
      return useAmbientAudioStore();
    }
  }
}
