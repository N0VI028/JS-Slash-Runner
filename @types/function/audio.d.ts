type Audio = {
  /** 标题 */
  title: string;
  /** 音频的网络链接 */
  url: string;
};

type AudioWithOptionalTitle = {
  /** 标题 */
  title?: string;
  /** 音频的网络链接 */
  url: string;
};

/**
 * 播放给定的音频; 如果该音频没在播放列表中, 则会加入到播放列表.
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @param audio 要播放的音频; 如果音频没有设置标题 (`title`), 则会从链接 (`url`) 提取文件名作为标题
 *
 * @example
 * // 将给定链接作为背景音乐播放
 * playAudio('bgm', { url: 'http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' });
 *
 * @example
 * // 为给定链接设置标题, 并作为背景音乐播放
 * playAudio('bgm', { title: 'Kangaroo Music', url: 'http://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Kangaroo_MusiQue_-_The_Neverwritten_Role_Playing_Game.mp3' });
 */
declare function playAudio(type: 'bgm' | 'ambient', audio: AudioWithOptionalTitle): void;

/**
 * 暂停音乐
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 */
declare function pauseAudio(type: 'bgm' | 'ambient'): void;

/**
 * 获取播放列表
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @returns 播放列表
 */
declare function getAudioList(type: 'bgm' | 'ambient'): Audio[];

/**
 * 完全替换播放列表为 `audio_list`
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @param audio_list 新的播放列表; 如果其中音频没有设置标题 (`title`), 则会从链接 (`url`) 提取文件名作为标题
 */
declare function replaceAudioList(type: 'bgm' | 'ambient', audio_list: AudioWithOptionalTitle[]): void;

/**
 * 向播放列表末尾添加不存在的音频, 不会重复添加同 `title` 或 `url` 的音频
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @param audio_list 要插入的音频列表; 如果其中音频没有设置标题 (`title`), 则会从链接 (`url`) 提取文件名作为标题
 */
declare function appendAudioList(type: 'bgm' | 'ambient', audio_list: AudioWithOptionalTitle[]): void;

type AudioSettings = {
  /** 是否启用 */
  enabled: boolean;
  /**
   * 当前播放模式
   * - repeat_one: 单曲循环
   * - repeat_all: 全部循环
   * - shuffle: 随机播放
   * - play_one_and_stop: 播放一首后停止
   */
  mode: 'repeat_one' | 'repeat_all' | 'shuffle' | 'play_one_and_stop';
  /** 是否静音 */
  muted: boolean;
  /** 当前音量 (0-100) */
  volume: number;
};

/**
 * 获取音频设置
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @returns 音频设置
 */
declare function getAudioSettings(type: 'bgm' | 'ambient'): AudioSettings;

/**
 * 修改音频设置, 如果某字段不存在, 则使用原本的设置.
 *
 * @param type 背景音乐 ('bgm') 或音效 ('ambient')
 * @param settings 要修改的音频设置
 *
 * @example
 * // 将背景音乐设置为单曲循环
 * setAudioSettings('bgm', { mode: 'repeat_one' });
 *
 * @example
 * // 将音效设置为静音
 * setAudioSettings('ambient', { muted: true });
 *
 * @example
 * // 将背景音乐音量设置为 50%
 * setAudioSettings('bgm', { volume: 50 });
 */
declare function setAudioSettings(type: 'bgm' | 'ambient', settings: Partial<AudioSettings>): void;
