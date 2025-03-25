import { extensionFolderPath, extensionName, getSettingValue, saveSettingValue } from '@/util/extension_variables';

import {
  characters,
  eventSource,
  event_types,
  reloadCurrentChat,
  saveSettingsDebounced,
  this_chid,
} from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync, writeExtensionField } from '@sillytavern/scripts/extensions';
//@ts-ignore
import { selected_group } from '@sillytavern/scripts/group-chats';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import { power_user } from '@sillytavern/scripts/power-user';
import { getSortableDelay, uuidv4 } from '@sillytavern/scripts/utils';

export const defaultScriptSettings = {
  script_enabled: true,
  global_script_enabled: true,
  scope_script_enabled: true,
  scriptsRepository: [],
};

const baseTemplate = $(
  await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_item_template', {
    scriptName: '',
    id: '',
    moveTo: '',
    faIcon: '',
  }),
);

let isScriptEnabled: boolean;

class Script {
  id: string;
  name: string;
  content: string;
  info: string;
  enabled: boolean;

  constructor(data?: Partial<Script>) {
    this.id = data?.id || uuidv4();
    this.name = data?.name || '';
    this.content = data?.content || '';
    this.info = data?.info || '';
    this.enabled = data?.enabled || false;
  }

  // 验证方法
  hasName(): boolean {
    return Boolean(this.name);
  }
  // 删除脚本
  async deleteScript(id: string, scope: ScriptScope): Promise<void> {
    try {
      const array =
        scope === ScriptScope.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      const existingScriptIndex = array.findIndex((script: Script) => script.id === id);
      if (existingScriptIndex !== -1) {
        array.splice(existingScriptIndex, 1);

        if (scope === ScriptScope.GLOBAL) {
          await scriptRepo.saveGlobalScripts(array);
        } else {
          await scriptRepo.saveCharacterScripts(array);
        }
        await scriptRepo.loadScriptLibrary();
      } else {
        throw new Error('[ScriptRepository] 脚本不存在');
      }
    } catch (error) {
      console.error('[ScriptRepository] 删除脚本时发生错误:', error);
      throw error;
    }
  }
}

enum ScriptScope {
  GLOBAL = 'global',
  CHARACTER = 'scope',
}

class ScriptRepository {
  private static instance: ScriptRepository;
  private globalScripts: Script[] = [];
  private characterScripts: Script[] = [];

  private constructor() {
    this.loadScripts();
  }

  public static getInstance(): ScriptRepository {
    if (!ScriptRepository.instance) {
      ScriptRepository.instance = new ScriptRepository();
    }
    return ScriptRepository.instance;
  }

  // 加载脚本
  async loadScripts() {
    this.globalScripts = getSettingValue('script.scriptsRepository') || [];
    this.characterScripts = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
  }

  // 添加脚本
  async addScript(script: Script, scope: ScriptScope): Promise<boolean> {
    if (!script.hasName()) {
      toastr.error('保存失败，脚本名称为空');
      return false;
    }

    if (scope === ScriptScope.GLOBAL) {
      this.globalScripts.unshift(script);
      await this.saveGlobalScripts(this.globalScripts);
    } else {
      if (!this_chid) {
        toastr.error('保存失败，当前角色为空');
        return false;
      }
      this.characterScripts.unshift(script);
      await this.saveCharacterScripts(this.characterScripts);
    }

    await this.renderScript(script, scope);
    return true;
  }

  // 加载脚本库
  async loadScriptLibrary() {
    $('#global-script-list').empty();
    $('#scoped-script-list').empty();

    const globalScriptArray = getSettingValue('script.scriptsRepository') ?? [];
    const scopedScriptArray = characters[this_chid]?.data?.extensions?.TavernHelper_scripts ?? [];

    if (globalScriptArray.length > 0) {
      const globalScripts = globalScriptArray.map((scriptData: Script) => new Script(scriptData));
      globalScripts.forEach(async (script: Script) => {
        const scriptHtml = await cloneTemplate(script, ScriptScope.GLOBAL);
        $('#global-script-list').prepend(scriptHtml);
      });
    }
    if (scopedScriptArray.length > 0) {
      const scopedScripts = scopedScriptArray.map((scriptData: Script) => new Script(scriptData));
      scopedScripts.forEach(async (script: Script) => {
        const scriptHtml = await cloneTemplate(script, ScriptScope.CHARACTER);
        $('#scoped-script-list').prepend(scriptHtml);
        const list = $(`#scoped-script-list`);
        scriptRepo.makeDraggable(list, ScriptScope.CHARACTER);
      });
    }
    scriptRepo.makeDraggable($(`#global-script-list`), ScriptScope.GLOBAL);
    scriptRepo.makeDraggable($(`#scoped-script-list`), ScriptScope.CHARACTER);
  }

  // 渲染单个脚本到界面
  async renderScript(script: Script, scope: ScriptScope) {
    const scriptHtml = await cloneTemplate(script, scope);
    if (scope === ScriptScope.GLOBAL) {
      $('#global-script-list').prepend(scriptHtml);
    } else {
      $('#scoped-script-list').prepend(scriptHtml);
    }
  }

