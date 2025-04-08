import { libraries_text } from '@/component/character_level/library';
import { destroyIframe } from '@/component/message_iframe';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import { extensionFolderPath, getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { renderMarkdown } from '@/util/render_markdown';
import { characters, eventSource, this_chid } from '@sillytavern/script';
import { renderExtensionTemplateAsync, writeExtensionField } from '@sillytavern/scripts/extensions';
import { createDefaultScripts } from './default_scripts/index';
//@ts-ignore
import { selected_group } from '@sillytavern/scripts/group-chats';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import { download, getFileText, getSortableDelay, uuidv4 } from '@sillytavern/scripts/utils';

interface IFrameElement extends HTMLIFrameElement {
  cleanup: () => void;
  [prop: string]: any;
}

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

const defaultScriptTemplate = $(
  await renderExtensionTemplateAsync(`${templatePath}`, 'script_default_repository', {
    scriptName: '',
    id: '',
  }),
);

let isGlobalScriptEnabled: boolean;
let isScopedScriptEnabled: boolean;

class Script {
  id: string;
  name: string;
  content: string;
  info: string;
  buttons: { name: string; visible: boolean }[];
  enabled: boolean;

  constructor(data?: Partial<Script>) {
    this.id = data?.id || uuidv4();
    this.name = data?.name || '';
    this.content = data?.content || '';
    this.info = data?.info || '';
    this.enabled = data?.enabled || false;
    this.buttons = data?.buttons || [];
  }

  hasName(): boolean {
    return Boolean(this.name);
  }
}

export enum ScriptType {
  GLOBAL = 'global',
  CHARACTER = 'scope',
}

export class ScriptRepository {
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

  public static destroyInstance(): void {
    if (ScriptRepository.instance) {
      ScriptRepository.instance = undefined as unknown as ScriptRepository;
    }
  }

  /**
   * 脚本库原始数据
   */
  async loadScripts() {
    this.globalScripts = getSettingValue('script.scriptsRepository') || [];
    this.characterScripts = characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
  }

  /**
   * 获取脚本
   * @param id 脚本id
   * @returns 脚本
   */
  getScriptById(id: string) {
    return (
      this.globalScripts.find((s: Script) => s.id === id) || this.characterScripts.find((s: Script) => s.id === id)
    );
  }

  /**
   * 添加单个脚本到脚本库UI首位并保存到设置中
   * @param script 脚本
   * @param type 脚本类型
   */
  async addScript(script: Script, type: ScriptType) {
    if (!script.hasName()) {
      toastr.error('保存失败，脚本名称为空');
    }
    await this.saveScript(script, type);
    await this.renderScript(script, type);
  }

  /**
   * 加载脚本库到界面
   */
  async loadScriptLibrary() {
    $('#global-script-list').empty();
    $('#scoped-script-list').empty();

    const $emptyTip = `<small>暂无可用脚本</small>`;
    const globalScriptArray = getSettingValue('script.scriptsRepository') ?? [];
    const scopedScriptArray = characters[this_chid]?.data?.extensions?.TavernHelper_scripts ?? [];

    if (globalScriptArray.length > 0) {
      const globalScripts = globalScriptArray.map((scriptData: Script) => new Script(scriptData));
      globalScripts.forEach(async (script: Script) => {
        const scriptHtml = await this.cloneTemplate(script, ScriptType.GLOBAL);
        $('#global-script-list').append(scriptHtml);
      });
    } else {
      $('#global-script-list').append($emptyTip);
    }
    if (scopedScriptArray.length > 0) {
      const scopedScripts = scopedScriptArray.map((scriptData: Script) => new Script(scriptData));
      scopedScripts.forEach(async (script: Script) => {
        const scriptHtml = await this.cloneTemplate(script, ScriptType.CHARACTER);
        $('#scoped-script-list').append(scriptHtml);
      });
    } else {
      $('#scoped-script-list').append($emptyTip);
    }
    this.makeDraggable($(`#global-script-list`), ScriptType.GLOBAL);
    this.makeDraggable($(`#scoped-script-list`), ScriptType.CHARACTER);
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
      await this.runScript(script, type, false);
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
      await this.cancelRunScript(script, type, false);
    }
  }

  /**
   * 运行单个脚本
   * @param script 脚本
   * @param type 脚本类型
   * @param userInput 是否由用户输入,为true时,会设置enabled为true,并保存设置
   */
  async runScript(script: Script, type: ScriptType, userInput: boolean = true) {
    if (!getSettingValue('enabled_extension')) {
      toastr.error('扩展未启用');
      return;
    }
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';
    const index = script.id.startsWith('global')
      ? this.globalScripts.findIndex(s => s.id === script.id)
      : this.characterScripts.findIndex(s => s.id === script.id);
    if (index !== -1) {
      if (userInput) {
        script.enabled = true;
        await this.saveScript(script, type);
      }
    }

    if (type === ScriptType.GLOBAL && !isGlobalScriptEnabled) {
      return;
    }
    if (type === ScriptType.CHARACTER && !isScopedScriptEnabled) {
      return;
    }

    try {
      const existingIframe = $(`#tavern-helper-script-${script.id}`)[0] as IFrameElement;
      if (existingIframe) {
        await this.cancelRunScript(script, type, false);
      }

      const htmlContent = `
        <html>
        <head>
          ${third_party}
          ${libraries_text}
          <script>
            (function($) {
              var original$ = $;
              window.$ = function(selector, context){
                context = context || window.parent.document;
                return original$(selector, context);
              }
            })(jQuery);
            SillyTavern = window.parent.SillyTavern.getContext();
            TavernHelper = window.parent.TavernHelper;
            for (const key in TavernHelper) {
              window[key] = TavernHelper[key];
            }
          </script>
          <script src="${script_url.get('iframe_client')}"></script>
        </head>
        <body>
          <script type="module">
            $(async () => {
              try {
                ${script.content}
              } catch (error) {
                console.error('脚本执行错误:', error);
              }
            });
          </script>
        </body>
        </html>
      `;

      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      const $iframe = $('<iframe>', {
        style: 'display: none;',
        id: `tavern-helper-script-${script.id}`,
        src: url,
      });

      $iframe.on('load', () => {
        console.info(`[Script]启用${typeName}脚本["${script.name}"]`);
        URL.revokeObjectURL(url);
      });

      $('body').append($iframe);
    } catch (error) {
      console.error(`[Script]${typeName}脚本启用失败:["${script.name}"]`, error);
      toastr.error(`${typeName}脚本启用失败:["${script.name}"]`);
    }
  }

  /**
   * 取消运行单个脚本
   * @param script 脚本
   */
  async cancelRunScript(script: Script, type: ScriptType, userInput: boolean = true) {
    const typeName = type === ScriptType.GLOBAL ? '全局' : '局部';
    const index =
      type === ScriptType.GLOBAL
        ? this.globalScripts.findIndex(s => s.id === script.id)
        : this.characterScripts.findIndex(s => s.id === script.id);
    if (index !== -1) {
      if (userInput) {
        script.enabled = false;
        await this.saveScript(script, type);
      }
      const iframeElement = $(`#tavern-helper-script-${script.id}`)[0] as IFrameElement;
      if (iframeElement) {
        await destroyIframe(iframeElement);
      }
      this.removeButton(script);
      console.info(`[Script]${typeName}脚本["${script.name}"] 已禁用`);
    }
  }

  /**
   * 渲染单个脚本到界面
   * @param script 脚本
   * @param type 类型
   */
  async renderScript(script: Script, type: ScriptType) {
    const scriptHtml = await this.cloneTemplate(script, type);
    const $emptyTip =
      type === ScriptType.GLOBAL ? $(`#global-script-list`).find('small') : $(`#scoped-script-list`).find('small');
    if (type === ScriptType.GLOBAL) {
      $('#global-script-list').prepend(scriptHtml);
    } else {
      $('#scoped-script-list').prepend(scriptHtml);
    }

    if ($emptyTip.length > 0) {
      $emptyTip.remove();
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
        if (script.buttons && script.buttons.length > 0) {
          script.buttons.forEach((button, index) => {
            const buttonId = `button-${index}`;
            const $buttonContent = $(`<div class="button-item" id="${buttonId}">
              <span class="drag-handle menu-handle">☰</span>
              <input type="checkbox" id="checkbox-${buttonId}" ${button.visible ? 'checked' : ''} />
              <input class="text_pole" type="text" id="text-${buttonId}" value="${button.name}"/>
              <div class="delete-button menu_button interactable">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>`);
            $editorHtml.find('.button-list').append($buttonContent);
            $(`#text-${buttonId}`).val(button.name);
            $(`#checkbox-${buttonId}`).prop('checked', button.visible);
          });
        }
      }
    }

    $editorHtml.find('#add-button-trigger').on('click', () => {
      const buttonId = `button-${$editorHtml.find('.button-list .button-item').length}`;
      const $buttonContent = $(`<div class="button-item" id="${buttonId}">
        <span class="drag-handle menu-handle">☰</span>
        <input type="checkbox" id="checkbox-${buttonId}"/>
        <input class="text_pole" type="text" id="text-${buttonId}"/>
        <div class="delete-button menu_button interactable">
          <i class="fa-solid fa-trash"></i>
        </div>
      </div>`);
      $editorHtml.find('.button-list').append($buttonContent);
    });

    $editorHtml.find('#script-button-content').sortable({
      handle: '.drag-handle',
      items: '.button-item',
    });

    $editorHtml.on('click', '.delete-button', (e: JQuery.ClickEvent) => {
      $(e.currentTarget).closest('.button-item').remove();
    });

    const popupResult = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
      wide: true,
      large: true,
    });

    if (popupResult) {
      const scriptName = $editorHtml.find('#script-name-input').val() as string;
      const scriptContent = $editorHtml.find('#script-content-textarea').val() as string;
      const scriptInfo = $editorHtml.find('#script-info-textarea').val() as string;
      const buttonArray = $editorHtml
        .find('.button-list')
        .find('.button-item')
        .map((_index, element) => {
          const buttonId = $(element).attr('id');
          if (!buttonId) return null;
          const buttonText = $(element).find(`#text-${buttonId}`).val() as string;
          const isVisible = $(element).find(`#checkbox-${buttonId}`).prop('checked');
          return {
            text: buttonText,
            visible: isVisible,
          };
        })
        .toArray()
        .filter(button => button && button.text && button.text.trim() !== '');

      if (scriptId && script) {
        if (script.buttons) {
          this.removeButton(script);
        }

        script.name = scriptName;
        script.content = scriptContent;
        script.info = scriptInfo;
        script.buttons = buttonArray.map(button => ({ name: button.text, visible: button.visible }));
        $(`#${script.id}`).find('.script-item-name').text(script.name);
        await this.saveScript(script, type);
        if (script.enabled) {
          await this.runScript(script, type, false);
          this.addButton(script);
        }
      } else {
        const newScript = new Script({
          id: uuidv4(),
          name: scriptName,
          content: scriptContent,
          info: scriptInfo,
          enabled: false,
          buttons: buttonArray.map(button => ({ name: button.text, visible: button.visible })),
        });
        await this.addScript(newScript, type);
      }
    }
  }

  /**
   * 打开变量编辑器
   */
  async openVariableEditor() {
    const $editorHtml = $(await renderExtensionTemplateAsync(`${templatePath}`, 'script_variable_editor'));
    const $variableList = $editorHtml.find('#variable-list');
    const $addVariableTrigger = $editorHtml.find('#add-variable-trigger');

    if (this_chid) {
      const existingVariables = characters[this_chid]?.data?.extensions?.TavernHelper_characterScriptVariables || {};
      Object.entries(existingVariables).forEach(([name, value]) => {
        const $variableItem = $(
          `
        <div class="variable-item flex-container flexFlowColumn gap10">
        <div class="divider"></div>
          <div class="flex-container">
            <div class="flex spaceBetween alignItemsCenter width100p">
            <span>名称:</span>
              <i class="fa-solid fa-trash" style="font-size: calc(var(--mainFontSize) * 0.8); cursor: pointer; margin-right:5px;"></i>
            </div>
            <input type="text" value="${name}"/>
          </div>
          <div class="flex-container">
            <span>值:</span>
            <textarea rows="1">${value}</textarea>
          </div>
        </div>`,
        );
        $variableList.append($variableItem);
      });
    }

    $addVariableTrigger.on('click', () => {
      const $variableItem = $(
        `
        <div class="variable-item flex-container flexFlowColumn gap10">
        <div class="divider"></div>
          <div class="flex-container">
            <div class="flex spaceBetween alignItemsCenter width100p">
            <span>名称:</span>
              <i class="fa-solid fa-trash" style="font-size: calc(var(--mainFontSize) * 0.8); cursor: pointer; margin-right:5px;"></i>
            </div>
            <input type="text"/>
          </div>
          <div class="flex-container">
            <span>值:</span>
            <textarea rows="1"></textarea>
          </div>
        </div>`,
      );
      $variableList.append($variableItem);
    });

    $editorHtml.on('click', '.fa-trash', function () {
      $(this).closest('.variable-item').remove();
    });

    const popupResult = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
      large: true,
    });

    if (popupResult) {
      const variables: Record<string, string> = {};
      $variableList.find('.variable-item').each((_index, element) => {
        const $item = $(element);
        const name = $item.find('input[type="text"]').val()?.toString().trim();
        const value = $item.find('textarea').val()?.toString() || '';

        if (name) {
          variables[name] = value;
        }
      });

      if (this_chid) {
        await writeExtensionField(this_chid, 'TavernHelper_characterScriptVariables', variables);
      } else {
        toastr.error('保存失败，当前角色为空');
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
      const script = this.getScriptById(id);
      if (!script) {
        throw new Error('[ScriptRepository] 脚本不存在');
      }
      const array =
        type === ScriptType.GLOBAL
          ? getSettingValue('script.scriptsRepository') || []
          : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];

      // eslint-disable-next-line no-shadow
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
        if (array.length === 0) {
          const $emptyTip = `<small>暂无可用脚本</small>`;
          type === ScriptType.GLOBAL
            ? $(`#global-script-list`).append($emptyTip)
            : $(`#scoped-script-list`).append($emptyTip);
        }

        this.removeButton(script);
      }
    } catch (error) {
      console.error('[ScriptRepository] 删除脚本时发生错误:', error);
      throw error;
    }
  }

  /**
   * 保存单个脚本到设置中
   * @param script 脚本
   * @param type 脚本类型
   */
  async saveScript(script: Script, type: ScriptType) {
    const array =
      type === ScriptType.GLOBAL
        ? getSettingValue('script.scriptsRepository') || []
        : characters[this_chid]?.data?.extensions?.TavernHelper_scripts || [];
    const index = array.findIndex((s: Script) => s.id === script.id);
    if (index === -1) {
      array.unshift(script);
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
   * 保存脚本数组到扩展数据
   * @param array 脚本数组
   */
  async saveGlobalScripts(array: Script[]) {
    await saveSettingValue('script.scriptsRepository', array);
  }

  /**
   * 保存脚本数组到角色卡数据
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

        list.find('> .script-item').each(function (this: HTMLElement) {
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
          await this.saveGlobalScripts(targetArray);
          await this.renderScript(script, targetType);
        } else {
          await this.saveCharacterScripts(targetArray);
          await this.renderScript(script, targetType);
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

  /**
   * 克隆显示模板
   * @param script 脚本
   * @param type 类型,global 全局,scope 局部
   */
  async cloneTemplate(script: Script, type: ScriptType.GLOBAL | ScriptType.CHARACTER) {
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
      .on('change', async e => {
        const isChecked = !!$(e.target).prop('checked');

        scriptHtml.find('.script-toggle-on').toggle(isChecked);
        scriptHtml.find('.script-toggle-off').toggle(!isChecked);
        script.enabled = isChecked;
        await this.saveScript(script, type);
        // 不需要再保存一次
        if (isChecked) {
          await this.runScript(script, type, false);
          this.addButton(script);
        } else {
          await this.cancelRunScript(script, type, false);
          this.removeButton(script);
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
    scriptHtml.find('.script-info').on('click', async () => {
      const scriptInfo = this.getScriptById(script.id)?.info || '';
      const htmlText = renderMarkdown(scriptInfo);
      await callGenericPopup(htmlText, POPUP_TYPE.DISPLAY);
    });

    scriptHtml.find('.edit-script').on('click', () => this.openScriptEditor(type, script.id));
    scriptHtml.find('.script-storage-location').on('click', () => this.moveScriptToOtherType(script, type));
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

      await this.deleteScript(script.id, type);

      scriptHtml.remove();
    });
    return scriptHtml;
  }

  /**
   * 克隆默认脚本模板
   * @param script 脚本
   * @param type 类型,global 全局,scope 局部
   */
  async cloneDefaultScriptTemplate(script: Script) {
    const scriptHtml = defaultScriptTemplate.clone();

    scriptHtml.attr('id', script.id);

    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-info').on('click', () => {
      const htmlText = renderMarkdown(script.info);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY);
    });
    scriptHtml.find('.add-script').on('click', async () => {
      let target = 'global';
      const template = $(await renderExtensionTemplateAsync(`${templatePath}`, 'script_import_target'));
      template.find('#script-import-target-global').on('input', () => (target = 'global'));
      template.find('#script-import-target-scoped').on('input', () => (target = 'scoped'));
      await callGenericPopup(template, POPUP_TYPE.TEXT);

      const convertedScript = new Script({
        id: script.id,
        name: script.name,
        content: script.content,
        info: script.info,
        enabled: script.enabled,
      });

      const type = target === 'global' ? ScriptType.GLOBAL : ScriptType.CHARACTER;
      // 检查是否已存在相同id的脚本
      const existingScript = this.getScriptById(convertedScript.id);
      if (existingScript) {
        const confirm = await callGenericPopup(`脚本 ${existingScript.name} 已存在，是否要覆盖？`, POPUP_TYPE.CONFIRM);
        if (!confirm) {
          return;
        } else {
          await this.saveScript(convertedScript, type);
        }
      } else {
        await this.addScript(convertedScript, type);
      }
    });
    return scriptHtml;
  }

  /**
   * 加载默认脚本库
   */
  async loadDefaultScriptsRepository() {
    const defaultScriptList = $('<div id="default-script-list" class="flex-container flexFlowColumn"></div>');
    const defaultScripts = await createDefaultScripts();
    for (const script of defaultScripts) {
      const template = await this.cloneDefaultScriptTemplate(script);
      defaultScriptList.append(template);
    }
    await callGenericPopup(defaultScriptList, POPUP_TYPE.TEXT);
  }

  /**
   * 处理脚本启用开关的点击事件
   * @param type 类型,global 全局,scope 局部
   * @param enable 是否启用
   * @param userInput 是否由用户输入
   */
  async handleScriptToggle(type: ScriptType, enable: boolean, userInput: boolean = true) {
    if (type === ScriptType.GLOBAL) {
      if (userInput) {
        await saveSettingValue('script.global_script_enabled', enable);
      }
      isGlobalScriptEnabled = enable;
      if (enable) {
        this.runScriptsByType(ScriptType.GLOBAL);
        this.addButtonsByType(ScriptType.GLOBAL);
      } else {
        this.cancelRunScriptsByType(ScriptType.GLOBAL);
        this.removeButtonsByType(ScriptType.GLOBAL);
      }
    } else {
      if (userInput) {
        await saveSettingValue('script.scope_script_enabled', enable);
      }
      isScopedScriptEnabled = enable;
      if (enable) {
        this.runScriptsByType(ScriptType.CHARACTER);
        this.addButtonsByType(ScriptType.CHARACTER);
      } else {
        this.cancelRunScriptsByType(ScriptType.CHARACTER);
        this.removeButtonsByType(ScriptType.CHARACTER);
      }
    }
  }

  /**
   * 导入脚本文件
   * @param {File} file 文件
   * @param {boolean} type 脚本类型
   */
  async onScriptImportFileChange(file: File, type: ScriptType) {
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

      await this.saveScript(newScript, type);
      await this.renderScript(newScript, type);
      toastr.success(`脚本 "${newScript.name}" 导入成功。`);
    } catch (error) {
      console.error(error);
      toastr.error('无效的JSON文件。');
      return;
    }
  }

  /**
   * 检查角色中的嵌入式脚本
   */
  async checkEmbeddedScripts() {
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
              const scriptHtml = await this.cloneTemplate(script, ScriptType.CHARACTER);
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

  addButton(script: Script) {
    if (script.buttons && script.buttons.length > 0) {
      this.removeButton(script);

      script.buttons.forEach(button => {
        if (button.visible) {
          initButtonContainer();

          $('#TH-script-buttons').append(
            `<div class="qr--button menu_button interactable" id="${button.name}_${script.id}">${button.name}</div>`,
          );
          $(`#${button.name}_${script.id}`).on('click', () => {
            eventSource.emit(`${button.name}_${script.id}`);
          });
        }
      });
    } else {
      return;
    }
  }

  addButtonsByType(type: ScriptType) {
    const scripts = type === ScriptType.GLOBAL ? this.globalScripts : this.characterScripts;
    for (const script of scripts) {
      this.addButton(script);
    }
  }

  removeButton(script: Script) {
    $(`[id$=_${script.id}]`).remove();
  }

  removeButtonsByType(type: ScriptType) {
    const scripts = type === ScriptType.GLOBAL ? this.globalScripts : this.characterScripts;
    for (const script of scripts) {
      this.removeButton(script);
    }
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
 * 清理所有脚本iframe
 */
export async function clearAllScriptsIframe() {
  const $iframes = $('iframe[id^="tavern-helper-script-"]');
  for (const iframe of $iframes) {
    await destroyIframe(iframe as IFrameElement);
  }
}

/**
 * 获取脚本库局部变量
 * @returns 局部变量
 */
export function getCharacterScriptVariables() {
  return characters[this_chid]?.data?.extensions?.TavernHelper_characterScriptVariables || {};
}

/**
 * 初始化按钮容器
 */
function initButtonContainer() {
  const $qrBar = $('#qr--bar');
  if (!$qrBar.length) {
    $('#send_form').append(
      '<div class="flex-container flexGap5" id="qr--bar"><div class="qr--buttons qr--color" id="TH-script-buttons"></div></div>',
    );
  }
}

export async function initScriptRepository(scriptRepo: ScriptRepository) {
  initButtonContainer();
  isGlobalScriptEnabled = getSettingValue('script.global_script_enabled');
  isScopedScriptEnabled = getSettingValue('script.scope_script_enabled');

  scriptRepo.handleScriptToggle(ScriptType.GLOBAL, isGlobalScriptEnabled, false);
  scriptRepo.handleScriptToggle(ScriptType.CHARACTER, isScopedScriptEnabled, false);

  $('#global-script-enable-toggle')
    .prop('checked', isGlobalScriptEnabled)
    .on('click', (event: JQuery.ClickEvent) =>
      scriptRepo.handleScriptToggle(ScriptType.GLOBAL, event.target.checked, true),
    );
  $('#scoped-script-enable-toggle')
    .prop('checked', isScopedScriptEnabled)
    .on('click', (event: JQuery.ClickEvent) =>
      scriptRepo.handleScriptToggle(ScriptType.CHARACTER, event.target.checked, true),
    );

  $('#open-global-script-editor').on('click', () => scriptRepo.openScriptEditor(ScriptType.GLOBAL, undefined));
  $('#open-scoped-script-editor').on('click', () => scriptRepo.openScriptEditor(ScriptType.CHARACTER, undefined));

  $('#scope-variable').on('click', () => scriptRepo.openVariableEditor());

  $('#import-script-file').on('change', async function () {
    let target = 'global';
    const template = $(await renderExtensionTemplateAsync(`${templatePath}`, 'script_import_target'));
    template.find('#script-import-target-global').on('input', () => (target = 'global'));
    template.find('#script-import-target-scoped').on('input', () => (target = 'scoped'));
    await callGenericPopup(template, POPUP_TYPE.TEXT);
    const inputElement = this instanceof HTMLInputElement && this;
    if (inputElement && inputElement.files) {
      for (const file of inputElement.files) {
        await scriptRepo.onScriptImportFileChange(file, target === 'global' ? ScriptType.GLOBAL : ScriptType.CHARACTER);
      }

      inputElement.value = '';
    }
  });

  $('#import-script').on('click', function () {
    $('#import-script-file').trigger('click');
  });

  $('#default-script').on('click', () => scriptRepo.loadDefaultScriptsRepository());
}
