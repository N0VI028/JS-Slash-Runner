import { useChatSettingsStore, useGlobalSettingsStore } from '@/store/settings';
import { chat_metadata } from '@sillytavern/script';
import { saveMetadataDebounced } from '@sillytavern/scripts/extensions';

function createAudioStore(type: 'bgm' | 'ambient') {
  return defineStore(`${type}_audio`, () => {
    const global_settings = useGlobalSettingsStore();

    // TODO: 应该用 src 还是 index?
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
    const playlist = ref([] as { url: string; title?: string }[]);

    /**
     * 从 chat_metadata.variables 读取 playlist
     * 兼容旧数据格式（字符串数组）
     */
    const loadPlaylistFromMetadata = () => {
      const typeKey = type === 'bgm' ? 'bgmurl' : 'ambienturl';
      const chatSpecificUrls = _.get(chat_metadata, ['variables', typeKey], []);

      if (!Array.isArray(chatSpecificUrls)) {
        playlist.value = [];
        return;
      }

      playlist.value = chatSpecificUrls
        .map((item: any) => {
          // 旧数据：字符串格式，转换为对象
          if (typeof item === 'string') {
            return {
              url: item,
              title: handleUrlToTitle(item),
            };
          }
          // 新数据：对象格式
          if (typeof item === 'object' && item !== null && item.url) {
            return {
              url: item.url,
              title: item.title || handleUrlToTitle(item.url),
            };
          }
          return null;
        })
        .filter((item: any) => item !== null) as { url: string; title?: string }[];
    };

    const savePlaylistToMetadata = () => {
      const typeKey = type === 'bgm' ? 'bgmurl' : 'ambienturl';
      if (!_.has(chat_metadata, 'variables')) {
        _.set(chat_metadata, 'variables', {});
      }
      _.set(chat_metadata, ['variables', typeKey], playlist.value);
      saveMetadataDebounced();
    };

    loadPlaylistFromMetadata();

    watch(
      playlist,
      () => {
        savePlaylistToMetadata();
      },
      { deep: true },
    );

    const chat_settings = useChatSettingsStore();
    watch(
      () => chat_settings.id,
      () => {
        src.value = '';
        playing.value = false;
        progress.value = 0;
        // 切换聊天时重新加载 playlist
        loadPlaylistFromMetadata();
      },
    );

    return { src, playing, progress, enabled, mode, muted, volume, playlist, handleUrlToTitle };
  });
}

export const useBgmAudioStore = createAudioStore('bgm');
export const useAmbientAudioStore = createAudioStore('ambient');

/**
 * 处理 URL，从 URL 中提取文件名作为默认 title
 * @param url 音频文件的 URL
 * @returns 从 URL 中提取的文件名（不含扩展名）
 */
export const handleUrlToTitle = (url: string) => {
  return url.split('/').pop()?.split('.').shift() || url;
};
