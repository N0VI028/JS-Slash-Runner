// @ts-nocheck
import {
  eventSource,
  event_types,
  saveSettingsDebounced,
  reloadCurrentChat,
  this_chid,
} from '../../../../../script.js';
import { selected_group } from '../../../../group-chats.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../../extensions.js';
import { executeSlashCommandsWithOptions } from '../../../../slash-commands.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { SlashCommand } from '../../../../slash-commands/SlashCommand.js';
import { SlashCommandArgument, SlashCommandNamedArgument } from '../../../../slash-commands/SlashCommandArgument.js';
import { SlashCommandEnumValue } from '../../../../slash-commands/SlashCommandEnumValue.js';

import { handleIframe } from './iframe_server/index.js';
import { iframe_client } from './iframe_client_exported/index.js';
import { initSlashEventEmit } from './slash_command/event.js';
import { libraries_text } from './component/character_level/library.js';
import {
  initializeMacroOnExtension,
  destroyMacroOnExtension,
  registerAllMacros,
  unregisterAllMacros,
} from './component/macro.js';
import {
  initializeCharacterLevelOnExtension,
  destroyCharacterLevelOnExtension,
} from './component/character_level/index.js';
import { clearTempVariables, shouldUpdateVariables, checkVariablesEvents } from './iframe_server/variables.js';
import { script_url } from './script_url.js';
import { third_party } from './third_party.js';
import { defaultAudioSettings, initAudioComponents } from './component/audio.js';
import {
  defaultIframeSettings,
  renderAllIframes,
  renderPartialIframes,
  initIframePanel,
  viewport_adjust_script,
  tampermonkey_script,
  partialRenderEvents,
  addCodeToggleButtonsToAllMessages,
  renderMessageAfterDelete,
  addRenderingOptimizeSettings,
  removeRenderingOptimizeSettings,
} from './component/message_iframe.js';
import { initAutoSettings, defaultScriptSettings } from './component/script_repository.js';

export const extensionName = 'JS-Slash-Runner';
//TODO: 修改名称
export const extensionFolderPath = `third-party/${extensionName}`;
export let isExtensionEnabled;

let isScriptLibraryOpen = false;

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

