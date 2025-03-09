// @ts-nocheck
import { eventSource, event_types, saveSettingsDebounced, chat_metadata } from '../../../../../../script.js';
import { extension_settings, saveMetadataDebounced, renderExtensionTemplateAsync } from '../../../../../extensions.js';
import { extensionName, extensionFolderPath } from '../index.js';
import { getSortableDelay } from '../../../../../utils.js';
import { POPUP_TYPE, callGenericPopup } from '../../../../../popup.js';
import { isMobile } from '../../../../../RossAscends-mods.js';
import { initAudioSlashCommands } from '../slash_command/audio.js';

export let list_BGMS: string[] = [];
export let list_ambients: string[] = [];
let bgmEnded = true;
let ambientEnded = true;
let cooldownBGM = 0;

const audioCache: Record<string, string> = {};

// 定义默认音频设置
export const defaultAudioSettings = {
  audio_setting: true,
  bgm_enabled: true,
  ambient_enabled: true,
  bgm_mode: 'repeat',
  bgm_muted: false,
  bgm_volume: 50,
  bgm_selected: null,
  bgm_current_time: 0,
  ambient_mode: 'stop',
  ambient_muted: false,
  ambient_volume: 50,
  ambient_selected: null,
  ambient_current_time: 0,
  audio_cooldown: 0,
};

/**
 * 更新音频
 * @param type 音频类型 "bgm" 或 "ambient"
 * @param isUserInput 是否由用户操作触发-将导致音频中断
 */
export async function updateAudio(type = 'bgm', isUserInput = false) {
  if (!extension_settings[extensionName].audio.audio_setting) {
    return;
  }

  const isTypeEnabled =
    type === 'bgm'
      ? extension_settings[extensionName].audio.bgm_enabled
      : extension_settings[extensionName].audio.ambient_enabled;

  if (!isTypeEnabled) {
    return;
  }
  const audioEnded = type === 'bgm' ? bgmEnded : ambientEnded;
  const audioSelector = `#audio_${type}`;

  if (!isUserInput && $(audioSelector).attr('src') != '' && !audioEnded) {
    return;
  }

  let audio_url = '';
  const playlist = await getAudioUrl(type as 'bgm' | 'ambient');

  if (isUserInput) {
    audio_url =
      type === 'bgm'
        ? extension_settings[extensionName].audio.bgm_selected || playlist[0]
        : extension_settings[extensionName].audio.ambient_selected || playlist[0];
  } else {
    const mode =
      type === 'bgm'
        ? extension_settings[extensionName].audio.bgm_mode
        : extension_settings[extensionName].audio.ambient_mode;

    const selected =
      type === 'bgm'
        ? extension_settings[extensionName].audio.bgm_selected
        : extension_settings[extensionName].audio.ambient_selected;

    audio_url = getNextFileByMode(mode, playlist, selected);
  }

  if (!audio_url) {
    return;
  }

  const audio = $(audioSelector)[0] as HTMLAudioElement;

  // 对于ambient类型，处理掉防缓存后缀
  if (type === 'ambient') {
    const cleanAudioSrc = audio.src.split('?')[0];
    const cleanAudioUrl = audio_url.split('?')[0];
    if (decodeURIComponent(cleanAudioSrc) === decodeURIComponent(cleanAudioUrl) && !audioEnded) {
      return;
    }
  } else {
    // 对于bgm类型，直接比较
    if (decodeURIComponent(audio.src) === decodeURIComponent(audio_url) && !audioEnded) {
      return;
    }
  }

  // 设置audioEnded状态
  if (type === 'bgm') {
    bgmEnded = false;
  } else {
    ambientEnded = false;
  }

  // 对于bgm类型，使用audioCache
  if (type === 'bgm') {
    if (audioCache[audio_url]) {
      audio.src = audioCache[audio_url];
      audio.play();
    } else {
      audio.src = audio_url;
      audio.play();
      audioCache[audio_url] = audio_url;
    }
  } else {
    // 对于ambient类型，使用缓存破坏
    const audioUrlWithCacheBusting = getAudioUrlWithCacheBusting(audio_url);
    audio.src = audioUrlWithCacheBusting;
    audio.play();
  }

  // 更新选中的音频
  if (type === 'bgm') {
    extension_settings[extensionName].audio.bgm_selected = audio_url;
  } else {
    extension_settings[extensionName].audio.ambient_selected = audio_url;
  }

  // 更新选择器
  const selectElement = $(`#audio_${type}_select`);
  if (selectElement.val() !== audio_url) {
    selectElement.val(audio_url);
  }

  saveSettingsDebounced();
}

