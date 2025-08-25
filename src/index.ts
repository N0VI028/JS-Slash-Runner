import { defaultAudioSettings, initAudioComponents } from '@/component/audio';
import { initExtensionMainPanel } from '@/component/index';
import { initListener } from '@/component/listener';
import { derenderAllMacros, destroyMacroOnExtension, initializeMacroOnExtension, renderAllMacros } from '@/component/macrolike';
import { defaultIframeSettings, initIframePanel } from '@/component/message_iframe';
import { initPromptView } from '@/component/prompt_view';
import { initReference } from '@/component/reference';
import { buildScriptRepository } from '@/component/script_repository/index';
import { defaultScriptSettings } from '@/component/script_repository/types';
import { initVariableManager } from '@/component/variable_manager';
import { disableIncompatibleOption } from '@/disable_incompatible_option';
import { initTavernHelperObject } from '@/function';
import { initAudioSlashCommands } from '@/slash_command/audio';
import { initSlashEventEmit } from '@/slash_command/event';
import {
  addVersionUpdateElement,
  getCurrentVersion,
  handleUpdateButton,
  runCheckWithPath,
  showNewFeature,
  VERSION_FILE_PATH,
} from '@/util/check_update';
import { Collapsible } from '@/util/collapsible';
import {
  extensionFolderPath,
  extensionName,
  extensionSettingName,
  getOrSaveSettingValue,
  saveSettingValue,
} from '@/util/extension_variables';

import { event_types, eventSource, saveSettings } from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';

import log_object from 'loglevel';
import YAML_object from 'yaml';
import z_object from 'zod';

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
  macro: {
    replace: true,
  },
  debug: {
    enabled: false,
  },
};

const templatePath = `${extensionFolderPath}/src/component`;

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
    $('#toolbox-settings-title').removeClass('title-item-active');
  }

  function hideAllContentPanels() {
    $('#main-settings-content').hide();
    $('#render-settings-content').hide();
    $('#script-settings-content').hide();
    $('#toolbox-settings-content').hide();
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
    case 'toolbox':
      $('#toolbox-settings-title').addClass('title-item-active');
      $('#toolbox-settings-content').show();
      break;
  }
}

/**界面统一加载 */
async function initExtensionPanel() {
  const getContainer = () => $('#extensions_settings');
  const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'index');
  getContainer().append(windowHtml);
  const $script_container = $(await renderExtensionTemplateAsync(`${templatePath}/script_repository/public`, 'index'));
  $('#script-settings-content').append($script_container);
  const $iframe_container = $(await renderExtensionTemplateAsync(`${templatePath}/message_iframe`, 'index'));
  $('#render-settings-content').append($iframe_container);
  const $variables_container = $(
    await renderExtensionTemplateAsync(`${templatePath}/variable_manager/public`, 'variable_manager_entry'),
  );
  const $prompt_view_container = $(
    await renderExtensionTemplateAsync(`${templatePath}/prompt_view/public`, 'prompt_view_entry'),
  );
  const $audio_container = $(await renderExtensionTemplateAsync(`${templatePath}/audio`, 'index'));
  $('#toolbox-settings-content').append($variables_container).append($prompt_view_container).append($audio_container);
  const $reference_container = $(await renderExtensionTemplateAsync(`${templatePath}/reference`, 'index'));
  $('#extension-reference').append($reference_container);
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

declare namespace globalThis {
  let log: typeof log_object;
  let YAML: typeof YAML_object;
  let z: typeof z_object;
}

function initThirdPartyObject() {
  globalThis.log = log_object;
  globalThis.YAML = YAML_object;
  globalThis.z = z_object;
}

// TODO: 拆入 component 中
async function initMacroReplace() {
  const macro_replace_enabled = await getOrSaveSettingValue('macro.replace', defaultSettings.macro.replace);
  $('#macro-replace-disable-toggle')
    .prop('checked', !macro_replace_enabled)
    .on('click', function () {
      const should_disable = $(this).prop('checked');
      saveSettingValue('macro.replace', !should_disable);
      if (should_disable) {
        destroyMacroOnExtension();
      } else {
        initializeMacroOnExtension();
      }
    });
  // TODO: 随 initExtensionMainPanel 初始化, 现在这样即便酒馆助手关闭依旧生效
  if (macro_replace_enabled) {
    initializeMacroOnExtension();
  }
}

// TODO: 拆入 component 中
async function initDebugMode() {
  const debug_enabled = await getOrSaveSettingValue('debug.enabled', defaultSettings.debug.enabled);
  $('#debug-mode-toggle')
    .prop('checked', debug_enabled)
    .on('click', function () {
      const should_debug = $(this).prop('checked');
      saveSettingValue('debug.enabled', should_debug);
      if (should_debug) {
        log_object.enableAll();
      } else {
        log_object.setLevel('warn');
      }
    });

  // TODO: 随 initExtensionMainPanel 初始化?
  if (debug_enabled) {
    log_object.enableAll();
  } else {
    log_object.setLevel('warn');
  }
}

/**
 * 初始化扩展面板
 */
jQuery(async () => {
  await initExtensionPanel();
  //@ts-ignore
  if (!extension_settings[extensionSettingName]) {
    _.set(extension_settings, extensionSettingName, defaultSettings);
    // 删除旧版配置
    _.unset(extension_settings, extensionName);
    showNewFeature();
    await saveSettings();
  } else {
    // 清理弃用的油猴配置项
    //@ts-ignore
    const extensionConfig = extension_settings[extensionSettingName];
    if (_.has(extensionConfig, 'render.tampermonkey_compatibility')) {
      _.unset(extensionConfig, 'render.tampermonkey_compatibility');
      await saveSettings();
    }
  }

  disableIncompatibleOption();
  initThirdPartyObject();
  initTavernHelperObject();
  // 默认显示主设置界面
  $('#main-settings-title').addClass('title-item-active');
  $('#main-settings-content').show();
  $('#render-settings-content').hide();
  $('#script-settings-content').hide();
  $('#toolbox-settings-content').hide();

  // 监听设置选项卡切换
  $('#main-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#render-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#script-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#toolbox-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));

  eventSource.once(event_types.APP_READY, async () => {
    await initMacroReplace();
    await initDebugMode();
    initExtensionMainPanel();
    await handleVersionUpdate();
    await initAudioComponents();
    initAudioSlashCommands();
    initSlashEventEmit();
    await buildScriptRepository();
    await initIframePanel();
    await initReference();
    await initListener();
    initVariableManager();
    initPromptView();
  });

  // 通用Collapsible折叠功能
  Collapsible.initAll('.collapsible', {
    headerSelector: 'div:first-child',
    contentSelector: '.collapsible-content',
    initiallyExpanded: false,
    animationDuration: {
      expand: 280,
      collapse: 250,
    },
  });
});
