import { ButtonManager, initScriptButton } from '@/component/script_repository/button';
import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import { ScriptManager } from '@/component/script_repository/script_controller';
import { Script, ScriptType } from '@/component/script_repository/types';
import { extensionFolderPath, getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { renderMarkdown } from '@/util/render_markdown';
import { characters, this_chid } from '@sillytavern/script';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { download, getSortableDelay, uuidv4 } from '@sillytavern/scripts/utils';
export class UIController {
  // 单例模式
  private static instance: UIController;

  // 依赖和状态
  private scriptManager: ScriptManager;
  private buttonManager: ButtonManager;

  // 模板路径和缓存
  private templatePath: string;
  private baseTemplate: JQuery<HTMLElement> | null = null;
  private defaultScriptTemplate: JQuery<HTMLElement> | null = null;

  /**
   * 私有构造函数
   */
  private constructor() {
    this.scriptManager = ScriptManager.getInstance();
    this.buttonManager = new ButtonManager();
    this.templatePath = `${extensionFolderPath}/src/component/script_repository/public`;
  }

  /**
   * 获取UI控制器实例
   */
  public static getInstance(): UIController {
    if (!UIController.instance) {
      UIController.instance = new UIController();
    }
    return UIController.instance;
  }

  /**
   * 销毁UI控制器实例
   */
  public static destroyInstance(): void {
    if (UIController.instance) {
      UIController.instance.cleanup();
      UIController.instance = undefined as unknown as UIController;
    }
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    this.buttonManager.clearButtons();
    this.baseTemplate = null;
    this.defaultScriptTemplate = null;
  }

  /**
   * 初始化UI
   */
  public async initialize(): Promise<void> {
    // 初始化模板
    await this.initializeTemplates();

    // 设置UI事件
    this.setupScriptRepositoryEvents();

    // 注册事件监听器
    this.registerEventListeners();

    // 渲染脚本列表
    await this.renderScriptLists();

    // 初始化按钮容器
    initScriptButton();

    // 触发UI加载完成事件
    scriptEvents.emit(ScriptRepositoryEventType.UI_LOADED);
  }

  /**
   * 初始化模板
   */
  private async initializeTemplates(): Promise<void> {
    // 初始化脚本项目模板
    this.baseTemplate = $(
      await renderExtensionTemplateAsync(this.templatePath, 'script_item_template', {
        scriptName: '',
        id: '',
        moveTo: '',
        faIcon: '',
      }),
    );

    // 初始化默认脚本库模板
    this.defaultScriptTemplate = $(
      await renderExtensionTemplateAsync(this.templatePath, 'script_default_repository', {
        scriptName: '',
        id: '',
      }),
    );
  }

  /**
   * 初始化脚本库界面事件
   */
  private setupScriptRepositoryEvents(): void {
    // 全局脚本开关
    $('#global-script-enable-toggle')
      .prop('checked', this.scriptManager.isGlobalScriptEnabled)
      .on('click', (event: JQuery.ClickEvent) => {
        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.GLOBAL,
          enable: event.target.checked,
          userInput: true,
        });
      });

    // 局部脚本开关
    $('#character-script-enable-toggle')
      .prop('checked', this.scriptManager.isCharacterScriptEnabled)
      .on('click', (event: JQuery.ClickEvent) => {
        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.CHARACTER,
          enable: event.target.checked,
          userInput: true,
        });
      });

    // 脚本编辑器按钮
    $('#open-global-script-editor').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, {
        type: ScriptType.GLOBAL,
      });
    });

    $('#open-character-script-editor').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, {
        type: ScriptType.CHARACTER,
      });
    });

    // 脚本变量编辑器按钮
    $('#character-variable').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.VARIABLE_EDIT);
    });

    // 导入脚本文件
    $('#import-script-file').on('change', async function () {
      let target = 'global';
      const template = $(
        await renderExtensionTemplateAsync(
          `${extensionFolderPath}/src/component/script_repository/public`,
          'script_import_target',
        ),
      );
      template.find('#script-import-target-global').on('input', () => (target = 'global'));
      template.find('#script-import-target-character').on('input', () => (target = 'character'));
      const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        const inputElement = this instanceof HTMLInputElement && this;
        if (inputElement && inputElement.files) {
          for (const file of inputElement.files) {
            scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_IMPORT, {
              file,
              type: target === 'global' ? ScriptType.GLOBAL : ScriptType.CHARACTER,
            });
          }
          inputElement.value = '';
        }
      }
    });

    // 触发导入脚本文件对话框
    $('#import-script').on('click', function () {
      $('#import-script-file').trigger('click');
    });

    // 加载默认脚本库
    $('#default-script').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, { action: 'load_default_scripts' });
    });

    // 修复布局问题
    $('#extensions_settings').css('min-width', '0');
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    scriptEvents.on(ScriptRepositoryEventType.UI_REFRESH, async data => {
      const { action } = data;

      switch (action) {
        case 'script_toggled':
          // 脚本启用状态切换
          await this.refreshScriptState(data.script, data.enable);
          break;
        case 'type_toggled':
          // 脚本类型启用状态切换
          await this.refreshTypeState(data.type, data.enable);
          break;
        case 'script_imported':
          // 脚本导入成功
          await this.renderScript(data.script, data.type);
          break;
        case 'script_saved':
          // 脚本保存成功
          await this.renderScript(data.script, data.type);
          break;
        case 'script_deleted':
          // 脚本删除成功
          this.removeScriptElement(data.scriptId);
          break;
        case 'script_moved':
          // 脚本移动成功
          this.handleScriptMoved(data.script, data.fromType, data.targetType);
          break;
        case 'scripts_reordered':
          // 脚本重新排序
          await this.scriptManager.saveScriptsOrder(data.scripts, data.type);
          break;
        case 'load_default_scripts':
          // 加载默认脚本
          await this.loadDefaultScriptsRepository();
          break;
        case 'refresh_charact_scripts':
          // 只刷新角色脚本列表
          await this.refreshCharacterScriptList();
          break;
        default:
          console.warn(`[script_repository] 未处理的UI刷新事件: ${action}`);
      }
    });

    // 监听按钮添加事件
    scriptEvents.on(ScriptRepositoryEventType.BUTTON_ADD, data => {
      const { script } = data;
      this.addButton(script);
    });

    // 监听按钮移除事件
    scriptEvents.on(ScriptRepositoryEventType.BUTTON_REMOVE, data => {
      const { scriptId } = data;
      this.buttonManager.removeButtonsByScriptId(scriptId);
    });

    // 监听脚本编辑事件
    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_EDIT, async data => {
      const { type, scriptId } = data;
      await this.openScriptEditor(type, scriptId);
    });

    // 监听变量编辑事件
    scriptEvents.on(ScriptRepositoryEventType.VARIABLE_EDIT, async () => {
      await this.openVariableEditor();
    });
  }

  /**
   * 添加按钮
   * @param script 脚本
   */
  private addButton(script: Script): void {
    if (script.buttons && script.buttons.length > 0) {
      this.buttonManager.addButtonsForScript(script);
    }
  }

  /**
   * 渲染脚本列表
   */
  private async renderScriptLists(): Promise<void> {
    // 清空列表
    this.clearGlobalScriptList();
    this.clearCharacterScriptList();

    // 渲染全局脚本
    const globalScripts = this.scriptManager.getGlobalScripts();
    await this.renderGlobalScriptList(globalScripts);

    // 渲染角色脚本
    const characterScripts = this.scriptManager.getCharacterScripts();
    await this.renderCharacterScriptList(characterScripts);
  }

  /**
   * 渲染全局脚本列表
   * @param scripts 脚本数组
   */
  private async renderGlobalScriptList(scripts: Script[]): Promise<void> {
    if (scripts.length > 0) {
      for (const script of scripts) {
        await this.renderScript(script, ScriptType.GLOBAL);
      }
    } else {
      this.showEmptyScriptListTip(ScriptType.GLOBAL);
    }

    // 设置拖拽排序
    this.setupDraggable(ScriptType.GLOBAL);
  }

  /**
   * 渲染角色脚本列表
   * @param scripts 脚本数组
   */
  private async renderCharacterScriptList(scripts: Script[]): Promise<void> {
    if (scripts.length > 0) {
      for (const script of scripts) {
        await this.renderScript(script, ScriptType.CHARACTER);
      }
    } else {
      this.showEmptyScriptListTip(ScriptType.CHARACTER);
    }

    // 设置拖拽排序
    this.setupDraggable(ScriptType.CHARACTER);
  }

  /**
   * 清除全局脚本列表
   */
  private clearGlobalScriptList(): void {
    $('#global-script-list').empty();
  }

  /**
   * 清除局部脚本列表
   */
  private clearCharacterScriptList(): void {
    $('#character-script-list').empty();
  }

  /**
   * 刷新角色脚本列表
   */
  private async refreshCharacterScriptList(): Promise<void> {
    // 清空角色脚本列表
    this.clearCharacterScriptList();

    // 获取并渲染角色脚本
    const characterScripts = this.scriptManager.getCharacterScripts();
    await this.renderCharacterScriptList(characterScripts);

    // 设置总开关状态
    const isCharacterScriptEnabled = this.scriptManager.isCharacterScriptEnabled;
    $('#character-script-enable-toggle').prop('checked', isCharacterScriptEnabled);
  }

  /**
   * 显示空脚本列表提示
   * @param type 脚本类型
   */
  private showEmptyScriptListTip(type: ScriptType): void {
    const container = type === ScriptType.GLOBAL ? $('#global-script-list') : $('#character-script-list');
    if (container.find('small').length === 0) {
      container.append('<small>暂无脚本</small>');
    }
  }

  /**
   * 刷新脚本状态
   * @param script 脚本
   * @param enable 是否启用
   */
  private async refreshScriptState(script: Script, enable: boolean): Promise<void> {
    // 更新UI状态
    const $script = $(`#${script.id}`);
    if ($script.length > 0) {
      if (enable) {
        $script.find('.script-toggle').addClass('enabled');
        $script.find('.script-toggle i.fa-toggle-off').hide();
        $script.find('.script-toggle i.fa-toggle-on').show();
      } else {
        $script.find('.script-toggle').removeClass('enabled');
        $script.find('.script-toggle i.fa-toggle-off').show();
        $script.find('.script-toggle i.fa-toggle-on').hide();
      }
    }
  }

  /**
   * 刷新脚本类型状态
   * @param type 脚本类型
   * @param enable 是否启用
   */
  private async refreshTypeState(type: ScriptType, enable: boolean): Promise<void> {
    // 更新UI状态
    const $toggle =
      type === ScriptType.GLOBAL ? $('#global-script-enable-toggle') : $('#character-script-enable-toggle');
    $toggle.prop('checked', enable);
  }

  /**
   * 移除脚本元素
   * @param scriptId 脚本ID
   */
  private removeScriptElement(scriptId: string): void {
    $(`#${scriptId}`).remove();
  }

  /**
   * 处理脚本移动
   * @param script 脚本
   * @param fromType 源类型
   * @param targetType 目标类型
   */
  private handleScriptMoved(script: Script, fromType: ScriptType, targetType: ScriptType): void {
    // 从源列表中移除
    $(`#${script.id}`).remove();

    // 检查源列表是否为空
    const sourceList = fromType === ScriptType.GLOBAL ? $('#global-script-list') : $('#character-script-list');
    if (sourceList.children().length === 0) {
      this.showEmptyScriptListTip(fromType);
    }

    // 在目标列表中渲染
    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_imported',
      script,
      type: targetType,
    });
  }

  /**
   * 渲染单个脚本项
   * @param script 脚本
   * @param type 脚本类型
   */
  private async renderScript(script: Script, type: ScriptType): Promise<void> {
    if (!this.baseTemplate) {
      await this.initializeTemplates();
    }

    const scriptHtml = this.baseTemplate!.clone();

    // 设置脚本ID，确保不受内置库中的临时ID影响
    scriptHtml.attr('id', script.id);

    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-storage-location').addClass(type === 'global' ? 'move-to-character' : 'move-to-global');
    scriptHtml.find('.script-storage-location i').addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

    const $toggleButton = scriptHtml.find('.script-toggle');
    // 设置初始状态
    if (script.enabled) {
      $toggleButton.addClass('enabled');
      $toggleButton.find('i.fa-toggle-off').hide();
      $toggleButton.find('i.fa-toggle-on').show();
    } else {
      $toggleButton.removeClass('enabled');
      $toggleButton.find('i.fa-toggle-off').show();
      $toggleButton.find('i.fa-toggle-on').hide();
    }

    // 绑定点击事件
    $toggleButton.on('click', function () {
      const isEnabled = $(this).hasClass('enabled');
      const newState = !isEnabled;

      if (newState) {
        $(this).addClass('enabled');
        $(this).find('i.fa-toggle-off').hide();
        $(this).find('i.fa-toggle-on').show();
      } else {
        $(this).removeClass('enabled');
        $(this).find('i.fa-toggle-off').show();
        $(this).find('i.fa-toggle-on').hide();
      }

      script.enabled = newState;

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_TOGGLE, {
        script,
        type,
        enable: newState,
        userInput: true,
      });
    });

    scriptHtml.find('.script-info').on('click', () => {
      const scriptInfo = script.info || '';
      const htmlText = renderMarkdown(scriptInfo);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
    });

    scriptHtml.find('.edit-script').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, { type, scriptId: script.id });
    });

    scriptHtml.find('.script-storage-location').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_MOVE, { script, fromType: type });
    });

    scriptHtml.find('.export-script').on('click', async () => {
      // eslint-disable-next-line no-control-regex
      const fileName = `${script.name.replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, '_').toLowerCase()}.json`;
      const { enabled, ...scriptData } = script;
      const fileData = JSON.stringify(scriptData, null, 2);
      download(fileData, fileName, 'application/json');
    });

    scriptHtml.find('.delete-script').on('click', async () => {
      const confirm = await callGenericPopup('确定要删除这个脚本吗？', POPUP_TYPE.CONFIRM);

      if (!confirm) {
        return;
      }

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_DELETE, { scriptId: script.id, type });
      scriptHtml.remove();
    });

    const $emptyTip =
      type === ScriptType.GLOBAL ? $('#global-script-list').find('small') : $('#character-script-list').find('small');

    // 获取对应类型的容器
    const container = type === ScriptType.GLOBAL ? $('#global-script-list') : $('#character-script-list');

    // 检查是否已经存在具有相同ID的脚本元素（不包括内置库的临时ID），只在对应类型的容器内查找
    const existingElement = container.find(`#${CSS.escape(script.id)}`).filter(function (this: HTMLElement) {
      const elementId = $(this).attr('id');
      // 只选择那些没有default_lib_前缀的元素
      return elementId !== undefined && !elementId.startsWith('default_lib_');
    });

    if (existingElement.length > 0) {
      // 如果已存在，则直接替换元素，保持原位置
      existingElement.replaceWith(scriptHtml);
    } else {
      // 如果不存在，则添加到列表末尾
      container.append(scriptHtml);
    }

    if ($emptyTip.length > 0) {
      $emptyTip.remove();
    }
  }

  /**
   * 设置脚本拖拽排序
   * @param type 脚本类型
   */
  private setupDraggable(type: ScriptType): void {
    const list = type === ScriptType.GLOBAL ? $('#global-script-list') : $('#character-script-list');

    list.sortable({
      delay: getSortableDelay(),
      items: '.script-item',
      stop: async (_, ui) => {
        const itemId = ui.item.attr('id');
        if (!itemId) return;

        // 获取新的顺序
        const newOrder: string[] = [];
        list.children('.script-item').each(function () {
          const childId = $(this).attr('id');
          if (childId) {
            newOrder.push(childId);
          }
        });

        // 重新排序脚本数组
        const scripts =
          type === ScriptType.GLOBAL ? this.scriptManager.getGlobalScripts() : this.scriptManager.getCharacterScripts();

        const orderedScripts = newOrder.map(id => scripts.find(s => s.id === id)).filter(Boolean) as Script[];

        scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
          action: 'scripts_reordered',
          scripts: orderedScripts,
          type,
        });
      },
    });
  }

  /**
   * 克隆默认脚本模板
   * @param script 脚本
   */
  private async cloneDefaultScriptTemplate(script: Script): Promise<JQuery<HTMLElement>> {
    if (!this.defaultScriptTemplate) {
      await this.initializeTemplates();
    }

    const scriptHtml = this.defaultScriptTemplate!.clone();

    // 为内置库中的脚本使用临时ID前缀，确保与实际脚本ID不冲突
    const tempId = `default_lib_${script.id}`;
    scriptHtml.attr('id', tempId);

    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-info').on('click', () => {
      const htmlText = renderMarkdown(script.info);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
    });

    scriptHtml.find('.add-script').on('click', async () => {
      let target: ScriptType = ScriptType.GLOBAL;
      const template = $(await renderExtensionTemplateAsync(this.templatePath, 'script_import_target'));
      template.find('#script-import-target-global').on('input', () => (target = ScriptType.GLOBAL));
      template.find('#script-import-target-character').on('input', () => (target = ScriptType.CHARACTER));
      const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (!result) {
        return;
      }

      const newScript = new Script({ ...script, enabled: false });

      let action: 'new' | 'override' | 'cancel' = 'new';

      const existing_script = this.scriptManager.getScriptById(script.id);
      if (existing_script) {
        const input = await callGenericPopup(
          `要导入的脚本 '${script.name}' 与脚本库中的 '${existing_script.name}' id 相同，是否要导入？`,
          POPUP_TYPE.TEXT,
          '',
          {
            okButton: '覆盖原脚本',
            cancelButton: '取消',
            customButtons: ['新建脚本'],
          },
        );

        switch (input) {
          case 0:
            action = 'cancel';
            break;
          case 1:
            action = 'override';
            break;
          case 2:
            action = 'new';
            break;
        }
      }

      switch (action) {
        case 'new':
          if (existing_script) {
            // 使用新ID
            newScript.id = uuidv4();
          }
          break;
        case 'override':
          {
            if (!existing_script) {
              return;
            }

            $(`#${existing_script.id}`).remove();

            if (existing_script.enabled) {
              await this.scriptManager.stopScript(existing_script, target);
              this.buttonManager.removeButtonsByScriptId(existing_script.id);
            }
          }
          break;
        case 'cancel':
          return;
      }

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_SAVE, { script: newScript, type: target });

      toastr.success(`脚本"${newScript.name}"已添加到${target === ScriptType.GLOBAL ? '全局' : '角色'}脚本库`);
    });

    return scriptHtml;
  }

  /**
   * 创建默认脚本库容器
   * 避免重复渲染模板
   */
  private createDefaultScriptContainer(): JQuery<HTMLElement> {
    // 创建一个简单的容器，而不是重新渲染完整模板
    return $('<div class="default-script-repository-container"></div>');
  }

  /**
   * 加载默认脚本库
   */
  private async loadDefaultScriptsRepository(): Promise<void> {
    const createDefaultScripts = (await import('./builtin_scripts')).createDefaultScripts;
    const container = this.createDefaultScriptContainer();

    const defaultScripts = await createDefaultScripts();
    for (const script of defaultScripts) {
      if (!script) continue;
      const scriptHtml = await this.cloneDefaultScriptTemplate(script);
      container.append(scriptHtml);
    }

    await callGenericPopup(container, POPUP_TYPE.DISPLAY, '', { wide: true });
  }

  /**
   * 打开脚本编辑器
   * @param type 脚本类型
   * @param scriptId 脚本ID
   */
  private async openScriptEditor(type: ScriptType, scriptId?: string): Promise<void> {
    const $editorHtml = $(await renderExtensionTemplateAsync(this.templatePath, 'script_editor'));
    let script: Script | undefined;

    if (scriptId) {
      script = this.scriptManager.getScriptById(scriptId);

      if (script) {
        $editorHtml.find('#script-name-input').val(script.name);
        $editorHtml.find('#script-content-textarea').val(script.content);
        $editorHtml.find('#script-info-textarea').val(script.info);

        // 添加已存在的按钮
        if (script.buttons && script.buttons.length > 0) {
          script.buttons.forEach((button, buttonIndex) => {
            const $buttonHtml = $(`
              <div class="button-item" id="button-${buttonIndex}">
                <span class="drag-handle menu-handle">☰</span>
                <input type="checkbox" id="checkbox-button-${buttonIndex}" class="button-visible" ${
              button.visible ? 'checked' : ''
            }>
                <input class="text_pole button-name" type="text" id="text-button-${buttonIndex}" value="${
              button.name
            }" placeholder="按钮名称">
                <div class="delete-button menu_button interactable" data-index="${buttonIndex}">
                  <i class="fa-solid fa-trash"></i>
                </div>
              </div>
            `);

            $editorHtml.find('.button-list').append($buttonHtml);
          });
        }
      }
    }

    // 添加按钮触发器事件
    $editorHtml.find('#add-button-trigger').on('click', () => {
      const buttonIndex = $editorHtml.find('.button-list .button-item').length;
      const buttonId = `button-${buttonIndex}`;
      const $buttonContent = $(`<div class="button-item" id="${buttonId}">
        <span class="drag-handle menu-handle">☰</span>
        <input type="checkbox" id="checkbox-${buttonId}" class="button-visible" checked>
        <input class="text_pole button-name" type="text" id="text-${buttonId}" placeholder="按钮名称">
        <div class="delete-button menu_button interactable" data-index="${buttonIndex}">
          <i class="fa-solid fa-trash"></i>
        </div>
      </div>`);
      $editorHtml.find('.button-list').append($buttonContent);
    });

    // 配置排序功能
    //@ts-ignore
    $editorHtml.find('#script-button-content .button-list').sortable({
      handle: '.drag-handle',
      items: '.button-item',
    });

    // 删除按钮事件
    $editorHtml.on('click', '.delete-button', (e: JQuery.ClickEvent) => {
      $(e.currentTarget).closest('.button-item').remove();
    });

    const result = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
      wide: true,
      okButton: '保存',
      cancelButton: '取消',
    });

    if (!result) {
      return;
    }

    const scriptName = String($editorHtml.find('#script-name-input').val());
    const scriptContent = String($editorHtml.find('#script-content-textarea').val());
    const scriptInfo = String($editorHtml.find('#script-info-textarea').val());

    // 收集按钮数据
    const buttons: { name: string; visible: boolean }[] = [];
    $editorHtml.find('.button-list .button-item').each(function () {
      const buttonName = $(this).find('.button-name').val() as string;
      const visible = $(this).find('.button-visible').prop('checked') as boolean;
      if (buttonName && buttonName.trim() !== '') {
        buttons.push({ name: buttonName, visible });
      }
    });

    if (!script) {
      // 创建新脚本
      script = new Script({
        id: uuidv4(),
        name: scriptName,
        content: scriptContent,
        info: scriptInfo,
        enabled: false,
        buttons,
      });

      // 发送保存事件
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_SAVE, { script, type });
    } else {
      const wasEnabled = script.enabled;

      // 移除脚本按钮
      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });

      // 更新脚本数据
      script.name = scriptName;
      script.content = scriptContent;
      script.info = scriptInfo;
      script.buttons = buttons;

      // 发送保存事件
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_SAVE, { script, type });

      if (wasEnabled) {
        try {
          await this.scriptManager.stopScript(script, type);
          await this.scriptManager.runScript(script, type);
        } catch (error) {
          console.error(`[Script] 重启脚本失败: ${script.name}`, error);
          toastr.error(`重启脚本失败: ${script.name}`);
        }
      }
    }
  }

  /**
   * 打开变量编辑器
   */
  private async openVariableEditor(): Promise<void> {
    if (!this_chid) {
      toastr.error('保存失败，当前角色为空');
      return;
    }

    const variablesPromise = import('./data').then(module => module.getCharacterScriptVariables());
    const replaceVariablesPromise = import('./data').then(module => module.replaceCharacterScriptVariables);

    const [existingVariables, replaceFunc] = await Promise.all([variablesPromise, replaceVariablesPromise]);

    const $editorHtml = $(await renderExtensionTemplateAsync(this.templatePath, 'script_variable_editor'));
    const variableContainer = $editorHtml.find('.variable-container');

    // 添加已有变量
    for (const [key, value] of Object.entries(existingVariables)) {
      const $variableRow = $(`
        <div class="variable-row flex-container mb-2" style="gap:5px;">
          <input type="text" class="text_pole variable-key" style="width:150px;" value="${key}" placeholder="变量名">
          <input type="text" class="text_pole variable-value" style="flex-grow:1;" value="${value}" placeholder="变量值">
          <div class="menu_button delete-variable">删除</div>
        </div>
      `);

      $variableRow.find('.delete-variable').on('click', function () {
        $(this).closest('.variable-row').remove();
      });

      variableContainer.append($variableRow);
    }

    // 添加新变量按钮
    $editorHtml.find('#add-variable').on('click', function () {
      const $variableRow = $(`
        <div class="variable-row flex-container mb-2" style="gap:5px;">
          <input type="text" class="text_pole variable-key" style="width:150px;" placeholder="变量名">
          <input type="text" class="text_pole variable-value" style="flex-grow:1;" placeholder="变量值">
          <div class="menu_button delete-variable">删除</div>
        </div>
      `);

      $variableRow.find('.delete-variable').on('click', function () {
        $(this).closest('.variable-row').remove();
      });

      variableContainer.append($variableRow);
    });

    const result = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
      wide: true,
      okButton: '保存',
      cancelButton: '取消',
    });

    if (!result) {
      return;
    }

    // 收集变量数据
    const variables: Record<string, string> = {};
    $editorHtml.find('.variable-row').each(function () {
      const key = $(this).find('.variable-key').val() as string;
      const value = $(this).find('.variable-value').val() as string;
      if (key && key.trim() !== '') {
        variables[key] = value;
      }
    });

    await replaceFunc(variables);
    console.info('[Script] 已保存角色脚本变量');
    toastr.success('已保存角色脚本变量');
  }

  /**
   * 检查角色中的嵌入式脚本
   * @param characterId 角色id
   * @param enableableScripts 可启用的脚本列表
   */
  public async checkEmbeddedScripts(characterId: any): Promise<void> {
    const charactersWithScripts = getSettingValue('script.characters_with_scripts') || [];
    const avatar = characters[characterId]?.avatar;
    if (charactersWithScripts.includes(avatar)) {
      return;
    }
    const checkKey = `AlertScript_${avatar}`;
    if (!localStorage.getItem(checkKey)) {
      localStorage.setItem(checkKey, 'true');
      const template = await renderExtensionTemplateAsync(
        `${extensionFolderPath}/src/component/script_repository/public`,
        'script_allow_popup',
      );
      const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        if (avatar && !charactersWithScripts.includes(avatar)) {
          charactersWithScripts.push(avatar);
          saveSettingValue('script.characters_with_scripts', charactersWithScripts);
        }

        $('#character-script-enable-toggle').prop('checked', true);

        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.CHARACTER,
          enable: true,
          userInput: false,
        });
      } else {
        $('#character-script-enable-toggle').prop('checked', false);

        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.CHARACTER,
          enable: false,
          userInput: false,
        });
      }
    }
  }
}