/**
 * 更新音频下拉选择菜单
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export function updateAudioSelect(type = 'bgm') {
  if (!$('#audio_enabled').is(':checked')) {
    return;
  }

  const selectElement = $(`#audio_${type}_select`);
  selectElement.empty();

  const audioList = type === 'bgm' ? list_BGMS : list_ambients;
  const selectedSetting =
    type === 'bgm'
      ? extension_settings[extensionName].audio.bgm_selected
      : extension_settings[extensionName].audio.ambient_selected;

  if (audioList && audioList.length > 0) {
    // 检查当前选择的音频是否在列表中，如果不在则设为第一项
    if (!audioList.includes(selectedSetting)) {
      if (type === 'bgm') {
        extension_settings[extensionName].audio.bgm_selected = audioList[0];
      } else {
        extension_settings[extensionName].audio.ambient_selected = audioList[0];
      }
    }

    audioList.forEach(file => {
      const fileLabel = file.replace(/^.*[\\\/]/, '').replace(/\.[^/.]+$/, '');
      selectElement.append(new Option(fileLabel, file));
    });

    selectElement.val(selectedSetting);
  } else {
    console.log(`[Audio] 暂无可用的 ${type.toUpperCase()} 资源`);
  }
}

/**
 * 获取音频URL
 * @param type 音频类型 "bgm" 或 "ambient"
 * @returns 音频URL数组
 */
export async function getAudioUrl(type = 'bgm') {
  const typeKey = type === 'bgm' ? 'bgmurl' : 'ambienturl';
  const chatSpecificUrls = chat_metadata.variables?.[typeKey] || [];
  return chatSpecificUrls;
}

/**
 * 添加缓存参数防止缓存
 * @param originalUrl 原始URL
 */
export function getAudioUrlWithCacheBusting(originalUrl: string) {
  if (!originalUrl) return '';
  const cacheBuster = new Date().getTime();
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}_=${cacheBuster}`;
}

/**
 * 根据播放模式获取下一个音频文件
 * @param mode 播放模式
 * @param playlist 播放列表
 * @param currentFile 当前文件
 */
export function getNextFileByMode(mode: string, playlist: string[], currentFile: string) {
  if (!playlist || playlist.length === 0) {
    return '';
  }

  switch (mode) {
    case 'repeat':
      return playlist[0];
    case 'single':
      return currentFile || playlist[0];
    case 'random': {
      const filteredPlaylist = playlist.filter(file => file !== currentFile);
      if (filteredPlaylist.length === 0) {
        return playlist[0];
      }
      const randomIndex = Math.floor(Math.random() * filteredPlaylist.length);
      return filteredPlaylist[randomIndex];
    }
    case 'stop':
      return '';
    default:
      return playlist[0];
  }
}

/**
 * 切换音频控件状态
 * @param type 音频类型 "bgm" 或 "ambient"
 * @param status 是否启用
 */
export function toggleAudioControls(type: 'bgm' | 'ambient', status = 'enable') {
  const isMainEnabled = $('#audio_enabled').prop('checked');

  // 只有当总开关打开且当前操作是启用控件时，才真正启用控件
  const shouldEnable = isMainEnabled && status === 'enable';

  const controlIds = [
    `#audio_${type}_play_pause`,
    `#audio_${type}_mute`,
    `#audio_${type}_mode`,
    `#audio_${type}_select`,
    `#audio_${type}_volume_slider`,
  ];

  controlIds.forEach(id => {
    $(id).prop('disabled', !shouldEnable);
  });
}

