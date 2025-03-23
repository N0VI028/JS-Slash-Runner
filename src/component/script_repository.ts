// @ts-nocheck
import {
  eventSource,
  event_types,
  saveSettingsDebounced,
  reloadCurrentChat,
  this_chid,
  characters,
} from '../../../../../../script.js';
import { selected_group } from '../../../../../group-chats.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../../../extensions.js';
import { power_user } from '../../../../../power-user.js';
import { extensionName, extensionFolderPath } from '../index.js';
import { POPUP_TYPE, callGenericPopup } from '../../../../../popup.js';
import { download, getFileText, getSortableDelay, uuidv4 } from '../../../../../utils.js';

export const defaultScriptSettings = {
  script_enabled: true,
  global_script_enabled: true,
  scope_script_enabled: 'global',
};

interface Script {
  id: string;
  name: string;
  type: 'global' | 'scope';
  content: string;
  info: string;
  enabled: boolean;
}

/**
 * 初始化脚本库
 */
async function initScriptLibrary() {
  const scriptTest = [
    {
      id: uuidv4(),
      name: 'test',
      type: 'global',
      content: 'test',
      info: 'test',
    },
    {
      id: uuidv4(),
      name: 'test2',
      type: 'scope',
      content: 'test2',
      info: 'test2',
    },
  ];
  const globalTemplate = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_item_template'), {
    moveTo: 'move-to-scoped',
    faIcon: 'fa-arrow-down',
  });

  scriptTest.forEach(async script => {
    const scriptHtml = globalTemplate.clone();
    scriptHtml.find('.script-item').attr('id', script.id);
    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-storage-location').addClass(script.type === 'global' ? 'move-to-scoped' : 'move-to-global');
    scriptHtml.find('.script-storage-location i').addClass(script.type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');
    scriptHtml.find('.edit-script').on('click', (event: JQuery.ClickEvent) => {
      onScriptEditorOpenClick(script.type, script.id);
    });
    scriptHtml.find('.delete-script').on('click', (event: JQuery.ClickEvent) => {
      deleteScript(script.id);
    });
    $('#global-script-list').prepend(scriptHtml);
  });
}

/**
 * 打开脚本编辑器
 */
async function onScriptEditorOpenClick(type: 'global' | 'scope' = 'global', scriptId: string | null = null) {
  const $editorHtml = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_editor'));
  const popupResult = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
    okButton: '确认',
    cancelButton: '取消',
  });
  if (popupResult) {
    const scriptName = $editorHtml.find('#script-name-input').val();
    const scriptContent = $editorHtml.find('#script-content-textarea').val();
    const scriptInfo = $editorHtml.find('#script-info-textarea').val();
    if (scriptId === null) {
      const script: Script = {
        id: uuidv4(),
        name: scriptName,
        type,
        content: scriptContent,
        info: scriptInfo,
        enabled: false,
      };
      saveScript(script, true);
    }
  }
}

/**
 * 保存脚本
 */
async function saveScript(script: Script, isNew: boolean = false) {
  if (!script.name) {
    toastr.error('保存失败，脚本名称为空');
    return;
  }
  if (isNew) {
    const $scriptItem = $(
      await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_item_template', {
        scriptName: script.name,
        scriptId: script.id,
        moveTo: script.type === 'global' ? 'move-to-scoped' : 'move-to-global',
        faIcon: script.type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up',
      }),
    );
    if (script.type === 'global') {
      $('#global-script-list').prepend($scriptItem);
    } else {
      $('#scoped-script-list').prepend($scriptItem);
    }
  }
}

/**
 * 删除脚本
 */

function deleteScript(id: string) {
  const $scriptItem = $(`#${id}`);
  $scriptItem.remove();
}

/** 加载脚本库
 *
 */
export async function loadScriptLibrary() {
  $('#global-script-list').empty();
  $('#scoped-script-list').empty();
}

/**
 * 自动为当前角色启用正则表达式规则
 */
