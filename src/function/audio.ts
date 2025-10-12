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

export function handle_url_to_title(url: string) {
  return url.split('/').at(-1)?.split('.').at(0) || url;
}