/**
 * 点击音频启用按钮时的通用处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export async function onAudioEnabledClick(type = 'bgm') {
  const enabled = $(`#enable_${type}`).prop('checked');
  extension_settings[extensionName].audio[`${type}_enabled`] = enabled;
  saveSettingsDebounced();

  if (enabled) {
    toggleAudioControls(type as 'bgm' | 'ambient', 'enable');
    await updateAudio(type, false);
  } else {
    ($(`#audio_${type}`)[0] as HTMLAudioElement).pause();
    toggleAudioControls(type as 'bgm' | 'ambient', 'disable');
  }
}

/**
 * 初始化音频事件监听
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export function initAudioEventListeners(type: 'bgm' | 'ambient') {
  ($(`#audio_${type}`) as HTMLAudioElement).on('ended', async function () {
    if (type === 'bgm') {
      bgmEnded = true;
    } else {
      ambientEnded = true;
    }
    const mode = extension_settings[extensionName].audio[`${type}_mode`];

    if (mode === 'stop') {
      return;
    }

    await updateAudio(type, false);
  });
}

/**
 * 初始化进度条
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export function initializeProgressBar(type: 'bgm' | 'ambient') {
  cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
  const $audioElement = $(`#audio_${type}`);
  const $progressSlider = $(`#audio_${type}_progress_slider`);

  $audioElement.on('timeupdate', function () {
    if (!isNaN(this.duration)) {
      const progressPercent = (this.currentTime / this.duration) * 100;
      $progressSlider.val(progressPercent);
    }
    const cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
    const remainingTime = this.duration - this.currentTime;
    if (remainingTime <= cooldownBGM && !this.isFadingOut) {
      const initialVolume = this.volume;
      const fadeStep = initialVolume / (cooldownBGM * 10);
      this.isFadingOut = true;

      const fadeOutInterval = setInterval(() => {
        if (this.volume > 0) {
          this.volume = Math.max(0, this.volume - fadeStep);
        } else {
          clearInterval(fadeOutInterval);
          this.isFadingOut = false;
        }
      }, 100);
    }
  });

  $audioElement.on('play', function () {
    this.volume = 0;
    const cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
    const targetVolume = $(`#audio_${type}_volume_slider`).val() / 100;
    const fadeStep = targetVolume / (cooldownBGM * 10);
    let fadeInInterval = setInterval(() => {
      if (this.volume < targetVolume) {
        this.volume = Math.min(targetVolume, this.volume + fadeStep);
      } else {
        clearInterval(fadeInInterval);
      }
    }, 100);
  });

  $audioElement.on('loadedmetadata', function () {
    if (!isNaN(this.duration)) {
      $progressSlider.attr('max', 100);
    }
  });

  $progressSlider.on('input', function () {
    const value = $(this).val();
    if (!isNaN($audioElement[0].duration)) {
      $audioElement[0].currentTime = (value / 100) * $audioElement[0].duration;
    }
  });
}

/**
 * 音量滑块滚轮调节事件处理
 * @param e 事件对象
 */
function onVolumeSliderWheelEvent(e) {
  const slider = $(this);
  e.preventDefault();
  e.stopPropagation();

  const delta = e.deltaY / 20;
  const sliderVal = Number(slider.val());

  let newVal = sliderVal - delta;
  if (newVal < 0) {
    newVal = 0;
  } else if (newVal > 100) {
    newVal = 100;
  }

  slider.val(newVal).trigger('input');
}

/**
 * 长按音量控制按钮出现音量调节
 * @param volumeControlId 音量控制按钮ID
 * @param iconId 音量控制按钮图标ID
 */
function handleLongPress(volumeControlId, iconId) {
  const $volumeControl = $('#' + volumeControlId);
  const $icon = $('#' + iconId);
  let pressTimer;

  if (isMobile()) {
    $icon.on('touchstart', function (e) {
      pressTimer = setTimeout(() => {
        $volumeControl.css('display', 'block');
      }, 500);
    });

    $icon.on('touchend', function (e) {
      clearTimeout(pressTimer);
    });

    $(document).on('click', function (event) {
      if (
        !$icon.is(event.target) &&
        $icon.has(event.target).length === 0 &&
        !$volumeControl.is(event.target) &&
        $volumeControl.has(event.target).length === 0
      ) {
        $volumeControl.css('display', 'none');
      }
    });
  }
}

/**
 * 刷新音频资源
 */
export async function refreshAudioResources() {
  list_BGMS = await getAudioUrl('bgm');
  list_ambients = await getAudioUrl('ambient');
  updateAudioSelect('bgm');
  updateAudioSelect('ambient');
}

/**
 * 打开音频资源管理弹窗
 * @param typeKey 音频类型 "bgmurl" 或 "ambienturl"
 */

