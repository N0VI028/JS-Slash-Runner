import { defaultAudioSettings, initAudioComponents } from '@/component/audio';
import { initExtensionMainPanel, scriptRepo } from '@/component/main';
import { defaultIframeSettings, initIframePanel } from '@/component/message_iframe';
import { defaultScriptSettings, initScriptRepository } from '@/component/script_repository';
import { initTavernHelperObject } from '@/function';
import { initAudioSlashCommands } from '@/slash_command/audio';
import { initSlashEventEmit } from '@/slash_command/event';
import {
  addVersionUpdateElement,
  getCurrentVersion,
  handleUpdateButton,
  runCheckWithPath,
  VERSION_FILE_PATH,
} from '@/util/check_update';
import { extensionFolderPath, extensionName, extensionSettingName } from '@/util/extension_variables';
import { initReference } from '@/component/reference';

import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';

const defaultSettings = {
  enabled_extension: true,
  render: {
    ...defaultIframeSettings,
  },
  script: {
    ...defaultScriptSettings,
  },
  audio: {
    ...defaultAudioSettings,
  },
};

/**
 * 设置页面切换
 *  @param event 事件对象
 * */
function handleSettingPageChange(event: JQuery.ClickEvent) {
  const target = $(event.currentTarget);
  let id = target.attr('id');
  if (id === undefined) {
    return;
  }
  id = id.replace('-settings-title', '');

  function resetAllTitleClasses() {
    $('#main-settings-title').removeClass('title-item-active');
    $('#render-settings-title').removeClass('title-item-active');
    $('#script-settings-title').removeClass('title-item-active');
    $('#audio-settings-title').removeClass('title-item-active');
  }

  function hideAllContentPanels() {
    $('#main-settings-content').hide();
    $('#render-settings-content').hide();
    $('#script-settings-content').hide();
    $('#audio-settings-content').hide();
  }

  resetAllTitleClasses();
  hideAllContentPanels();

  switch (id) {
    case 'main':
      $('#main-settings-title').addClass('title-item-active');
      $('#main-settings-content').show();
      break;
    case 'render':
      $('#render-settings-title').addClass('title-item-active');
      $('#render-settings-content').show();
      break;
    case 'script':
      $('#script-settings-title').addClass('title-item-active');
      $('#script-settings-content').show();
      break;
    case 'audio':
      $('#audio-settings-title').addClass('title-item-active');
      $('#audio-settings-content').show();
      break;
  }
}

/**
 * 版本控制
 */
async function handleVersionUpdate() {
  const currentVersion = await getCurrentVersion(VERSION_FILE_PATH);
  $('.version').text(`Ver ${currentVersion}`);
  const isNeedUpdate = await runCheckWithPath();
  if (isNeedUpdate) {
    addVersionUpdateElement();
  }
  $('#update-extension').on('click', async () => await handleUpdateButton());
}

/**
 * 初始化扩展面板
 */
jQuery(async () => {
  const getContainer = () => $('#extensions_settings');
  const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'settings');
  getContainer().append(windowHtml);
  //@ts-ignore
  if (!extension_settings[extensionSettingName]) {
    //@ts-ignore
    extension_settings[extensionSettingName] = defaultSettings;
    // 删除旧版配置
    if (extension_settings[extensionName]) {
      delete extension_settings[extensionName];
    }
    saveSettingsDebounced();
  }

  initTavernHelperObject();

  // 默认显示主设置界面
  $('#main-settings-title').addClass('title-item-active');
  $('#main-settings-content').show();
  $('#render-settings-content').hide();
  $('#script-settings-content').hide();
  $('#audio-settings-content').hide();

  // 监听设置选项卡切换
  $('#main-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#render-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#script-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#audio-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));

  handleVersionUpdate();
  initExtensionMainPanel();
  initIframePanel();
  initScriptRepository(scriptRepo);
  initAudioComponents();
  initAudioSlashCommands();
  initSlashEventEmit();
  initReference();
});