export async function autoEnableCharacterRegex() {
  if (this_chid === undefined) {
    return;
  }

  if (selected_group) {
    return;
  }

  const avatar = characters[this_chid].avatar;
  if (!extension_settings.character_allowed_regex.includes(avatar)) {
    extension_settings.character_allowed_regex.push(avatar);
    reloadCurrentChat();
  }

  saveSettingsDebounced();
}

/**
 * 注册自动启用角色正则表达式的事件监听
 */
export async function registerAutoEnableCharacterRegex() {
  eventSource.on(event_types.CHAT_CHANGED, autoEnableCharacterRegex);
}

/**
 * 取消注册自动启用角色正则表达式的事件监听
 */
export async function unregisterAutoEnableCharacterRegex() {
  eventSource.removeListener(event_types.CHAT_CHANGED, autoEnableCharacterRegex);
}

/**
 * 处理自动启用角色正则表达式开关的点击事件
 */
export async function onAutoEnableCharacterRegexClick() {
  const isEnabled = Boolean($('#auto_enable_character_regex').prop('checked'));
  extension_settings[extensionName].auto_enable_character_regex = isEnabled;
  if (isEnabled) {
    registerAutoEnableCharacterRegex();
  } else {
    saveSettingsDebounced();
  }
}

/**
 * 自动禁用不兼容的选项
 */
export async function autoDisableIncompatibleOptions() {
  if (power_user.auto_fix_generated_markdown || power_user.trim_sentences || power_user.forbid_external_media) {
    power_user.auto_fix_generated_markdown = false;
    $('#auto_fix_generated_markdown').prop('checked', power_user.auto_fix_generated_markdown);

    power_user.trim_sentences = false;
    $('#trim_sentences_checkbox').prop('checked', power_user.trim_sentences);

    power_user.forbid_external_media = false;
    $('#forbid_external_media').prop('checked', power_user.forbid_external_media);
  }
  saveSettingsDebounced();
}

/**
 * 注册自动禁用不兼容选项的事件监听
 */
export async function registerAutoDisableIncompatibleOptions() {
  eventSource.on(event_types.CHAT_CHANGED, autoDisableIncompatibleOptions);
}

/**
 * 取消注册自动禁用不兼容选项的事件监听
 */
export async function unregisterAutoDisableIncompatibleOptions() {
  eventSource.removeListener(event_types.CHAT_CHANGED, autoDisableIncompatibleOptions);
}

/**
 * 处理自动禁用不兼容选项开关的点击事件
 */
export async function onAutoDisableIncompatibleOptions() {
  const isEnabled = Boolean($('#auto_disable_incompatible_options').prop('checked'));
  extension_settings[extensionName].auto_disable_incompatible_options = isEnabled;
  if (isEnabled) {
    registerAutoDisableIncompatibleOptions();
  } else {
    unregisterAutoDisableIncompatibleOptions();
  }
  saveSettingsDebounced();
}

export async function initAutoSettings() {
  $('#open-global-script-editor').on('click', () => onScriptEditorOpenClick('global', null));
  $('#open-scope-script-editor').on('click', () => onScriptEditorOpenClick('scope', null));
  initScriptLibrary();
  // // 处理自动启用角色正则表达式设置
  // const auto_enable_character_regex = extension_settings[extensionName].auto_enable_character_regex;
  // $('#auto_enable_character_regex')
  //   .prop('checked', auto_enable_character_regex)
  //   .on('click', onAutoEnableCharacterRegexClick);
  // if (auto_enable_character_regex) {
  //   onAutoEnableCharacterRegexClick();
  // }
  // // 处理自动禁用不兼容选项设置
  // const auto_disable_incompatible_options = extension_settings[extensionName].auto_disable_incompatible_options;
  // $('#auto_disable_incompatible_options')
  //   .prop('checked', auto_disable_incompatible_options)
  //   .on('click', onAutoDisableIncompatibleOptions);
  // if (auto_disable_incompatible_options) {
  //   onAutoDisableIncompatibleOptions();
  // }
}