async function openUrlManagerPopup(typeKey: 'bgmurl' | 'ambienturl') {
  const urlManager = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'urlManager'));
  urlManager.prepend(`
    <style>
      #saved_audio_url.empty::after {
        content: "暂无音频";
        color: #999;
        margin-top: 20px;
        font-size: 12px;
      }
    </style>
  `);
  const savedAudioUrl = urlManager.find('#saved_audio_url').empty();
  const urlTemplate = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'urlTemplate'));

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  let urlValue: string[] = chat_metadata.variables[typeKey];
  if (!urlValue) {
    urlValue = [];

    savedAudioUrl.addClass('empty');
  } else {
    try {
      if (urlValue.length === 0) {
        savedAudioUrl.addClass('empty');
      }
    } catch (error) {
      console.error(`Failed to parse ${typeKey}:`, error);
      return null;
    }
  }

  const updatedUrls: Record<string, string> = {};
  let newUrlOrder = [...urlValue];
  let importedUrls: string[] = [];
  function renderUrl(container: JQuery<HTMLElement>, url: string) {
    const urlHtml = urlTemplate.clone();
    let fileName;
    if (url.includes('/')) {
      const parts = url.split('/');
      fileName = parts[parts.length - 1] || parts[parts.length - 2];
    } else {
      fileName = url;
    }

    const id = fileName.replace(/\./g, '-');

    urlHtml.attr('id', id);
    urlHtml.find('.audio_url_name').text(fileName);

    urlHtml.find('.audio_url_name').attr('data-url', url);

    urlHtml.find('.edit_existing_url').on('click', async function () {
      const currentUrl = urlHtml.find('.audio_url_name').attr('data-url');

      if (!currentUrl) {
        console.error('No URL found for this element.');
        return;
      }

      const inputUrl = await callGenericPopup('', POPUP_TYPE.INPUT, currentUrl);

      if (!inputUrl) {
        return;
      }

      const newFileName = inputUrl.split('/').pop();

      const newId = newFileName.replace(/\./g, '-');

      urlHtml.attr('id', newId);
      urlHtml.find('.audio_url_name').text(newFileName);
      urlHtml.find('.audio_url_name').attr('data-url', inputUrl);

      updatedUrls[currentUrl] = inputUrl;
    });

    urlHtml.find('.delete_regex').on('click', async function () {
      const confirmDelete = await callGenericPopup('确认要删除此链接?此操作无法撤回', POPUP_TYPE.CONFIRM);

      if (!confirmDelete) {
        return;
      }

      const currentUrl = urlHtml.find('.audio_url_name').attr('data-url');

      if (chat_metadata.variables && chat_metadata.variables[typeKey]) {
        let urlList = chat_metadata.variables[typeKey];

        urlList = urlList.filter((item: any) => item !== currentUrl);

        chat_metadata.variables[typeKey] = urlList;

        saveMetadataDebounced();
      }

      urlHtml.remove();
      newUrlOrder = newUrlOrder.filter(url => url !== currentUrl);
      if (newUrlOrder.length === 0) {
        savedAudioUrl.addClass('empty');
      }
    });

    container.append(urlHtml);
  }

  urlValue.forEach(url => {
    renderUrl(savedAudioUrl, url);
  });
  urlManager.find('#import_button').on('click', async function () {
    const newUrls = await openUrlImportPopup();

    if (!newUrls) {
      console.debug(`${typeKey} URL导入已取消`);
      return;
    }

    importedUrls = [...importedUrls, ...newUrls];
    savedAudioUrl.removeClass('empty');

    newUrls.forEach(url => {
      renderUrl(savedAudioUrl, url);
      newUrlOrder.push(url);
    });
  });
  (savedAudioUrl as any).sortable({
    delay: getSortableDelay(),
    handle: '.drag-handle',
    stop: function () {
      const newUrlOrder: string[] = [];
      savedAudioUrl.find('.audio_url_name').each(function () {
        const newUrl = $(this).attr('data-url') || '';
        newUrlOrder.push(newUrl);
      });
    },
  });
  const result = await callGenericPopup(urlManager, POPUP_TYPE.CONFIRM, '', {
    okButton: `确认`,
    cancelButton: `取消`,
  });

  if (result) {
    for (let originalUrl in updatedUrls) {
      const newUrl = updatedUrls[originalUrl];
      const index = newUrlOrder.indexOf(originalUrl);
      if (index !== -1) {
        newUrlOrder[index] = newUrl;
      }
    }
    chat_metadata.variables[typeKey] = newUrlOrder;
    saveMetadataDebounced();
    if (typeKey === 'bgmurl') {
      updateAudioSelect('bgm');
    } else if (typeKey === 'ambienturl') {
      updateAudioSelect('ambient');
    }
  }

  return result;
}

