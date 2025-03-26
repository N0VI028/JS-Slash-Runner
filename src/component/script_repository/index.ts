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
import { getFileText, getSortableDelay, uuidv4, download } from '@sillytavern/scripts/utils';

export const defaultScriptSettings = {
  global_script_enabled: true,
  scope_script_enabled: true,
  scriptsRepository: [] as Script[],
  characters_with_scripts: [] as string[],
};

const templatePath = `${extensionFolderPath}/src/component/script_repository`;
const baseTemplate = $(
  await renderExtensionTemplateAsync(`${templatePath}`, 'script_item_template', {
    scriptName: '',
    id: '',
    moveTo: '',
    faIcon: '',
  }),
);

let isGlobalScriptEnabled: boolean;
let isScopedScriptEnabled: boolean;

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

  hasName(): boolean {
    return Boolean(this.name);
  }
  getScript(): Script {
    return getSettingValue('script.scriptsRepository').find((s: Script) => s.id === this.id);
  }
}

enum ScriptType {
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

  /**
   * 脚本库原始数据
   */
  async loadScripts() {
    this.globalScripts = getSettingValue('script.scriptsRepository') || [];
    this.characterScripts = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
  }

  /**
   * 添加单个脚本到脚本库首位
   * @param script 脚本
   * @param type 脚本类型
   */
  async addScript(script: Script, type: ScriptType) {
    if (!script.hasName()) {
      toastr.error('保存失败，脚本名称为空');
    }

    if (type === ScriptType.GLOBAL) {
      this.globalScripts.unshift(script);
      await scriptRepo.saveGlobalScripts(this.globalScripts);
    } else {
      if (!this_chid) {
        toastr.error('保存失败，当前角色为空');
      }
      this.characterScripts.unshift(script);
      await scriptRepo.saveCharacterScripts(this.characterScripts);
    }

    await scriptRepo.renderScript(script, type);
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
        const scriptHtml = await cloneTemplate(script, ScriptType.GLOBAL);
        $('#global-script-list').append(scriptHtml);
      });
    }
    if (scopedScriptArray.length > 0) {
      const scopedScripts = scopedScriptArray.map((scriptData: Script) => new Script(scriptData));
      scopedScripts.forEach(async (script: Script) => {
        const scriptHtml = await cloneTemplate(script, ScriptType.CHARACTER);
        $('#scoped-script-list').append(scriptHtml);
      });
    }
    scriptRepo.makeDraggable($(`#global-script-list`), ScriptType.GLOBAL);
    scriptRepo.makeDraggable($(`#scoped-script-list`), ScriptType.CHARACTER);
  }

  /**
   * 运行指定类型的脚本
   * @param type 脚本类型
   */
  async runScriptsByType(type: ScriptType) {
    if (!getSettingValue('enabled_extension')) {
      toastr.error('酒馆助手未启用，无法运行脚本');
      return;
    }
    if (type === ScriptType.GLOBAL && !isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !isScopedScriptEnabled) {
      return;
    }

    const scripts = type === ScriptType.GLOBAL ? this.globalScripts : this.characterScripts;
    const enabledScripts = scripts.map((script, index) => ({ script, index })).filter(({ script }) => script.enabled);

    for (const { script } of enabledScripts) {
      // 不要保存设置
      await scriptRepo.runScript(script, type, false);
    }
  }

  /**
   * 取消运行指定类型的脚本
   * @param type 脚本类型
   */
  async cancelRunScriptsByType(type: ScriptType) {
    const scripts = type === ScriptType.GLOBAL ? this.globalScripts : this.characterScripts;
    const disabledScripts = scripts.map((script, index) => ({ script, index })).filter(({ script }) => !script.enabled);

    for (const { script } of disabledScripts) {
      // 不要保存设置
      await scriptRepo.cancelRunScript(script, type, false);
    }
  }

  /**
   * 运行单个脚本
   * @param script 脚本
   */
  async runScript(script: Script, type: ScriptType, userInput: boolean = true) {
    if (!getSettingValue('enabled_extension')) {
      toastr.error('扩展未启用');
      return;
    }

    const index = script.id.startsWith('global')
      ? this.globalScripts.findIndex(s => s.id === script.id)
      : this.characterScripts.findIndex(s => s.id === script.id);
    if (index !== -1) {
      if (userInput) {
        script.enabled = true;
        await scriptRepo.saveScript(script, type);
      }
    }

    if (type === ScriptType.GLOBAL && !isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !isScopedScriptEnabled) {
      return;
    }
    //TODO: 运行脚本逻辑
  }

  /**
   * 取消运行单个脚本
   * @param script 脚本
   */
  async cancelRunScript(script: Script, type: ScriptType, userInput: boolean = true) {
    const index = script.id.startsWith('global')
      ? this.globalScripts.findIndex(s => s.id === script.id)
      : this.characterScripts.findIndex(s => s.id === script.id);
    if (index !== -1) {
      if (userInput) {
        script.enabled = false;
        await scriptRepo.saveScript(script, type);
      }
    }
    //TODO: 取消运行脚本逻辑
  }

  /**
   * 渲染单个脚本到界面
   * @param script 脚本
   * @param type 类型
   */
  async renderScript(script: Script, type: ScriptType) {
    const scriptHtml = await cloneTemplate(script, type);
    if (type === ScriptType.GLOBAL) {
      $('#global-script-list').prepend(scriptHtml);
    } else {
      $('#scoped-script-list').prepend(scriptHtml);
    }
  }

  /**
   * 打开脚本编辑器
   * @param type 类型
   * @param scriptId 脚本ID
   */
  async openScriptEditor(type: ScriptType, scriptId?: string) {
    const $editorHtml = $(await renderExtensionTemplateAsync(`${templatePath}`, 'script_editor'));

    let script: Script | undefined;
    if (scriptId) {
      if (type === ScriptType.GLOBAL) {
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

      if (scriptId && script) {
        script.name = scriptName;
        script.content = scriptContent;
        script.info = scriptInfo;
        await scriptRepo.saveScript(script, type);
      } else {
        const newScript = new Script({
          id: uuidv4(),
          name: scriptName,
          content: scriptContent,
          info: scriptInfo,
          enabled: false,
        });
        await scriptRepo.addScript(newScript, type);
      }
    }
  }

  /**
   * 删除脚本
   * @param id 脚本ID
   * @param type 类型
   */
  async deleteScript(id: string, type: ScriptType): Promise<void> {
    try {
      const array =
        type === ScriptType.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      const existingScriptIndex = array.findIndex((script: Script) => script.id === id);
      if (existingScriptIndex !== -1) {
        array.splice(existingScriptIndex, 1);

        if (type === ScriptType.GLOBAL) {
          $('#global-script-list').find(`#${id}`).remove();
          await this.saveGlobalScripts(array);
        } else {
          $('#scoped-script-list').find(`#${id}`).remove();
          await this.saveCharacterScripts(array);
        }
      } else {
        throw new Error('[ScriptRepository] 脚本不存在');
      }
    } catch (error) {
      console.error('[ScriptRepository] 删除脚本时发生错误:', error);
      throw error;
    }
  }

  /**
   * 保存单个脚本
   * @param script 脚本
   * @param index 脚本在列表中的索引
   */
  async saveScript(script: Script, type: ScriptType) {
    const array =
      type === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    const index = array.findIndex((s: Script) => s.id === script.id);
    if (index === -1) {
      array.push(script);
    } else {
      array[index] = script;
    }
    if (type === ScriptType.GLOBAL) {
      await saveSettingValue('script.scriptsRepository', array);
    } else {
      await this.saveCharacterScripts(array);
    }
  }

  /**
   * 保存到扩展数据
   * @param array 脚本数组
   */
  async saveGlobalScripts(array: Script[]) {
    await saveSettingValue('script.scriptsRepository', array);
  }

  /**
   * 保存到角色卡数据
   * @param array 脚本数组
   */
  async saveCharacterScripts(array: Script[]) {
    if (this_chid) {
      await writeExtensionField(this_chid, 'TavernHelper_scripts', array);
    } else {
      toastr.error('保存失败，当前角色为空');
    }
  }
  /**
   * 使脚本库可拖拽调整顺序
   * @param list 脚本库列表
   * @param type 脚本类型
   */
  makeDraggable(list: JQuery<HTMLElement>, type: ScriptType) {
    list.sortable({
      delay: getSortableDelay(),
      handle: '.drag-handle',
      items: '.script-item',
      stop: async () => {
        const newOrder: string[] = [];

        list.find('> .script-item').each(function () {
          const id = $(this).attr('id');
          if (id) {
            newOrder.push(id);
          }
        });

        const array =
          type === ScriptType.GLOBAL
            ? getSettingValue('script.scriptsRepository') || []
            : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

        const updatedScripts = newOrder
          .map(id => {
            return array.find((script: Script) => script.id === id);
          })
          .filter(Boolean);

        if (type === ScriptType.GLOBAL) {
          await this.saveGlobalScripts(updatedScripts);
        } else {
          await this.saveCharacterScripts(updatedScripts);
        }
      },
    });
  }
  /**
   * 移动到另一类仓库
   */
  async moveScriptToOtherType(script: Script, type: ScriptType) {
    try {
      const sourceArray =
        type === ScriptType.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      const sourceIndex = sourceArray.findIndex((s: Script) => s.id === script.id);
      if (sourceIndex !== -1) {
        sourceArray.splice(sourceIndex, 1);

        if (type === ScriptType.GLOBAL) {
          await this.saveGlobalScripts(sourceArray);
          $('#global-script-list').find(`#${script.id}`).remove();
        } else {
          await this.saveCharacterScripts(sourceArray);
          $('#scoped-script-list').find(`#${script.id}`).remove();
        }

        const targetType = type === ScriptType.GLOBAL ? ScriptType.CHARACTER : ScriptType.GLOBAL;
        const targetArray =
          targetType === ScriptType.GLOBAL
            ? getSettingValue('script.scriptsRepository') || []
            : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

        targetArray.unshift(script);

        if (targetType === ScriptType.GLOBAL) {
          await scriptRepo.saveGlobalScripts(targetArray);
          await scriptRepo.renderScript(script, targetType);
        } else {
          await scriptRepo.saveCharacterScripts(targetArray);
          await scriptRepo.renderScript(script, targetType);
        }
      } else {
        throw new Error('[ScriptRepository] 脚本不存在');
      }
    } catch (error) {
      console.error('[ScriptRepository] 移动脚本时发生错误:', error);
      toastr.error('移动脚本失败');
      throw error;
    }
  }
}