const handleChatChanged = () => {
  renderAllIframes(false);
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handlePartialRender = (mesId: string) => {
  renderPartialIframes(mesId);
};

const handleMessageDeleted = (mesId: string) => {
  clearTempVariables();
  renderMessageAfterDelete(mesId);
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handleVariableUpdated = (mesId: string) => {
  shouldUpdateVariables(mesId);
};

async function handleExtensionToggle(userAction: boolean = true, enable: boolean = true) {
  if (userAction) {
    saveSettingValue('enabled_extension', enable);
  }
  if (enable) {
    // 指示器样式
    $('#extension-status-icon').css('color', 'green').next().text('扩展已启用');

    script_url.set('iframe_client', iframe_client);
    script_url.set('viewport_adjust_script', viewport_adjust_script);
    script_url.set('tampermonkey_script', tampermonkey_script);

    registerAllMacros();
    initializeMacroOnExtension();
    initializeCharacterLevelOnExtension();

    // 重新注入前端卡优化的样式和设置
    if (userAction && getSettingValue('render.rendering_optimize')) {
      addRenderingOptimizeSettings();
    }

    window.addEventListener('message', handleIframe);

    eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);

    partialRenderEvents.forEach(eventType => {
      eventSource.on(eventType, handlePartialRender);
    });

    checkVariablesEvents.forEach(eventType => {
      eventSource.on(eventType, handleVariableUpdated);
    });
    eventSource.on(event_types.MESSAGE_DELETED, handleMessageDeleted);

    if (userAction && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  } else {
    // 指示器样式
    $('#extension-status-icon').css('color', 'red').next().text('扩展已禁用');

    script_url.delete('iframe_client');
    script_url.delete('viewport_adjust_script');
    script_url.delete('tampermonkey_script');

    unregisterAllMacros();
    destroyMacroOnExtension();
    destroyCharacterLevelOnExtension();

    if (getSettingValue('render.rendering_optimize')) {
      removeRenderingOptimizeSettings();
    }

    window.removeEventListener('message', handleIframe);

    eventSource.removeListener(event_types.CHAT_CHANGED, handleChatChanged);

    partialRenderEvents.forEach(eventType => {
      eventSource.removeListener(eventType, handlePartialRender);
    });
    checkVariablesEvents.forEach(eventType => {
      eventSource.removeListener(eventType, handleVariableUpdated);
    });
    eventSource.removeListener(event_types.MESSAGE_DELETED, handleMessageDeleted);
    if (userAction && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  }
  $('#js_slash_runner_text').text(getSettingValue('activate_setting') ? '关闭前端渲染' : '开启前端渲染');
  saveSettingsDebounced();
}

function formatSlashCommands(): string {
  const cmdList = Object.keys(SlashCommandParser.commands)
    .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(key => SlashCommandParser.commands[key]);
  const transform_arg = (arg: SlashCommandNamedArgument) => {
    const transformers = {
      name: (value: SlashCommandNamedArgument['name']) => ({ name: value }),
      // description: (value: SlashCommandNamedArgument['description']) => ({ description: value }),
      isRequired: (value: SlashCommandNamedArgument['isRequired']) => ({
        is_required: value,
      }),
      defaultValue: (value: SlashCommandNamedArgument['defaultValue']) =>
        value !== null ? { default_value: value } : {},
      acceptsMultiple: (value: SlashCommandNamedArgument['acceptsMultiple']) => ({ accepts_multiple: value }),
      enumList: (value: SlashCommandNamedArgument['enumList']) =>
        value.length > 0 ? { enum_list: value.map(e => e.value) } : {},
      typeList: (value: SlashCommandNamedArgument['typeList']) => (value.length > 0 ? { type_list: value } : {}),
    };

    return Object.entries(arg)
      .filter(([_, value]) => value !== undefined)
      .reduce(
        (result, [key, value]) => ({
          ...result,
          // @ts-ignore
          ...transformers[key]?.(value),
        }),
        {},
      );
  };
  const transform_help_string = (help_string: string) => {
    const content = $('<span>').html(help_string);
    return content
      .text()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .join(' ');
  };

  return cmdList
    .map(cmd => ({
      name: cmd.name,
      named_args: cmd.namedArgumentList.map(transform_arg) ?? [],
      unnamed_args: cmd.unnamedArgumentList.map(transform_arg) ?? [],
      return_type: cmd.returns ?? 'void',
      help_string: transform_help_string(cmd.helpString) ?? 'NO DETAILS',
    }))
    .map(
      cmd =>
        `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
          .map(
            arg =>
              `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              }]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
          .map(
            arg =>
              `(${arg.accepts_multiple ? `...` : ``}${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              })${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')} // ${cmd.help_string}`,
    )
    .join('\n');
}

/**
 * 获取扩展设置变量的值
 * @returns 设置变量的值
 */
export function getSettingValue(key: string) {
  const keys = key.split('.');
  let value = extension_settings[extensionName];

  for (const k of keys) {
    if (value === undefined || value === null) {
      return undefined;
    }
    value = value[k];
  }

  return value;
}

/**
 * 保存扩展设置变量的值
 * @param key 设置变量的键
 * @param value 设置变量的值
 */
export async function saveSettingValue(key: string, value: any) {
  const keys = key.split('.');
  let current = extension_settings[extensionName];
  for (const k of keys) {
    current = current[k];
  }
  current = value;
  await saveSettingsDebounced();
}

/**
 * 设置页面切换
 *  @param event 事件对象
 * */
function handleSettingPageChange(event: JQuery.ClickEvent) {
  const target = $(event.currentTarget);
  let id = target.attr('id');
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
 * 添加前端渲染快速按钮
 */
function addRenderQuickButton() {
  const buttonHtml = $(`
  <div id="tavern_helper_container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      <span id="tavern_helper_text">${getSettingValue('render.render_enabled') ? '关闭前端渲染' : '开启前端渲染'}</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#tavern_helper_container').on('click', function () {
    const currentChecked = $('#render-enable-toggle').prop('checked');
    $('#render-enable-toggle').prop('checked', !currentChecked);
    handleRenderToggle(true, !currentChecked);
  });
}
/**
 * 初始化扩展主设置界面
 */
function initExtensionMainPanel() {
  const isEnabled = getSettingValue('enabled_extension');
  if (isEnabled) {
    handleExtensionToggle(false, true);
  }
  $('#extension-enable-toggle')
    .prop('checked', isEnabled)
    .on('change', function () {
      handleExtensionToggle(true, $(this).prop('checked'));
    });
}

/**
 * 初始化扩展面板
 */
jQuery(async () => {
  const getContainer = () => $(document.getElementById('extensions_settings'));
  const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'settings');
  getContainer().append(windowHtml);

  if (!extension_settings[extensionName]) {
    extension_settings[extensionName] = defaultSettings;
    saveSettingsDebounced();
  }

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

  // $('#scriptLibraryButton')
  //   .off('click')
  //   .on('click', function () {
  //     isScriptLibraryOpen = !isScriptLibraryOpen;
  //     $('#scriptLibraryPopup').slideToggle(200, 'swing');
  //   });

  // $(document).on('mousedown touchstart', function (e) {
  //   const clickTarget = $(e.target);

  //   if (
  //     isScriptLibraryOpen &&
  //     clickTarget.closest('#scriptLibraryButton').length === 0 &&
  //     clickTarget.closest('#scriptLibraryPopup').length === 0
  //   ) {
  //     $('#scriptLibraryPopup').slideUp(200, 'swing');
  //     isScriptLibraryOpen = false;
  //   }
  // });
  // $('#copy_third_party_installation').on('pointerup', function () {
  //   navigator.clipboard.writeText(
  //     'npm install --save-dev @types/file-saver @types/jquery @types/jqueryui @types/lodash @types/yamljs',
  //   );
  //   executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  // });
  // $('#copy_third_party_tag').on('pointerup', function () {
  //   navigator.clipboard.writeText(third_party);
  //   executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  // });

  // $('#download_slash_commands').on('click', function () {
  //   const url = URL.createObjectURL(new Blob([formatSlashCommands()], { type: 'text/plain' }));
  //   $(this).attr('href', url);
  //   $(this).attr('download', 'slash_command.txt');
  //   setTimeout(() => URL.revokeObjectURL(url), 0);
  // });
  initExtensionMainPanel();
  initIframePanel();
  initAutoSettings();
  initAudioComponents();
  initSlashEventEmit();

  addRenderQuickButton();
});