/**
 * 点击音频总开关时的处理函数
 */
async function onEnabledClick() {
  const isEnabled = $('#audio_enabled').prop('checked');
  extension_settings[extensionName].audio.enabled = isEnabled;
  saveSettingsDebounced();

  if (isEnabled) {
    toggleAudioControls('bgm', 'enable');
    toggleAudioControls('ambient', 'enable');
    const bgmUrl = await getAudioUrl('bgm');
    const ambientUrl = await getAudioUrl('ambient');
    if (bgmUrl.length > 0) {
      const bgmAudioElement = $('#audio_bgm')[0] as HTMLAudioElement;
      try {
        await bgmAudioElement.play();
      } catch (error) {
        throw new Error('播放音乐失败：没有提供有效源');
      }
    }
    if (ambientUrl.length > 0) {
      const ambientAudioElement = $('#audio_ambient')[0] as HTMLAudioElement;
      try {
        await ambientAudioElement.play();
      } catch (error) {
        throw new Error('播放音效失败：没有提供有效源');
      }
    }
  } else {
    ($('#audio_bgm')[0] as HTMLAudioElement).pause();
    ($('#audio_ambient')[0] as HTMLAudioElement).pause();
    toggleAudioControls('bgm', 'disable');
    toggleAudioControls('ambient', 'disable');
  }
}

/**
 * 播放音频
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export async function playAudio(type: 'bgm' | 'ambient') {
  if (!extension_settings[extensionName].audio.audio_setting) {
    return;
  }

  const audioElement = $(`#audio_${type}`)[0] as HTMLAudioElement;
  const playPauseIcon = $(`#audio_${type}_play_pause_icon`);

  if (audioElement.error && audioElement.error.code === 4) {
    console.warn(`The ${type} element has no supported sources. Trying to reload selected audio from dropdown...`);

    const selectedAudio = $(`#audio_${type}_select`).val() as string;
    if (!selectedAudio) {
      console.error(`No audio selected for ${type}`);
      return;
    }

    audioElement.src = selectedAudio;
  }

  audioElement.play();
  playPauseIcon.removeClass('fa-play');
  playPauseIcon.addClass('fa-pause');
}

/**
 * 点击各自音频模式按钮时的通用处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
async function onAudioModeClick(type: 'bgm' | 'ambient') {
  const modes = [
    { mode: 'repeat', icon: 'fa-repeat' },
    { mode: 'random', icon: 'fa-random' },
    { mode: 'single', icon: 'fa-redo-alt' },
    { mode: 'stop', icon: 'fa-cancel' },
  ];

  const currentModeIndex = modes.findIndex(m => m.mode === extension_settings[extensionName].audio[`${type}_mode`]);

  const nextModeIndex = (currentModeIndex + 1) % modes.length;

  extension_settings[extensionName].audio[`${type}_mode`] = modes[nextModeIndex].mode;

  $(`#audio_${type}_mode_icon`).removeClass('fa-repeat fa-random fa-redo-alt fa-cancel');

  $(`#audio_${type}_mode_icon`).addClass(modes[nextModeIndex].icon);

  saveSettingsDebounced();
}

/**
 * 音频选择变化时的通用处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
async function onAudioSelectChange(type: 'bgm' | 'ambient') {
  extension_settings[extensionName].audio[`${type}_selected`] = $(`#audio_${type}_select`).val();
  await updateAudio(type, true);
  saveSettingsDebounced();
}

/**
 * 输入冷却时间的处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
async function onAudioCooldownInput() {
  extension_settings[extensionName].audio.audio_cooldown = ~~($(`#audio_cooldown`).val() as string);
  saveSettingsDebounced();
}

/**
 * 音频音量变化时的通用处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
async function onAudioVolumeChange(type: 'bgm' | 'ambient') {
  extension_settings[extensionName].audio[`${type}_volume`] = ~~($(`#audio_${type}_volume_slider`).val() as string);
  $(`#audio_${type}`).prop('volume', extension_settings[extensionName].audio[`${type}_volume`] * 0.01);
  $(`#audio_${type}_volume`).text(extension_settings[extensionName].audio[`${type}_volume`]);
  saveSettingsDebounced();
}

/**
 * 点击音频静音按钮时的通用处理函数
 * @param type 音频类型 "bgm" 或 "ambient"
 */
