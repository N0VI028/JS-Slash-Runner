import { useAmbientAudioStore, useBgmAudioStore } from '@/store/audio';
import { AudioMode } from '@/type/settings';

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

type Audio = {
  title: string;
  url: string;
};

type AudioWithOptionalTitle = {
  title?: string;
  url: string;
};

export function playAudio(type: 'bgm' | 'ambient', audio: AudioWithOptionalTitle): void {
  const store = get_store_by_type(type);

  audio.title = audio.title || handle_url_to_title(audio.url);
  const existing = store.playlist.find((item: Audio) => item.title === audio.title || item.url === audio.url);
  if (!existing) {
    store.playlist.push(audio as Audio);
  } else {
    existing.title = audio.title;
    existing.url = audio.url;
  }
  store.src = audio.url;
  store.progress = 0;
  store.playing = false;
  store.playing = true;
}

export function pauseAudio(type: 'bgm' | 'ambient'): void {
  const store = get_store_by_type(type);
  store.playing = false;
}

export function getAudioList(type: 'bgm' | 'ambient'): Audio[] {
  const store = get_store_by_type(type);
  return klona(store.playlist);
}

export function replaceAudioList(type: 'bgm' | 'ambient', audio_list: AudioWithOptionalTitle[]): void {
  const store = get_store_by_type(type);
  store.playlist = audio_list.map((item: AudioWithOptionalTitle) => ({ title: item.title || handle_url_to_title(item.url), url: item.url }));
}

export function appendAudioList(type: 'bgm' | 'ambient', audio_list: AudioWithOptionalTitle[]): void {
  const store = get_store_by_type(type);
  store.playlist.push(
    ...audio_list.map((item: AudioWithOptionalTitle) => ({ title: item.title || handle_url_to_title(item.url), url: item.url })),
  );
}

type AudioSettings = {
  enabled: boolean;
  mode: AudioMode;
  muted: boolean;
  volume: number;
};

export function getAudioSettings(type: 'bgm' | 'ambient'): AudioSettings {
  const store = get_store_by_type(type);
  return klona(_.pick(store, ['enabled', 'mode', 'muted', 'volume']));
}

type CurrentAudio = {
  src: string;
  title: string;
  playing: boolean;
  progress: number;
};

/**
 * 获取当前播放的音频信息: 链接、标题、是否在播、进度
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @returns 当前音频信息; 未选中曲目时 `src`/`title` 为空字符串
 */
export function getCurrentAudio(type: 'bgm' | 'ambient'): CurrentAudio {
  const store = get_store_by_type(type);
  const current = store.playlist.find((item: Audio) => item.url === store.src);
  return {
    src: store.src,
    title: current?.title ?? '',
    playing: store.playing,
    progress: store.progress,
  };
}

export function setAudioSettings(type: 'bgm' | 'ambient', settings: Partial<AudioSettings>): void {
  const store = get_store_by_type(type);
  if (settings.enabled !== undefined) {
    store.enabled = settings.enabled;
  }
  if (settings.mode !== undefined) {
    store.mode = settings.mode;
  }
  if (settings.muted !== undefined) {
    store.muted = settings.muted;
  }
  if (settings.volume !== undefined) {
    store.volume = _.clamp(settings.volume, 0, 100);
  }
}