  // 打开脚本编辑器
  async openScriptEditor(scope: ScriptScope, scriptId?: string) {
    const $editorHtml = $(await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'script_editor'));
    if (scriptId) {
      let script: Script | undefined;
      if (scope === ScriptScope.GLOBAL) {
        script = getSettingValue('script.scriptsRepository').find((s: Script) => s.id === scriptId);
      } else {
        script = characters[this_chid]?.data?.extensions?.TavernHelper_scripts.find((s: Script) => s.id === scriptId);
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
        const script = new Script({
          id: uuidv4(),
          name: scriptName,
          content: scriptContent,
          info: scriptInfo,
          enabled: false,
        });
        await scriptRepo.addScript(script, ScriptScope.GLOBAL);
      }
    }
  }

  // 删除脚本
  async deleteScript(id: string, scope: ScriptScope): Promise<void> {
    try {
      const array =
        scope === ScriptScope.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      const existingScriptIndex = array.findIndex((script: Script) => script.id === id);
      if (existingScriptIndex !== -1) {
        array.splice(existingScriptIndex, 1);

        if (scope === ScriptScope.GLOBAL) {
          await this.saveGlobalScripts(array);
        } else {
          await this.saveCharacterScripts(array);
        }
        await scriptRepo.loadScriptLibrary();
      } else {
        throw new Error('[ScriptRepository] 脚本不存在');
      }
    } catch (error) {
      console.error('[ScriptRepository] 删除脚本时发生错误:', error);
      throw error;
    }
  }

  // 保存到扩展数据
  async saveGlobalScripts(array: Script[]) {
    await saveSettingValue('script.scriptsRepository', array);
  }

  // 保存到角色卡数据
  async saveCharacterScripts(array: Script[]) {
    if (this_chid) {
      await writeExtensionField(this_chid, 'TavernHelper_scripts', array);
    } else {
      toastr.error('保存失败，当前角色为空');
    }
  }

  makeDraggable(list: JQuery<HTMLElement>, scope: ScriptScope) {
    list.sortable({
      delay: getSortableDelay(),
      handle: '.drag-handle',
      items: '.script-item',
      stop: async () => {
        const newOrder: string[] = [];

        // 获取所有直系子元素并提取它们的ID
        list.find('> .script-item').each(function () {
          const id = $(this).attr('id');
          if (id) {
            newOrder.push(id);
          }
        });

        const array =
          scope === 'global'
            ? getSettingValue('script.scriptsRepository') || []
            : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

        const updatedScripts = newOrder
          .map(id => {
            return array.find((script: Script) => script.id === id);
          })
          .filter(Boolean);

        if (scope === 'global') {
          await this.saveGlobalScripts(updatedScripts);
        } else {
          await this.saveCharacterScripts(updatedScripts);
        }
      },
    });
  }
}
const scriptRepo = ScriptRepository.getInstance();

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
      const scriptHtml = await cloneTemplate(script, ScriptScope.GLOBAL);
      $('#global-script-list').prepend(scriptHtml);

      const scriptArray = getSettingValue('script.scriptsRepository') || [];
      scriptArray.unshift(script);
      await scriptRepo.saveGlobalScripts(scriptArray);
    } else if (this_chid) {
      const scriptHtml = await cloneTemplate(script, ScriptScope.CHARACTER);
      $('#scoped-script-list').prepend(scriptHtml);

      const scriptArray = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
      scriptArray.unshift(script);
      await scriptRepo.saveCharacterScripts(scriptArray);
    } else {
      toastr.error('保存失败，当前角色为空');
    }
  }
}
/**
 * 克隆模板
 * @param script 脚本
 * @param type 类型,global 全局,scope 局部
 */
export async function cloneTemplate(script: Script, type: ScriptScope.GLOBAL | ScriptScope.CHARACTER) {
  const scriptHtml = baseTemplate.clone();

  scriptHtml.attr('id', script.id);

  scriptHtml.find('.script-item-name').text(script.name);
  scriptHtml.find('.script-storage-location').addClass(type === 'global' ? 'move-to-scoped' : 'move-to-global');
  scriptHtml.find('.script-storage-location i').addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

  scriptHtml.find('.edit-script').on('click', () => scriptRepo.openScriptEditor(type, script.id));
  scriptHtml.find('.delete-script').on('click', async () => {
    const confirm = await callGenericPopup('确定要删除这个脚本吗？', POPUP_TYPE.CONFIRM);

    if (!confirm) {
      return;
    }

    await scriptRepo.deleteScript(script.id, type);

    scriptHtml.remove();
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
  $('#open-global-script-editor').on('click', () => scriptRepo.openScriptEditor('global', null));
  $('#open-scoped-script-editor').on('click', () => scriptRepo.openScriptEditor('scope', null));
  scriptRepo.loadScriptLibrary();
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