export const scriptRepo = ScriptRepository.getInstance();

/**
 * 克隆模板
 * @param script 脚本
 * @param type 类型,global 全局,scope 局部
 */
export async function cloneTemplate(script: Script, type: ScriptType.GLOBAL | ScriptType.CHARACTER) {
  const scriptHtml = baseTemplate.clone();

  scriptHtml.attr('id', script.id);

  scriptHtml.find('.script-item-name').text(script.name);
  scriptHtml.find('.script-storage-location').addClass(type === 'global' ? 'move-to-scoped' : 'move-to-global');
  scriptHtml.find('.script-storage-location i').addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

  const toggleId = `toggle-script-${script.id}`;
  scriptHtml.find('label').attr('for', toggleId);

  scriptHtml
    .find('.toggle-script')
    .attr('id', toggleId)
    .prop('checked', script.enabled)
    .on('change', async function () {
      const isChecked = !!$(this).prop('checked');

      scriptHtml.find('.script-toggle-on').toggle(isChecked);
      scriptHtml.find('.script-toggle-off').toggle(!isChecked);
      script.enabled = isChecked;
      await scriptRepo.saveScript(script, type);
      // 不需要再保存一次
      if (isChecked) {
        await scriptRepo.runScript(script, type, false);
      }
    });

  scriptHtml
    .find('.script-toggle-on')
    .toggle(script.enabled)
    .on('click', async function () {
      $(this).hide();
      scriptHtml.find('.script-toggle-off').show();
    });

  scriptHtml
    .find('.script-toggle-off')
    .toggle(!script.enabled)
    .on('click', async function () {
      $(this).hide();
      scriptHtml.find('.script-toggle-on').show();
    });

  scriptHtml.find('.script-info').on('click', async function () {
    const info = script.getScript().info;
    await callGenericPopup(info, POPUP_TYPE.DISPLAY);
  });

  scriptHtml.find('.edit-script').on('click', () => scriptRepo.openScriptEditor(type, script.id));
  scriptHtml.find('.script-storage-location').on('click', () => scriptRepo.moveScriptToOtherType(script, type));
  scriptHtml.find('.export-script').on('click', async function () {
    // eslint-disable-next-line no-control-regex
    const fileName = `${script.name.replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, '_').toLowerCase()}.json`;
    const { id, enabled, ...scriptData } = script;
    const fileData = JSON.stringify(scriptData, null, 4);
    download(fileData, fileName, 'application/json');
  });
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
 * 处理脚本启用开关的点击事件
 * @param type 类型,global 全局,scope 局部
 * @param enable 是否启用
 * @param userInput 是否由用户输入
 */
async function handleScriptToggle(type: ScriptType, enable: boolean, userInput: boolean = true) {
  if (type === ScriptType.GLOBAL) {
    if (userInput) {
      await saveSettingValue('script.global_script_enabled', enable);
    }
    isGlobalScriptEnabled = enable;
    if (enable) {
      scriptRepo.runScriptsByType(ScriptType.GLOBAL);
    } else {
      scriptRepo.cancelRunScriptsByType(ScriptType.GLOBAL);
    }
  } else {
    if (userInput) {
      await saveSettingValue('script.scope_script_enabled', enable);
    }
    isScopedScriptEnabled = enable;
    if (enable) {
      scriptRepo.runScriptsByType(ScriptType.CHARACTER);
    } else {
      scriptRepo.cancelRunScriptsByType(ScriptType.CHARACTER);
    }
  }
}

/**
 * 导入脚本文件
 * @param {File} file 文件
 * @param {boolean} type 脚本类型
 */
async function onScriptImportFileChange(file: File, type: ScriptType) {
  if (!file) {
    toastr.error('未提供文件。');
    return;
  }

  try {
    const fileText = await getFileText(file);
    const script = JSON.parse(fileText);
    if (!script.name) {
      throw new Error('未提供脚本名称。');
    }

    const newScript = new Script(script);
    // 分配一个新的id
    newScript.id = uuidv4();
    newScript.enabled = false;

    await scriptRepo.saveScript(newScript, type);
    await scriptRepo.renderScript(newScript, type);
    toastr.success(`脚本 "${newScript.name}" 导入成功。`);
  } catch (error) {
    console.log(error);
    toastr.error('无效的JSON文件。');
    return;
  }
}

/**
 * 从脚本允许列表中删除角色
 * @param param0
 */

export async function purgeEmbeddedScripts({ character }) {
  const avatar = character?.avatar;
  const charactersWithScripts = getSettingValue('script.characters_with_scripts');
  if (avatar && charactersWithScripts?.includes(avatar)) {
    const index = charactersWithScripts.indexOf(avatar);
    if (index !== -1) {
      charactersWithScripts.splice(index, 1);
      await saveSettingValue('script.characters_with_scripts', charactersWithScripts);
    }
  }
}

/**
 * 检查角色中的嵌入式脚本
 */
export async function checkEmbeddedScripts() {
  const chid = this_chid;

  if (chid !== undefined && !selected_group) {
    const avatar = characters[chid]?.avatar;
    const scripts = characters[chid]?.data?.extensions?.TavernHelper_scripts;

    if (Array.isArray(scripts) && scripts.length > 0) {
      const charactersWithScripts = getSettingValue('script.characters_with_scripts');
      if (avatar && !charactersWithScripts.includes(avatar)) {
        const characterScripts = characters[chid]?.data?.extensions?.TavernHelper_scripts;
        if (Array.isArray(characterScripts) && characterScripts.length > 0) {
          const scopedScripts = characterScripts.map((scriptData: Script) => new Script(scriptData));
          scopedScripts.forEach(async (script: Script) => {
            const scriptHtml = await cloneTemplate(script, ScriptType.CHARACTER);
            $('#scoped-script-list').append(scriptHtml);
          });

          const template = await renderExtensionTemplateAsync(`${templatePath}`, 'script_allow_popup');
          const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', { okButton: 'Yes' });

          if (result) {
            $('#scoped-script-list')
              .find('.toggle-script')
              .each(function () {
                $(this).prop('checked', !$(this).prop('checked')).trigger('change');
              });
          }
          charactersWithScripts.push(avatar);
          await saveSettingValue('script.characters_with_scripts', charactersWithScripts);
        }
      }
    }
  }
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
  isGlobalScriptEnabled = getSettingValue('script.global_script_enabled');
  isScopedScriptEnabled = getSettingValue('script.scope_script_enabled');

  handleScriptToggle(ScriptType.GLOBAL, isGlobalScriptEnabled, false);
  handleScriptToggle(ScriptType.CHARACTER, isScopedScriptEnabled, false);

  $('#global-script-enable-toggle')
    .prop('checked', isGlobalScriptEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleScriptToggle(ScriptType.GLOBAL, event.target.checked, true));
  $('#scoped-script-enable-toggle')
    .prop('checked', isScopedScriptEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleScriptToggle(ScriptType.CHARACTER, event.target.checked, true));

  $('#open-global-script-editor').on('click', () => scriptRepo.openScriptEditor(ScriptType.GLOBAL, undefined));
  $('#open-scoped-script-editor').on('click', () => scriptRepo.openScriptEditor(ScriptType.CHARACTER, undefined));

  scriptRepo.loadScriptLibrary();

  $('#import-script-file').on('change', async function () {
    let target = 'global';
    const template = $(await renderExtensionTemplateAsync(`${templatePath}`, 'script_import_target'));
    template.find('#script-import-target-global').on('input', () => (target = 'global'));
    template.find('#script-import-target-scoped').on('input', () => (target = 'scoped'));
    await callGenericPopup(template, POPUP_TYPE.TEXT);
    const inputElement = this instanceof HTMLInputElement && this;
    if (inputElement && inputElement.files) {
      for (const file of inputElement.files) {
        await onScriptImportFileChange(file, target === 'global' ? ScriptType.GLOBAL : ScriptType.CHARACTER);
      }

      inputElement.value = '';
    }
  });

  $('#import-script').on('click', function () {
    $('#import-script-file').trigger('click');
  });

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