async function onAudioMuteClick(type: 'bgm' | 'ambient') {
  extension_settings[extensionName].audio[`${type}_muted`] = !extension_settings[extensionName].audio[`${type}_muted`];
  $(`#audio_${type}_mute_icon`).toggleClass('fa-volume-high');
  $(`#audio_${type}_mute_icon`).toggleClass('fa-volume-mute');
  $(`#audio_${type}`).prop('muted', !$(`#audio_${type}`).prop('muted'));
  $(`#audio_${type}_mute`).toggleClass('redOverlayGlow');
  saveSettingsDebounced();
}

/**
 * 切换播放/暂停状态
 * @param type 音频类型 "bgm" 或 "ambient"
 */
export async function togglePlayPause(type: 'bgm' | 'ambient') {
  if (!extension_settings[extensionName].audio.audio_setting) {
    return;
  }

  const audioElement = $(`#audio_${type}`)[0] as HTMLAudioElement;
  const playPauseIcon = $(`#audio_${type}_play_pause_icon`);

  if (audioElement.paused) {
    await playAudio(type);
  } else {
    audioElement.pause();
    playPauseIcon.removeClass('fa-pause');
    playPauseIcon.addClass('fa-play');
  }
}

/**
 * 音频管理弹窗中的管理URL
 * @param typeKey 音频类型 "bgm" 或 "ambient"
 */
async function handleUrlManagerClick(typeKey: string) {
  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }
  const existingUrls = chat_metadata.variables[typeKey] || [];

  const result = await openUrlManagerPopup(typeKey as 'bgmurl' | 'ambienturl');

  if (!result) {
    console.debug(`${typeKey} URL导入已取消`);
    return;
  }

  const newUrls = Array.isArray(result) ? result : [];

  const mergedUrls = [...new Set([...newUrls, ...existingUrls])];

  chat_metadata.variables[typeKey] = mergedUrls;
  saveMetadataDebounced();
  if (typeKey === 'bgmurl') {
    list_BGMS = await getAudioUrl('bgm');
    await updateAudio('bgm', true);
  } else if (typeKey === 'ambienturl') {
    list_ambients = await getAudioUrl('ambient');
    await updateAudio('ambient', true);
  }
}

/**
 * 打开URL导入弹窗
 * @param type 音频类型
 */
async function openUrlImportPopup(): Promise<string[] | null> {
  const input = await callGenericPopup('输入要导入的网络音频链接（每行一个）', POPUP_TYPE.INPUT, '');

  if (!input) {
    console.debug('URL import cancelled');
    return null;
  }

  const urlArray = input
    .trim()
    .split('\n')
    .map((url: string) => url.trim())
    .filter((url: string) => url !== '');

  return Array.from(new Set(urlArray));
}

// 聊天更改时的事件处理
eventSource.on(event_types.CHAT_CHANGED, async () => {
  const $bgmPlayer = $('#audio_bgm')[0] as HTMLAudioElement;
  const $ambientPlayer = $('#audio_ambient')[0] as HTMLAudioElement;

  if ($bgmPlayer && !$bgmPlayer.paused) {
    $bgmPlayer.pause();
  }

  if ($ambientPlayer && !$ambientPlayer.paused) {
    $ambientPlayer.pause();
  }
  await refreshAudioResources();
  console.log('[Audio] 聊天已更改，音频资源刷新完成');
});

/** 初始化样式
 * @param type 音频类型 "bgm" 或 "ambient"
 */
