import { getSettingValue, saveSettingValue } from '@/index';

import {
  characters,
  eventSource,
  event_types,
  reloadCurrentChat,
  saveSettingsDebounced,
  this_chid,
} from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync, writeExtensionField } from '@sillytavern/scripts/extensions';
import { selected_group } from '@sillytavern/scripts/group-chats';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import { power_user } from '@sillytavern/scripts/power-user';
import { uuidv4 } from '@sillytavern/scripts/utils';

export const defaultScriptSettings = {
  script_enabled: true,
  global_script_enabled: true,
  scope_script_enabled: true,
  scriptsRepository: [],
};

// FIXME: 修改为动态获取
const extensionFolderPath = `third-party/JS-Slash-Runner`;

const baseTemplate = $(
  await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_item_template', {
    scriptName: '',
    id: '',
    moveTo: '',
    faIcon: '',
  }),
);

let isScriptEnabled: boolean;

interface Script {
  id: string;
  name: string;
  content: string;
  info: string;
  enabled: boolean;
}

/**
 * 打开脚本编辑器
 */
async function onScriptEditorOpenClick(type: 'global' | 'scope' = 'global', scriptId: string | null = null) {
  const $editorHtml = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_editor'));
  if (scriptId) {
    let script: Script | undefined;
    if (type === 'global') {
      script = getSettingValue('script.scriptsRepository').find((s: Script) => s.id === scriptId);
    } else {
      script = characters[this_chid]?.data?.extensions?.TavernHelper_scripts.find(
        (s: Script) => s.id === scriptId,
      );
    }

    if (script) {
      $editorHtml.find('#script-name-input').val(script.name);
      $editorHtml.find('#script-content-textarea').val(script.content);
      $editorHtml.find('#script-info-textarea').val(script.info);
    }
  }
  const popupResult = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
    okButton: '确认',
    cancelButton: '取消',
  });
  if (popupResult) {
    const scriptName = $editorHtml.find('#script-name-input').val() as string;
    const scriptContent = $editorHtml.find('#script-content-textarea').val() as string;
    const scriptInfo = $editorHtml.find('#script-info-textarea').val() as string;
    if (scriptId === null) {
      const script: Script = {
        id: uuidv4(),
        name: scriptName,
        content: scriptContent,
        info: scriptInfo,
        enabled: false,
      };
      await saveScript(script, true, 'global');
    }
  }
}

/**
 * 保存脚本
 */
async function saveScript(script: Script, isNew: boolean = false, type: 'global' | 'scope' = 'global') {
  if (!script.name) {
    toastr.error('保存失败，脚本名称为空');
    return;
  }
  if (isNew) {
    if (type === 'global') {
      const scriptHtml = await cloneTemplate(script, 'global');
      $('#global-script-list').prepend(scriptHtml);

      const scriptArray = getSettingValue('script.scriptsRepository');
      scriptArray.unshift(script);
      await saveScriptToExtensionData(scriptArray);
    } else {
      if (this_chid) {
        const scriptHtml = await cloneTemplate(script, 'scope');
        $('#scoped-script-list').prepend(scriptHtml);

        const scriptArray = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
        scriptArray.unshift(script);
        await saveScriptToCharacterCard(scriptArray);
      } else {
        toastr.error('保存失败，当前角色为空');
      }
    }
  }
}

/**
 * 保存脚本到扩展数据
 *  @param script 脚本内容
 * */
async function saveScriptToExtensionData(scriptArray: Script[]) {
  await saveSettingValue('script.scriptsRepository', scriptArray);
}

/**
 * 保存脚本到角色卡
 *  @param script 脚本内容
 * */
async function saveScriptToCharacterCard(scriptArray: Script[]) {
  if (this_chid) {
    await writeExtensionField(this_chid, 'TavernHelper_scripts', scriptArray);
  } else {
    toastr.error('保存失败，当前角色为空');
  }
}

/**
 * 删除脚本
 *  @param id 脚本id
 */

async function deleteScript(id: string) {
  const $scriptItem = $(`#${id}`);
  const isScoped = $scriptItem.find('.script-storage-location').hasClass('move-to-scoped') ? false : true;
  const array =
    (isScoped
      ? characters[this_chid]?.data?.extensions?.TavernHelper_scripts
      : getSettingValue('script.scriptsRepository')) ?? [];

  const existingScriptIndex = array.findIndex((script: Script) => script.id === id);
  if (!existingScriptIndex || existingScriptIndex !== -1) {
    array.splice(existingScriptIndex, 1);

    if (isScoped) {
      await saveScriptToCharacterCard(array);
    } else {
      await saveScriptToExtensionData(array);
    }

    await loadScriptLibrary();
  }

  $scriptItem.remove();
}

/** 加载脚本库
 *
 */
export async function loadScriptLibrary() {
  $('#global-script-list').empty();
  $('#scoped-script-list').empty();

  const globalScriptArray = getSettingValue('script.scriptsRepository') ?? [];
  const scopedScriptArray = characters[this_chid]?.data?.extensions?.TavernHelper_scripts ?? [];

  if (globalScriptArray.length > 0) {
    globalScriptArray.forEach(async (script: Script) => {
      const scriptHtml = await cloneTemplate(script, 'global');
      $('#global-script-list').prepend(scriptHtml);
    });
  }
  if (scopedScriptArray.length > 0) {
    scopedScriptArray.forEach(async (script: Script) => {
      const scriptHtml = await cloneTemplate(script, 'scope');
      $('#scoped-script-list').prepend(scriptHtml);
    });
  }
}

/**
 * 克隆模板
 * @param script 脚本
 * @param type 类型,global 全局,scope 局部
 */
export async function cloneTemplate(script: Script, type: 'global' | 'scope') {
  const scriptHtml = baseTemplate.clone();

  scriptHtml.attr('id', script.id);

  scriptHtml.find('.script-item-name').text(script.name);
  scriptHtml.find('.script-storage-location').addClass(type === 'global' ? 'move-to-scoped' : 'move-to-global');
  scriptHtml.find('.script-storage-location i').addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

  scriptHtml.find('.edit-script').on('click', () => onScriptEditorOpenClick(type, script.id));
  scriptHtml.find('.delete-script').on('click', async () => {
    const confirm = await callGenericPopup('确定要删除这个脚本吗？', POPUP_TYPE.CONFIRM);

    if (!confirm) {
      return;
    }

    await deleteScript(script.id);
  });
  return scriptHtml;
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

export async function initScriptRepository() {
  $('#open-global-script-editor').on('click', () => onScriptEditorOpenClick('global', null));
  $('#open-scoped-script-editor').on('click', () => onScriptEditorOpenClick('scope', null));
  loadScriptLibrary();
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