function initAudioStyles(type: 'bgm' | 'ambient') {
  // 隐藏默认播放器样式
  $(`#audio_${type}`).hide();

  if (extension_settings[extensionName].audio[`${type}_muted`]) {
    $(`#audio_${type}_mute_icon`).removeClass('fa-volume-high');
    $(`#audio_${type}_mute_icon`).addClass('fa-volume-mute');
    $(`#audio_${type}_mute`).addClass('redOverlayGlow');
    $(`#audio_${type}`).prop('muted', true);
  } else {
    $(`#audio_${type}_mute_icon`).addClass('fa-volume-high');
    $(`#audio_${type}_mute_icon`).removeClass('fa-volume-mute');
    $(`#audio_${type}_mute`).removeClass('redOverlayGlow');
    $(`#audio_${type}`).prop('muted', false);
  }

  $(`#enable_${type}`).prop('checked', extension_settings[extensionName].audio[`${type}_enabled`]);

  const audioElement = $(`#audio_${type}`)[0] as HTMLAudioElement;
  const playPauseIcon = $(`#audio_${type}_play_pause_icon`);

  if (audioElement && audioElement.paused) {
    playPauseIcon.removeClass('fa-pause');
    playPauseIcon.addClass('fa-play');
  } else if (audioElement && !audioElement.paused) {
    playPauseIcon.removeClass('fa-play');
    playPauseIcon.addClass('fa-pause');
  }
  initializeProgressBar(type);
}

/**
 * 初始化所有音频相关组件和事件监听器
 */
export function initAudioComponents() {
  const audio_enabled = extension_settings[extensionName].audio.audio_setting;
  $('#audio_enabled').prop('checked', audio_enabled).on('click', onEnabledClick);
  if (audio_enabled) {
    onEnabledClick();
  }

  // 初始化音乐和音效样式
  initAudioStyles('bgm');
  initAudioStyles('ambient');

  const audioTypes = ['bgm', 'ambient'] as const;

  const bindTypeEvents = (
    type: 'bgm' | 'ambient',
    events: Array<{
      selector: string;
      event: string;
      handler: (type: 'bgm' | 'ambient') => void;
    }>,
  ) => {
    events.forEach(({ selector, event, handler }) => {
      $(`#${selector}`).on(event, () => handler(type));
    });
  };

  audioTypes.forEach(type => {
    $(`#enable_${type}`).on('click', () => onAudioEnabledClick(type));

    bindTypeEvents(type, [
      {
        selector: `enable_${type}`,
        event: 'click',
        handler: onAudioEnabledClick,
      },
      {
        selector: `audio_${type}_mode`,
        event: 'click',
        handler: onAudioModeClick,
      },
      {
        selector: `audio_${type}_mute`,
        event: 'click',
        handler: onAudioMuteClick,
      },
      {
        selector: `audio_${type}_volume_slider`,
        event: 'input',
        handler: onAudioVolumeChange,
      },
      {
        selector: `audio_${type}_select`,
        event: 'change',
        handler: onAudioSelectChange,
      },
      {
        selector: `audio_${type}_play_pause`,
        event: 'click',
        handler: togglePlayPause,
      },
    ]);

    $('#audio_cooldown').on('input', onAudioCooldownInput).val(extension_settings[extensionName].audio.audio_cooldown);

    // 监听音频结束事件
    initAudioEventListeners('bgm');
    initAudioEventListeners('ambient');

    const volumeSlider = $(`#audio_${type}_volume_slider`).get(0);
    if (volumeSlider) {
      volumeSlider.addEventListener('wheel', onVolumeSliderWheelEvent, {
        passive: false,
      });
    }
  });

  $('#audio_refresh_assets').on('click', async () => {
    await refreshAudioResources();
  });

  handleLongPress('bgm-volume-control', 'audio_bgm_mute_icon');
  handleLongPress('ambient-volume-control', 'audio_ambient_mute_icon');

  const urlManagerMap = {
    bgm: 'bgmurl',
    ambient: 'ambienturl',
  };

  audioTypes.forEach(type => {
    $(`#${type}_manager_button`).on('click', async () => {
      await handleUrlManagerClick(urlManagerMap[type]);
      await refreshAudioResources();
    });
  });

  const bgmAudio = $('#audio_bgm')[0] as HTMLAudioElement;
  const ambientAudio = $('#audio_ambient')[0] as HTMLAudioElement;

  const togglePlayPauseIcon = (audioElement: HTMLAudioElement, iconSelector: string) => {
    const icon = $(iconSelector);
    audioElement.addEventListener('play', () => icon.removeClass('fa-play').addClass('fa-pause'));
    audioElement.addEventListener('pause', () => icon.removeClass('fa-pause').addClass('fa-play'));
  };

  togglePlayPauseIcon(bgmAudio, '#audio_bgm_play_pause_icon');
  togglePlayPauseIcon(ambientAudio, '#audio_ambient_play_pause_icon');
  initAudioSlashCommands();
}
