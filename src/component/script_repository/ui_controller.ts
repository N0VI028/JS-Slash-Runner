import { ButtonManager, initScriptButton } from '@/component/script_repository/button';
import { scriptEvents, ScriptRepositoryEventType } from '@/component/script_repository/events';
import { ScriptManager } from '@/component/script_repository/script_controller';
import {
  getBatchControlsSelector,
  getScriptListSelector,
  getScriptToggleSelector,
  Script,
  ScriptRepositoryItem,
  ScriptType,
} from '@/component/script_repository/types';
import { extensionFolderPath, getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { renderMarkdown } from '@/util/render_markdown';

import { characters } from '@sillytavern/script';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { download, getSortableDelay, showFontAwesomePicker, uuidv4 } from '@sillytavern/scripts/utils';

import log from 'loglevel';

export class UIController {
  private static instance: UIController;

  private scriptManager: ScriptManager;
  private buttonManager: ButtonManager;

  private templatePath: string;
  private baseTemplate: JQuery<HTMLElement> | null = null;
  private defaultScriptTemplate: JQuery<HTMLElement> | null = null;
  private folderTemplate: JQuery<HTMLElement> | null = null;

  private batchModeGlobal: boolean = false;
  private batchModeCharacter: boolean = false;

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
    this.folderTemplate = null;
  }

  /**
   * 初始化UI
   */
  public async initialize(): Promise<void> {
    await this.initializeTemplates();

    this.setupScriptRepositoryEvents();

    this.registerEventListeners();

    await this.renderScriptLists();

    initScriptButton();

    scriptEvents.emit(ScriptRepositoryEventType.UI_LOADED);
  }

  /**
   * 初始化模板
   */
  private async initializeTemplates(): Promise<void> {
    this.baseTemplate = $(
      await renderExtensionTemplateAsync(this.templatePath, 'script_item_template', {
        scriptName: '',
        id: '',
        moveTo: '',
        faIcon: '',
      }),
    );

    this.defaultScriptTemplate = $(
      await renderExtensionTemplateAsync(this.templatePath, 'script_default_repository', {
        scriptName: '',
        id: '',
      }),
    );

    this.folderTemplate = $(
      await renderExtensionTemplateAsync(this.templatePath, 'folder_template', {
        folderId: '',
        folderName: '',
        folderIcon: 'fa-folder',
        folderColor: document.documentElement.style.getPropertyValue('--SmartThemeBodyColor'),
      }),
    );
  }

  /**
   * 初始化脚本库界面事件
   */
  private setupScriptRepositoryEvents(): void {
    $('#global-script-enable-toggle')
      .prop('checked', this.scriptManager.isGlobalScriptEnabled)
      .on('click', (event: JQuery.ClickEvent) => {
        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.GLOBAL,
          enable: event.target.checked,
          userInput: true,
        });
      });

    $('#character-script-enable-toggle')
      .prop('checked', this.scriptManager.isCharacterScriptEnabled)
      .on('click', (event: JQuery.ClickEvent) => {
        scriptEvents.emit(ScriptRepositoryEventType.TYPE_TOGGLE, {
          type: ScriptType.CHARACTER,
          enable: event.target.checked,
          userInput: true,
        });
      });

    $('#create-script').on('click', async () => {
      await this.showCreateScriptDialog();
    });

    $('#import-script-file').on('change', async function () {
      let target = 'global';
      const template = $(
        await renderExtensionTemplateAsync(
          `${extensionFolderPath}/src/component/script_repository/public`,
          'script_target_selector',
          {
            title: '导入到:',
            prefix: 'script-import',
            globalLabel: '全局脚本',
            characterLabel: '局部脚本',
          },
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

    $('#import-script').on('click', function () {
      $('#import-script-file').trigger('click');
    });

    $('#create-folder').on('click', () => {
      this.showCreateFolderDialog();
    });

    $('#default-script').on('click', () => {
      scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, { action: 'load_default_scripts' });
    });

    $('#extensions_settings').css('min-width', '0');

    this.setupSearchEvents();

    this.setupBatchOperationEvents();
  }

  /**
   * 注册事件监听器
   */
  private registerEventListeners(): void {
    scriptEvents.on(ScriptRepositoryEventType.UI_REFRESH, async data => {
      const { action } = data;

      switch (action) {
        case 'script_toggle':
          await this.refreshScriptState(data.script, data.enable);
          this.updateParentFolderToggle(data.script.id, data.type);
          break;
        case 'type_toggle':
          await this.refreshTypeState(data.type, data.enable);
          break;
        case 'script_import':
          await this.addScriptToContainer(data.script, data.type);
          break;
        case 'script_create':
          await this.addScriptToContainer(data.script, data.type);
          break;
        case 'script_update':
          this.updateScriptUI(data.script, data.type);
          break;
        case 'script_delete':
          this.removeScriptElement(data.scriptId);
          break;
        case 'script_move':
          this.handleScriptMoved(data.script, data.fromType, data.targetType);
          break;
        case 'folder_move':
          await this.renderScriptLists();
          break;
        case 'folder_scripts_toggle':
          this.updateFolderAndScriptsUI(data.folderId, data.type, data.enable);
          break;
        case 'load_default_scripts':
          await this.loadDefaultScriptsRepository();
          break;
        case 'refresh_global_scripts':
          await this.refreshScriptList(ScriptType.GLOBAL);
          break;
        case 'refresh_charact_scripts':
          await this.refreshScriptList(ScriptType.CHARACTER);
          break;
        default:
          log.warn(`[ScriptManager] 未处理的UI刷新事件: ${action}`);
      }
    });

    scriptEvents.on(ScriptRepositoryEventType.BUTTON_ADD, data => {
      const { script } = data;
      this.addButton(script);
    });

    scriptEvents.on(ScriptRepositoryEventType.BUTTON_REMOVE, data => {
      const { scriptId } = data;
      this.buttonManager.removeButtonsByScriptId(scriptId);
    });

    scriptEvents.on(ScriptRepositoryEventType.SCRIPT_EDIT, async data => {
      const { type, scriptId } = data;
      await this.openScriptEditor(type, scriptId);
    });

    scriptEvents.on(ScriptRepositoryEventType.FOLDER_CREATE, async data => {
      const { name, type, icon, color } = data;
      await this.handleFolderCreate(name, type, icon, color);
    });

    scriptEvents.on(ScriptRepositoryEventType.FOLDER_EDIT, async data => {
      const { folderId, newName, type, newIcon, newColor } = data;
      await this.handleFolderEdit(folderId, newName, type, newIcon, newColor);
    });

    scriptEvents.on(ScriptRepositoryEventType.FOLDER_DELETE, async data => {
      const { folderId, type } = data;
      await this.handleFolderDelete(folderId, type);
    });

    scriptEvents.on(ScriptRepositoryEventType.FOLDER_SCRIPTS_TOGGLE, async data => {
      const { folderId, type, enable } = data;
      await this.handleFolderScriptsToggle(folderId, type, enable);
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
    this.clearScriptList(ScriptType.GLOBAL);
    this.clearScriptList(ScriptType.CHARACTER);

    await this.renderRepository(ScriptType.GLOBAL);

    await this.renderRepository(ScriptType.CHARACTER);
  }

  /**
   * 渲染指定类型的脚本仓库
   * @param type 脚本类型
   */
  private async renderRepository(type: ScriptType): Promise<void> {
    const repositoryItems =
      type === ScriptType.GLOBAL
        ? this.scriptManager.getGlobalRepositoryItems()
        : this.scriptManager.getCharacterRepositoryItems();

    if (repositoryItems.length > 0) {
      for (const item of repositoryItems) {
        if (item.type === 'folder') {
          await this.renderFolder(item, type);
        } else {
          await this.addScriptToContainer(item.value as Script, type);
        }
      }
    } else {
      this.showEmptyScriptListTip(type);
    }

    this.setupDraggable(type);
  }

  /**
   * 清除指定类型的脚本列表
   * @param type 脚本类型
   */
  private clearScriptList(type: ScriptType): void {
    $(getScriptListSelector(type)).empty();
  }

  /**
   * 刷新指定类型的脚本列表
   * @param type 脚本类型
   */
  private async refreshScriptList(type: ScriptType): Promise<void> {
    this.clearScriptList(type);

    await this.renderRepository(type);

    const isEnabled =
      type === ScriptType.GLOBAL
        ? this.scriptManager.isGlobalScriptEnabled
        : this.scriptManager.isCharacterScriptEnabled;
    const toggleSelector = getScriptToggleSelector(type);
    $(toggleSelector).prop('checked', isEnabled);
  }

  /**
   * 显示空脚本列表提示
   * @param type 脚本类型
   */
  private showEmptyScriptListTip(type: ScriptType): void {
    const container = $(getScriptListSelector(type));
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
    const $toggle = $(getScriptToggleSelector(type));
    $toggle.prop('checked', enable);
  }

  /**
   * 更新文件夹及其内部脚本的UI状态
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param enable 是否启用
   */
  private updateFolderAndScriptsUI(folderId: string, type: ScriptType, enable: boolean): void {
    const $folder = $(`#${folderId}`);
    if ($folder.length > 0) {
      this.updateFolderToggleState($folder, folderId, type);

      const $folderContent = $folder.find('.folder-content');
      $folderContent.find('.script-item').each((_, element) => {
        const $script = $(element);
        const $toggle = $script.find('.script-toggle');

        if (enable) {
          $toggle.addClass('enabled');
          $toggle.find('i.fa-toggle-off').hide();
          $toggle.find('i.fa-toggle-on').show();
        } else {
          $toggle.removeClass('enabled');
          $toggle.find('i.fa-toggle-off').show();
          $toggle.find('i.fa-toggle-on').hide();
        }
      });
    }
  }

  /**
   * 增量更新脚本UI
   * @param script 脚本对象
   * @param type 脚本类型
   */
  private updateScriptUI(script: Script, type: ScriptType): void {
    const $existingScript = $(`#${CSS.escape(script.id)}`);

    if ($existingScript.length === 0) {
      this.addScriptToContainer(script, type);
      return;
    }

    $existingScript.find('.script-item-name').text(script.name);

    const $toggle = $existingScript.find('.script-toggle');
    if (script.enabled) {
      $toggle.addClass('enabled');
      $toggle.find('i.fa-toggle-off').hide();
      $toggle.find('i.fa-toggle-on').show();
    } else {
      $toggle.removeClass('enabled');
      $toggle.find('i.fa-toggle-off').show();
      $toggle.find('i.fa-toggle-on').hide();
    }

    const $moveButton = $existingScript.find('.script-storage-location');
    $moveButton.removeClass('move-to-character move-to-global');
    $moveButton.addClass(type === 'global' ? 'move-to-character' : 'move-to-global');

    const $moveIcon = $moveButton.find('i');
    $moveIcon.removeClass('fa-arrow-down fa-arrow-up');
    $moveIcon.addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

    this.rebindScriptEvents($existingScript, script, type);
  }

  /**
   * 重新绑定脚本事件
   * @param $scriptElement 脚本DOM元素
   * @param script 脚本对象
   * @param type 脚本类型
   */
  private rebindScriptEvents($scriptElement: JQuery<HTMLElement>, script: Script, type: ScriptType): void {
    $scriptElement.find('.script-toggle').off('click.scriptToggle');
    $scriptElement.find('.script-info').off('click.scriptInfo');
    $scriptElement.find('.edit-script').off('click.scriptEdit');
    $scriptElement.find('.script-storage-location').off('click.scriptMove');
    $scriptElement.find('.export-script').off('click.scriptExport');
    $scriptElement.find('.delete-script').off('click.scriptDelete');

    const $toggleButton = $scriptElement.find('.script-toggle');
    $toggleButton.on('click.scriptToggle', function () {
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

    $scriptElement.find('.script-info').on('click.scriptInfo', () => {
      const scriptInfo = script.info || '';
      const htmlText = renderMarkdown(scriptInfo);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
    });

    $scriptElement.find('.edit-script').on('click.scriptEdit', e => {
      e.preventDefault();
      e.stopPropagation();
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, { type, scriptId: script.id });
    });

    $scriptElement.find('.script-storage-location').on('click.scriptMove', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_MOVE, { script, fromType: type });
    });

    $scriptElement.find('.export-script').on('click.scriptExport', async () => {
      const fileName = `${script.name.replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, '_').toLowerCase()}.json`;
      const scriptData = await this.checkScriptDataAndGetExportData(script);

      if (scriptData === null) {
        return;
      }

      const fileData = JSON.stringify(scriptData, null, 2);
      download(fileData, fileName, 'application/json');
    });

    $scriptElement.find('.delete-script').on('click.scriptDelete', async () => {
      const confirm = await callGenericPopup('确定要删除这个脚本吗？', POPUP_TYPE.CONFIRM);

      if (!confirm) {
        return;
      }

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_DELETE, { scriptId: script.id, type });
      $scriptElement.remove();
    });
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
    $(`#${script.id}`).remove();

    const sourceList = fromType === ScriptType.GLOBAL ? $('#global-script-list') : $('#character-script-list');
    if (sourceList.children().length === 0) {
      this.showEmptyScriptListTip(fromType);
    }

    scriptEvents.emit(ScriptRepositoryEventType.UI_REFRESH, {
      action: 'script_import',
      script,
      type: targetType,
    });
  }

  /**
   * 向容器添加脚本元素
   * @param script 脚本
   * @param type 脚本类型
   */
  private async addScriptToContainer(script: Script, type: ScriptType): Promise<void> {
    const $scriptElement = await this.createScriptElement(script, type);
    const list = $(getScriptListSelector(type));

    const $emptyTip = list.find('small');
    if ($emptyTip.length > 0) {
      $emptyTip.remove();
    }

    list.append($scriptElement);
  }

  /**
   * 设置脚本拖拽排序
   * @param type 脚本类型
   */
  private setupDraggable(type: ScriptType): void {
    const list = $(getScriptListSelector(type));

    list.sortable({
      delay: getSortableDelay(),
      items: '.script-item, .script-folder',
      handle: '.drag-handle',
      cursor: 'move',
      tolerance: 'pointer',
      placeholder: 'sortable-placeholder',
      connectWith: '.folder-content',

      stop: async _event => {
        await this.handleDragStop(type);
      },
    });

    this.setupFolderDropZones(type);
  }

  /**
   * 设置文件夹拖拽功能
   * @param type 脚本类型
   */
  private setupFolderDraggable(type: ScriptType): void {
    const list = $(getScriptListSelector(type));

    list.find('.folder-content').sortable({
      delay: getSortableDelay(),
      items: '.script-item',
      handle: '.drag-handle',
      cursor: 'move',
      tolerance: 'pointer',
      placeholder: 'sortable-placeholder',
      connectWith: `${getScriptListSelector(type)}, .folder-content`,
      stop: async _event => {
        await this.handleDragStop(type);
      },
    });
  }

  /**
   * 设置文件夹拖拽接收区域
   * @param type 脚本类型
   */
  private setupFolderDropZones(type: ScriptType): void {
    const list = $(getScriptListSelector(type));

    list.find('.script-folder').each((_, folderElement) => {
      this.setupSingleFolderDropZone($(folderElement), type);
    });
  }

  /**
   * 为单个文件夹设置拖拽接收区域
   * @param $folder 文件夹jQuery对象
   * @param type 脚本类型
   */
  private setupSingleFolderDropZone($folder: JQuery<HTMLElement>, type: ScriptType): void {
    const $folderContent = $folder.find('.folder-content');

    $folder.off('.dragdrop');

    $folder.on('dragover dragenter dragleave drop', function (e) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    $folder.droppable({
      accept: '.script-item[data-script-repository="true"]',
      tolerance: 'pointer',
      greedy: true,
      over: (_event, ui) => {
        if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

        const isFromSameFolder = ui.draggable.closest('.script-folder').attr('id') === $folder.attr('id');
        if (isFromSameFolder) return;

        $folder.addClass('folder-drag-target');

        if (!$folderContent.is(':visible')) {
          $folderContent.slideDown(200);
          $folder.find('.folder-toggle').addClass('expanded');
        }
      },
      out: (_event, ui) => {
        if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

        const isFromSameFolder = ui.draggable.closest('.script-folder').attr('id') === $folder.attr('id');
        if (isFromSameFolder) return;

        $folder.removeClass('folder-drag-target');
      },
      drop: async (event, ui) => {
        if (event.originalEvent) {
          event.originalEvent.preventDefault();
          event.originalEvent.stopPropagation();
        }
        event.preventDefault();
        event.stopImmediatePropagation();

        if (!ui.draggable.hasClass('script-item') || !ui.draggable.attr('data-script-repository')) return;

        const scriptId = ui.draggable.attr('id');
        const folderId = $folder.attr('id');

        const isFromSameFolder = ui.draggable.closest('.script-folder').attr('id') === folderId;
        if (isFromSameFolder) {
          $folder.removeClass('folder-drag-target');
          return false;
        }

        if (scriptId && folderId) {
          try {
            const success = await this.handleScriptDropToFolder(scriptId, folderId, type, ui.draggable);

            if (!success) {
              $folder.removeClass('folder-drag-target');
              setTimeout(async () => {
                await this.renderScriptLists();
              }, 100);
              return false;
            }
          } catch (error) {
            log.error('[ScriptManager] 拖拽脚本到文件夹失败:', error);
            toastr.error(`移动脚本失败: ${error instanceof Error ? error.message : String(error)}`);

            $folder.removeClass('folder-drag-target');
            setTimeout(async () => {
              await this.renderScriptLists();
            }, 100);
            return false;
          }
        }

        $folder.removeClass('folder-drag-target');

        return false;
      },
    });
  }

  /**
   * 处理脚本拖拽到文件夹的事件
   * @param scriptId 脚本ID
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param $draggedElement 拖拽的元素
   * @returns 是否成功移动脚本
   */
  private async handleScriptDropToFolder(
    scriptId: string,
    folderId: string,
    type: ScriptType,
    $draggedElement: JQuery<HTMLElement>,
  ): Promise<boolean> {
    try {
      const repository =
        type === ScriptType.GLOBAL
          ? this.scriptManager.getGlobalRepositoryItems()
          : this.scriptManager.getCharacterRepositoryItems();

      const folder = repository.find(item => item.type === 'folder' && item.id === folderId);
      if (folder) {
        const scripts = folder.value as Script[];
        const scriptExists = scripts.some(script => script.id === scriptId);

        if (scriptExists) {
          toastr.info('脚本已经在该文件夹中');
          return false;
        }
      }

      await this.scriptManager.moveScriptToFolder(scriptId, folderId, type);

      const $targetFolder = $(`#${folderId}`);
      const $folderContent = $targetFolder.find('.folder-content');

      if (!$folderContent.is(':visible')) {
        $folderContent.show();
        $targetFolder.find('.folder-toggle').addClass('expanded');
      }

      $draggedElement.detach().prependTo($folderContent);

      return true;
    } catch (error) {
      log.error('[ScriptManager] 移动脚本到文件夹失败:', error);
      throw error;
    }
  }

  /**
   * 处理拖拽结束事件
   * @param ui jQuery UI 拖拽事件对象
   * @param type 脚本类型
   */
  private async handleDragStop(type: ScriptType): Promise<void> {
    try {
      const repositoryItems = await this.buildRepositoryFromDOM(type);

      scriptEvents.emit(ScriptRepositoryEventType.ORDER_CHANGED, {
        data: repositoryItems,
        type,
      });
    } catch (error) {
      log.error('[ScriptManager] handleDragStop: 处理拖拽结束失败:', error);
    }
  }
  /**
   * 从DOM构建仓库结构
   * @param type 脚本类型
   */
  private async buildRepositoryFromDOM(type: ScriptType): Promise<ScriptRepositoryItem[]> {
    const list = $(getScriptListSelector(type));
    const repository: ScriptRepositoryItem[] = [];

    for (const element of list.children().get()) {
      const $element = $(element);

      if ($element.hasClass('script-folder')) {
        const folderId = $element.attr('id')!;
        const folderName = $element.find('.folder-name').text();
        const folderIcon =
          $element
            .find('.folder-icon i')
            .attr('class')
            ?.split(' ')
            .find(cls => cls.startsWith('fa-')) || 'fa-folder';
        const folderColor =
          $element.find('.folder-icon').css('color') ||
          document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');

        const scripts: Script[] = [];
        const $folderContent = $element.find('.folder-content');

        for (const scriptElement of $folderContent.children('.script-item').get()) {
          const scriptId = $(scriptElement).attr('id')!;
          const script = this.scriptManager.getScriptById(scriptId);
          if (script) {
            scripts.push(script);
          }
        }

        repository.push({
          type: 'folder',
          id: folderId,
          name: folderName,
          icon: folderIcon,
          color: folderColor,
          value: scripts,
        });
      } else if ($element.hasClass('script-item')) {
        const scriptId = $element.attr('id')!;
        const script = this.scriptManager.getScriptById(scriptId);
        if (script) {
          repository.push({
            type: 'script',
            value: script,
          });
        }
      }
    }

    return repository;
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

    const tempId = `default_lib_${script.id}`;
    scriptHtml.attr('id', tempId);

    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-info').on('click', () => {
      const htmlText = renderMarkdown(script.info);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
    });

    scriptHtml.find('.add-script').on('click', async () => {
      let target: ScriptType = ScriptType.GLOBAL;
      const template = $(
        await renderExtensionTemplateAsync(this.templatePath, 'script_target_selector', {
          title: '添加到:',
          prefix: 'script-add',
          globalLabel: '全局脚本库',
          characterLabel: '角色脚本库',
        }),
      );
      template.find('#script-add-target-global').on('input', () => (target = ScriptType.GLOBAL));
      template.find('#script-add-target-character').on('input', () => (target = ScriptType.CHARACTER));
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

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_CREATE, { script: newScript, type: target });

      toastr.success(`脚本"${newScript.name}"已添加到${target === ScriptType.GLOBAL ? '全局' : '角色'}脚本库`);
    });

    return scriptHtml;
  }

  /**
   * 创建默认脚本库容器
   * 避免重复渲染模板
   */
  private createDefaultScriptContainer(): JQuery<HTMLElement> {
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

    this.updateVariableListVisibility($editorHtml);

    if (scriptId) {
      script = this.scriptManager.getScriptById(scriptId);

      if (script) {
        $editorHtml.find('#script-name-input').val(script.name);
        $editorHtml.find('#script-content-textarea').val(script.content);
        $editorHtml.find('#script-info-textarea').val(script.info);

        if (script.data && Object.keys(script.data).length > 0) {
          this.loadVariablesToEditor($editorHtml, script.data);
        }

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

    $editorHtml.find('#add-variable-trigger').on('click', () => {
      this.addVariableToEditor($editorHtml);
    });

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

    $editorHtml.find('#script-button-content .button-list').sortable({
      handle: '.drag-handle',
      items: '.button-item',
    });

    $editorHtml.on('click', '.delete-button', (e: JQuery.ClickEvent) => {
      $(e.currentTarget).closest('.button-item').remove();
    });

    $editorHtml.on('click', '.delete-variable', (e: JQuery.ClickEvent) => {
      $(e.currentTarget).closest('.variable-item').remove();
      this.updateVariableListVisibility($editorHtml);
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

    const variableData = this.collectVariablesFromEditor($editorHtml);

    const buttons: { name: string; visible: boolean }[] = [];
    $editorHtml.find('.button-list .button-item').each(function () {
      const buttonName = $(this).find('.button-name').val() as string;
      const visible = $(this).find('.button-visible').prop('checked') as boolean;
      if (buttonName && buttonName.trim() !== '') {
        buttons.push({ name: buttonName, visible });
      }
    });

    if (!script) {
      script = new Script({
        id: uuidv4(),
        name: scriptName,
        content: scriptContent,
        info: scriptInfo,
        enabled: false,
        buttons,
        data: variableData,
      });

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_CREATE, { script, type });
    } else {
      const wasEnabled = script.enabled;

      scriptEvents.emit(ScriptRepositoryEventType.BUTTON_REMOVE, { scriptId: script.id });

      script.name = scriptName;
      script.content = scriptContent;
      script.info = scriptInfo;
      script.buttons = buttons;
      script.data = variableData;

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_UPDATE, { script, type });

      if (wasEnabled) {
        try {
          await this.scriptManager.stopScript(script, type);
          await this.scriptManager.runScript(script, type);
        } catch (error) {
          log.error(`[ScriptManager] 重启脚本失败: ${script.name}`, error);
          toastr.error(`重启脚本失败: ${script.name}`);
        }
      }
    }
  }

  /**
   * 将变量数据加载到编辑器中
   * @param $editorHtml 编辑器HTML元素
   * @param data 变量数据
   */
  private loadVariablesToEditor($editorHtml: JQuery<HTMLElement>, data: { [key: string]: any }): void {
    const $variableList = $editorHtml.find('#variable-list');

    for (const [key, value] of Object.entries(data)) {
      const $variableItem = this.createVariableItem(key, value);
      $variableList.append($variableItem);
    }

    this.updateVariableListVisibility($editorHtml);
  }

  /**
   * 添加新变量到编辑器
   * @param $editorHtml 编辑器HTML元素
   */
  private addVariableToEditor($editorHtml: JQuery<HTMLElement>): void {
    const $variableList = $editorHtml.find('#variable-list');
    const $variableItem = this.createVariableItem('', '');
    $variableList.append($variableItem);

    this.updateVariableListVisibility($editorHtml);
  }

  /**
   * 更新变量列表的可见性
   * @param $editorHtml 编辑器HTML元素
   */
  private updateVariableListVisibility($editorHtml: JQuery<HTMLElement>): void {
    const $variableList = $editorHtml.find('#variable-list');
    const variableCount = $variableList.find('.variable-item').length;

    if (variableCount === 0) {
      $variableList.hide();
    } else {
      $variableList.show();
    }
  }

  /**
   * 创建变量项元素
   * @param key 变量键
   * @param value 变量值
   * @returns JQuery元素
   */
  private createVariableItem(key: string, value: any): JQuery<HTMLElement> {
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);

    const $variableItem = $(`
      <div class="variable-item flex-container flexFlowColumn width100p">
        <div class="flex flexFlowColumn">
        <div class="flex-container alignitemscenter spaceBetween wide100p">
          <div>名称:</div>
          <div class="menu_button interactable delete-variable" title="删除变量">
            <i class="fa-solid fa-trash"></i>
          </div>
          </div>
          <input type="text" class="text_pole variable-key" value="${this.escapeHtml(key)}" placeholder="变量名">
        </div>
        <div class="flex flexFlowColumn" style="align-items: flex-start;">
          <div>值:</div>
          <textarea class="text_pole variable-value" style="min-height: 12px;" rows="1" placeholder="变量值">${this.escapeHtml(
            valueStr,
          )}</textarea>
        </div>
      <hr>
      </div>
    `);

    return $variableItem;
  }

  /**
   * 从编辑器收集变量数据
   * @param $editorHtml 编辑器HTML元素
   * @returns 变量数据对象
   */
  private collectVariablesFromEditor($editorHtml: JQuery<HTMLElement>): { [key: string]: any } {
    const variables: { [key: string]: any } = {};

    $editorHtml.find('#variable-list .variable-item').each(function () {
      const key = $(this).find('.variable-key').val() as string;
      const valueStr = $(this).find('.variable-value').val() as string;

      if (key && key.trim() !== '') {
        let value: any;
        try {
          value = JSON.parse(valueStr);
        } catch {
          value = valueStr;
        }
        variables[key.trim()] = value;
      }
    });

    return variables;
  }

  /**
   * HTML转义辅助函数
   * @param text 要转义的文本
   * @returns 转义后的文本
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

  /**
   * 渲染单个文件夹
   * @param folderItem 文件夹项
   * @param type 脚本类型
   */
  private async renderFolder(folderItem: ScriptRepositoryItem, type: ScriptType): Promise<void> {
    const container = $(getScriptListSelector(type));
    if (!this.folderTemplate) {
      await this.initializeTemplates();
    }

    const folderId = folderItem.id!;
    const folderName = folderItem.name!;
    const folderIcon = folderItem.icon || 'fa-folder';
    const folderColor = folderItem.color || document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');

    const moveIcon = type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up';
    const moveClass = type === 'global' ? 'move-to-character' : 'move-to-global';
    const moveTitle = type === 'global' ? '移动到角色脚本库' : '移动到全局脚本库';

    const folderHtml = $(
      await renderExtensionTemplateAsync(this.templatePath, 'folder_template', {
        folderId,
        folderName,
        folderIcon,
        folderColor,
        moveIcon,
        moveClass,
        moveTitle,
      }),
    );

    this.bindFolderEvents(folderHtml, folderId, folderColor, type);

    const scripts = folderItem.value as Script[];
    const folderContent = folderHtml.find('.folder-content');
    for (const script of scripts) {
      const scriptElement = await this.createScriptElement(script, type);
      folderContent.append(scriptElement);
    }

    container.append(folderHtml);

    this.setupFolderDraggable(type);

    this.setupSingleFolderDropZone(folderHtml, type);
  }

  /**
   * 绑定文件夹相关事件和设置图标颜色
   * @param folderHtml 文件夹HTML元素
   * @param folderId 文件夹ID
   * @param folderColor 文件夹颜色
   * @param type 脚本类型
   */
  private bindFolderEvents(
    folderHtml: JQuery<HTMLElement>,
    folderId: string,
    folderColor: string,
    type: ScriptType,
  ): void {
    folderHtml.find('.folder-header').on('click', e => {
      if ($(e.target).closest('.folder-control').length > 0) return;
      if ($(e.target).closest('.folder-checkbox').length > 0 || $(e.target).hasClass('folder-checkbox')) return;

      const content = folderHtml.find('.folder-content');
      const toggle = folderHtml.find('.folder-toggle');

      if (content.is(':visible')) {
        content.slideUp();
        toggle.removeClass('expanded');
      } else {
        content.slideDown();
        toggle.addClass('expanded');
      }
    });

    const $folderToggle = folderHtml.find('.folder-script-toggle');
    $folderToggle.on('click', e => {
      e.stopPropagation();

      const isEnabled = $folderToggle.hasClass('enabled');
      const newState = !isEnabled;

      if (newState) {
        $folderToggle.addClass('enabled');
        $folderToggle.find('i.fa-toggle-off').hide();
        $folderToggle.find('i.fa-toggle-on').show();
      } else {
        $folderToggle.removeClass('enabled');
        $folderToggle.find('i.fa-toggle-off').show();
        $folderToggle.find('i.fa-toggle-on').hide();
      }

      scriptEvents.emit(ScriptRepositoryEventType.FOLDER_SCRIPTS_TOGGLE, {
        folderId,
        type,
        enable: newState,
      });
    });

    folderHtml.find('.folder-edit').on('click', e => {
      e.stopPropagation();
      this.showEditFolderDialog(folderId, type);
    });

    folderHtml.find('.folder-export').on('click', e => {
      e.stopPropagation();
      this.exportFolder(folderId, type);
    });

    folderHtml.find('.folder-move').on('click', e => {
      e.stopPropagation();
      scriptEvents.emit(ScriptRepositoryEventType.FOLDER_MOVE, {
        folderId,
        fromType: type,
      });
    });

    folderHtml.find('.folder-delete').on('click', e => {
      e.stopPropagation();
      this.showDeleteFolderDialog(folderId, type);
    });

    folderHtml.find('.folder-icon').css('color', folderColor);

    this.updateFolderToggleState(folderHtml, folderId, type);
  }

  /**
   * 更新文件夹开关的UI状态
   * @param folderHtml 文件夹HTML元素
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  private updateFolderToggleState(folderHtml: JQuery<HTMLElement>, folderId: string, type: ScriptType): void {
    const state = this.scriptManager.getFolderScriptsState(folderId, type);
    const $folderToggle = folderHtml.find('.folder-script-toggle');

    $folderToggle.removeClass('enabled');

    if (state === 'all') {
      $folderToggle.addClass('enabled');
      $folderToggle.find('i.fa-toggle-off').hide();
      $folderToggle.find('i.fa-toggle-on').show();
    } else {
      $folderToggle.find('i.fa-toggle-off').show();
      $folderToggle.find('i.fa-toggle-on').hide();
    }
  }

  /**
   * 更新包含指定脚本的文件夹开关状态
   * @param scriptId 脚本ID
   * @param type 脚本类型
   */
  private updateParentFolderToggle(scriptId: string, type: ScriptType): void {
    const repository =
      type === ScriptType.GLOBAL
        ? this.scriptManager.getGlobalRepositoryItems()
        : this.scriptManager.getCharacterRepositoryItems();

    for (const item of repository) {
      if (item.type === 'folder') {
        const scripts = item.value as Script[];
        const hasScript = scripts.some(script => script.id === scriptId);

        if (hasScript) {
          const $folder = $(`#${item.id}`);
          if ($folder.length > 0) {
            this.updateFolderToggleState($folder, item.id!, type);
          }
          break;
        }
      }
    }
  }

  /**
   * 创建脚本元素
   * @param script 脚本
   * @param type 脚本类型
   */
  private async createScriptElement(script: Script, type: ScriptType): Promise<JQuery<HTMLElement>> {
    if (!this.baseTemplate) {
      await this.initializeTemplates();
    }

    const scriptHtml = this.baseTemplate!.clone();

    scriptHtml.attr('id', script.id);
    scriptHtml.attr('data-script-repository', 'true');
    scriptHtml.find('.script-item-name').text(script.name);
    scriptHtml.find('.script-storage-location').addClass(type === 'global' ? 'move-to-character' : 'move-to-global');
    scriptHtml.find('.script-storage-location i').addClass(type === 'global' ? 'fa-arrow-down' : 'fa-arrow-up');

    const $toggleButton = scriptHtml.find('.script-toggle');
    if (script.enabled) {
      $toggleButton.addClass('enabled');
      $toggleButton.find('i.fa-toggle-off').hide();
      $toggleButton.find('i.fa-toggle-on').show();
    } else {
      $toggleButton.removeClass('enabled');
      $toggleButton.find('i.fa-toggle-off').show();
      $toggleButton.find('i.fa-toggle-on').hide();
    }

    this.bindScriptEvents(scriptHtml, script, type);

    return scriptHtml;
  }

  /**
   * 检查脚本data并询问用户如何处理
   * @param script 脚本对象
   * @returns 处理后的脚本数据（不包含enabled字段），如果用户取消则返回null
   */
  private async checkScriptDataAndGetExportData(script: Script): Promise<any> {
    const { enabled, ...scriptData } = script;

    const hasData = script.data && Object.keys(script.data).length > 0;

    if (hasData) {
      try {
        const choice = await callGenericPopup(
          `脚本 "${script.name}" 包含数据，导出时如何处理？如有API-KEY等敏感数据，注意清除`,
          POPUP_TYPE.TEXT,
          '',
          {
            okButton: '直接导出（包含数据）',
            cancelButton: '取消',
            customButtons: ['清除数据后导出'],
          },
        );

        switch (choice) {
          case 0:
            return null;
          case 1:
            return scriptData;
          case 2:
            return { ...scriptData, data: {} };
          default:
            return null;
        }
      } catch (error) {
        log.error('[ScriptManager] 导出脚本数据选择对话框出错:', error);
        return scriptData;
      }
    }

    return scriptData;
  }

  /**
   * 绑定脚本相关事件
   * @param scriptHtml 脚本HTML元素
   * @param script 脚本对象
   * @param type 脚本类型
   */
  private bindScriptEvents(scriptHtml: JQuery<HTMLElement>, script: Script, type: ScriptType): void {
    const $toggleButton = scriptHtml.find('.script-toggle');
    $toggleButton.on('click.scriptToggle', function () {
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

    scriptHtml.find('.script-info').on('click.scriptInfo', () => {
      const scriptInfo = script.info || '';
      const htmlText = renderMarkdown(scriptInfo);
      callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
    });

    scriptHtml.find('.edit-script').on('click.scriptEdit', e => {
      e.preventDefault();
      e.stopPropagation();
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, { type, scriptId: script.id });
    });

    scriptHtml.find('.script-storage-location').on('click.scriptMove', () => {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_MOVE, { script, fromType: type });
    });

    scriptHtml.find('.export-script').on('click.scriptExport', async () => {
      const fileName = `${script.name.replace(/[\s.<>:"/\\|?*\x00-\x1F\x7F]/g, '_').toLowerCase()}.json`;
      const scriptData = await this.checkScriptDataAndGetExportData(script);

      if (scriptData === null) {
        return;
      }

      const fileData = JSON.stringify(scriptData, null, 2);
      download(fileData, fileName, 'application/json');
    });

    scriptHtml.find('.delete-script').on('click.scriptDelete', async () => {
      const confirm = await callGenericPopup('确定要删除这个脚本吗？', POPUP_TYPE.CONFIRM);

      if (!confirm) {
        return;
      }

      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_DELETE, { scriptId: script.id, type });
      scriptHtml.remove();
    });
  }

  /**
   * 显示新建脚本对话框
   */
  private async showCreateScriptDialog(): Promise<void> {
    let target: ScriptType = ScriptType.GLOBAL;
    const template = $(
      await renderExtensionTemplateAsync(this.templatePath, 'script_target_selector', {
        title: '新建脚本到:',
        prefix: 'script-create',
        globalLabel: '全局脚本库',
        characterLabel: '角色脚本库',
      }),
    );
    template.find('#script-create-target-global').on('input', () => (target = ScriptType.GLOBAL));
    template.find('#script-create-target-character').on('input', () => (target = ScriptType.CHARACTER));

    const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
      okButton: '确认',
      cancelButton: '取消',
    });

    if (result) {
      scriptEvents.emit(ScriptRepositoryEventType.SCRIPT_EDIT, {
        type: target,
      });
    }
  }

  /**
   * 显示创建文件夹对话框
   */
  private async showCreateFolderDialog(): Promise<void> {
    const defaultColor = document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');
    const template = $(await renderExtensionTemplateAsync(this.templatePath, 'folder_create', { defaultColor }, false));

    let folderColor;

    template.find('#folder-icon-preview').on('click', async () => {
      try {
        const selectedIcon = await showFontAwesomePicker();
        if (selectedIcon && selectedIcon.trim() !== '') {
          template.find('#folder-icon-preview').removeClass().addClass(`fa ${selectedIcon}`);
          template.find('#folder-icon-value').val(selectedIcon);
        }
      } catch (error) {
        log.error('[ScriptManager] 图标选择失败:', error);
      }
    });

    template.find('#folder-color-picker').on('change', evt => {
      // @ts-ignore
      folderColor = evt.detail?.rgba;
    });

    const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
      okButton: '创建',
      cancelButton: '取消',
    });

    if (!result) {
      return;
    }

    const folderName = template.find('#folder-name-input').val() as string;
    const folderIcon = template.find('#folder-icon-value').val() as string;
    const selectedType = template.find('#folder-target-global').prop('checked')
      ? ScriptType.GLOBAL
      : ScriptType.CHARACTER;

    if (!folderName || folderName.trim() === '') {
      toastr.error('请输入文件夹名称');
      return;
    }

    try {
      const existingFolders =
        selectedType === ScriptType.GLOBAL
          ? this.scriptManager.getGlobalRepositoryItems()
          : this.scriptManager.getCharacterRepositoryItems();

      const folderExists = existingFolders.some(item => item.type === 'folder' && item.name === folderName.trim());

      if (folderExists) {
        toastr.error(
          `${selectedType === ScriptType.GLOBAL ? '全局' : '角色'}脚本库中已存在名为 "${folderName.trim()}" 的文件夹`,
        );
        return;
      }

      scriptEvents.emit(ScriptRepositoryEventType.FOLDER_CREATE, {
        name: folderName.trim(),
        type: selectedType,
        icon: folderIcon,
        color: folderColor,
      });
    } catch (error) {
      log.error('[ScriptManager] 创建文件夹失败:', error);
      toastr.error(`创建文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 显示编辑文件夹对话框
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  private async showEditFolderDialog(folderId: string, type: ScriptType): Promise<void> {
    const currentName = $(`#${folderId} .folder-name`).text();

    const repository =
      type === ScriptType.GLOBAL
        ? this.scriptManager.getGlobalRepositoryItems()
        : this.scriptManager.getCharacterRepositoryItems();
    const folder = repository.find(item => item.type === 'folder' && item.id === folderId);
    const currentIcon = folder?.icon || 'fa-folder';
    const currentColorRgba = folder?.color || document.documentElement.style.getPropertyValue('--SmartThemeBodyColor');
    let newColor;

    const template = $(`
      <div class="folder-edit-dialog">
      <h3>编辑文件夹</h3>
      <div class="flex-container flexFlowColumn wide100p padding10 justifyLeft">
        <div>
          <h4>文件夹名称:</h4>
          <input type="text" id="folder-name-input" class="text_pole" value="${currentName}" />
        </div>
        <div>
          <h4>文件夹图标:</h4>
          <div class="flex" style="gap: 20px; margin: 5px 0; width: 100%;">
            <div class="flex alignItemsCenter">
            <label>选择颜色</label>
            <toolcool-color-picker id="folder-color-picker" color="${currentColorRgba}"></toolcool-color-picker>
            </div>
            <div class="flex-container alignItemsCenter">
             <label>选择图标</label>
              <i id="folder-icon-preview" class="fa ${currentIcon} marginRight10" style="cursor: pointer; font-size: 12px; padding: 4px; border: 1px solid #ccc; border-radius: 4px;" title="点击选择图标"></i>
              <input type="hidden" id="folder-icon-value" value="${currentIcon}" />
            </div>
          </div>
        </div>
      </div>
    `);

    template.find('#folder-icon-preview').on('click', async () => {
      try {
        const selectedIcon = await showFontAwesomePicker();
        if (selectedIcon && selectedIcon.trim() !== '') {
          template.find('#folder-icon-preview').removeClass().addClass(`fa ${selectedIcon}`);
          template.find('#folder-icon-value').val(selectedIcon);
        }
      } catch (error) {
        log.error('[ScriptManager] 图标选择失败:', error);
      }
    });
    template.find('#folder-color-picker').on('change', evt => {
      // @ts-ignore
      newColor = evt.detail?.rgba;
    });

    const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
      okButton: '保存',
      cancelButton: '取消',
    });

    if (!result) {
      return;
    }

    const newName = template.find('#folder-name-input').val() as string;
    const newIcon = template.find('#folder-icon-value').val() as string;

    scriptEvents.emit(ScriptRepositoryEventType.FOLDER_EDIT, {
      folderId,
      newName: newName?.trim() || currentName,
      type,
      newIcon: newIcon,
      newColor: newColor,
    });
  }

  /**
   * 导出文件夹为压缩包
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  private async exportFolder(folderId: string, type: ScriptType): Promise<void> {
    try {
      const repository =
        type === ScriptType.GLOBAL
          ? this.scriptManager.getGlobalRepositoryItems()
          : this.scriptManager.getCharacterRepositoryItems();

      const folder = repository.find(item => item.type === 'folder' && item.id === folderId);

      if (!folder) {
        toastr.error('未找到指定的文件夹');
        return;
      }
      //@ts-ignore
      if (!window.JSZip) {
        await import('@sillytavern/lib/jszip.min.js');
      }
      //@ts-ignore
      const zip = new JSZip();

      const folderName = folder.name || 'folder';
      const sanitizedFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

      if (Array.isArray(folder.value)) {
        let cancelExport = false;

        for (const script of folder.value) {
          const scriptData = await this.checkScriptDataAndGetExportData(script);

          if (scriptData === null) {
            cancelExport = true;
            break;
          }

          const scriptFileName = `${script.name.replace(/[<>:"/\\|?*]/g, '_')}.json`;
          zip.file(`${sanitizedFolderName}/${scriptFileName}`, JSON.stringify(scriptData, null, 2));
        }

        if (cancelExport) {
          return;
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const typeName = type === ScriptType.GLOBAL ? 'global' : 'character';
      const filename = `folder_${sanitizedFolderName}_${typeName}_${timestamp}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastr.success(`文件夹 "${folder.name}" 导出成功`);
    } catch (error) {
      log.error('[ScriptManager] 导出文件夹失败:', error);
      toastr.error(`导出文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 显示删除文件夹确认对话框
   * @param folderId 文件夹ID
   * @param type 脚本类型
   */
  private async showDeleteFolderDialog(folderId: string, type: ScriptType): Promise<void> {
    const repository =
      type === ScriptType.GLOBAL
        ? this.scriptManager.getGlobalRepositoryItems()
        : this.scriptManager.getCharacterRepositoryItems();

    const folder = repository.find(item => item.type === 'folder' && item.id === folderId);
    const folderName = folder?.name || '未知文件夹';

    const result = await callGenericPopup(
      `确定要删除文件夹 "${folderName}" 及其中的所有脚本吗？此操作不可撤销。`,
      POPUP_TYPE.CONFIRM,
      '',
      { okButton: '删除', cancelButton: '取消' },
    );

    if (result) {
      scriptEvents.emit(ScriptRepositoryEventType.FOLDER_DELETE, {
        folderId,
        type,
      });
    }
  }

  /**
   * 设置搜索功能事件
   */
  private setupSearchEvents(): void {
    const searchInput = $('#script-search-input');

    searchInput.on('input', event => {
      const query = (event.target as HTMLInputElement).value.trim();
      if (query) {
        this.performSearch(query);
      } else {
        this.clearSearch();
      }
    });

    searchInput.on('keypress', event => {
      if (event.which === 13) {
        const query = searchInput.val() as string;
        if (query && query.trim()) {
          this.performSearch(query.trim());
        }
      }
    });
  }

  /**
   * 执行搜索
   * @param query 搜索关键词
   */
  private performSearch(query: string): void {
    if (!query) {
      this.clearSearch();
      return;
    }

    const globalScripts = this.scriptManager.getGlobalScripts();
    const characterScripts = this.scriptManager.getCharacterScripts();

    const globalMatches = this.searchScripts(globalScripts, query);
    const characterMatches = this.searchScripts(characterScripts, query);

    this.displaySearchResults(globalMatches, characterMatches);
  }

  /**
   * 在脚本数组中搜索匹配的脚本
   * @param scripts 脚本数组
   * @param query 搜索关键词
   * @returns 匹配的脚本数组
   */
  private searchScripts(scripts: Script[], query: string): Script[] {
    const lowerQuery = query.toLowerCase();
    return scripts.filter(script => script.name.toLowerCase().includes(lowerQuery));
  }

  /**
   * 显示搜索结果
   * @param globalMatches 全局脚本匹配结果
   * @param characterMatches 角色脚本匹配结果
   */
  private async displaySearchResults(globalMatches: Script[], characterMatches: Script[]): Promise<void> {
    this.clearScriptList(ScriptType.GLOBAL);
    this.clearScriptList(ScriptType.CHARACTER);

    const globalContainer = $('#global-script-list');
    if (globalMatches.length > 0) {
      for (const script of globalMatches) {
        await this.addScriptToContainer(script, ScriptType.GLOBAL);
      }
    } else {
      globalContainer.append('<small>无匹配的全局脚本</small>');
    }

    const characterContainer = $('#character-script-list');
    if (characterMatches.length > 0) {
      for (const script of characterMatches) {
        await this.addScriptToContainer(script, ScriptType.CHARACTER);
      }
    } else {
      characterContainer.append('<small>无匹配的角色脚本</small>');
    }
  }

  /**
   * 清除搜索结果，恢复正常显示
   */
  private clearSearch(): void {
    this.renderScriptLists();
  }

  /**
   * 设置批量操作事件
   */
  private setupBatchOperationEvents(): void {
    $('#global-batch-manager').on('click', () => {
      this.toggleBatchMode(ScriptType.GLOBAL);
    });

    $('#character-batch-manager').on('click', () => {
      this.toggleBatchMode(ScriptType.CHARACTER);
    });

    $('#global-batch-delete').on('click', () => {
      this.performBatchDelete(ScriptType.GLOBAL);
    });

    $('#global-batch-export').on('click', () => {
      this.performBatchExport(ScriptType.GLOBAL);
    });

    $('#global-batch-move').on('click', () => {
      this.performBatchMove(ScriptType.GLOBAL);
    });

    $('#global-batch-cancel').on('click', () => {
      this.exitBatchMode(ScriptType.GLOBAL);
    });

    $('#character-batch-delete').on('click', () => {
      this.performBatchDelete(ScriptType.CHARACTER);
    });

    $('#character-batch-export').on('click', () => {
      this.performBatchExport(ScriptType.CHARACTER);
    });

    $('#character-batch-move').on('click', () => {
      this.performBatchMove(ScriptType.CHARACTER);
    });

    $('#character-batch-cancel').on('click', () => {
      this.exitBatchMode(ScriptType.CHARACTER);
    });
  }

  /**
   * 切换批量模式
   * @param type 脚本类型
   */
  private toggleBatchMode(type: ScriptType): void {
    const isBatchMode = type === ScriptType.GLOBAL ? this.batchModeGlobal : this.batchModeCharacter;

    if (isBatchMode) {
      this.exitBatchMode(type);
    } else {
      this.enterBatchMode(type);
    }
  }

  /**
   * 进入批量模式
   * @param type 脚本类型
   */
  private enterBatchMode(type: ScriptType): void {
    const listSelector = getScriptListSelector(type);
    const controlsSelector = getBatchControlsSelector(type);

    if (type === ScriptType.GLOBAL) {
      this.batchModeGlobal = true;
    } else {
      this.batchModeCharacter = true;
    }

    $(controlsSelector).show();

    const $list = $(listSelector);

    $list.find('.script-item').each((_, element) => {
      const $element = $(element);
      $element.addClass('batch-mode');
      $element.find('.script-checkbox').show();
      $element.find('.drag-handle').hide();
      $element.find('.script-item-control').hide();

      $element
        .find('.script-checkbox')
        .off('change.batch')
        .on('change.batch', () => {
          this.handleCheckboxChange($element);
        });
    });

    $list.find('.script-folder').each((_, element) => {
      const $element = $(element);
      $element.addClass('batch-mode');
      $element.find('.folder-checkbox').show();
      $element.find('.drag-handle').hide();
      $element.find('.folder-control .folder-script-toggle').hide();
      $element.find('.folder-control .folder-edit').hide();
      $element.find('.folder-control .folder-export').hide();
      $element.find('.folder-control .folder-move').hide();
      $element.find('.folder-control .folder-delete').hide();

      $element
        .find('.folder-checkbox')
        .off('change.batch')
        .on('change.batch', () => {
          this.handleCheckboxChange($element);
        });
    });
  }

  /**
   * 退出批量模式
   * @param type 脚本类型
   */
  private exitBatchMode(type: ScriptType): void {
    const listSelector = getScriptListSelector(type);
    const controlsSelector = getBatchControlsSelector(type);

    if (type === ScriptType.GLOBAL) {
      this.batchModeGlobal = false;
    } else {
      this.batchModeCharacter = false;
    }

    $(controlsSelector).hide();

    const $list = $(listSelector);

    $list.find('.script-item, .script-folder').each((_, element) => {
      const $element = $(element);
      $element.removeClass('batch-mode selected');
      $element.find('.script-checkbox, .folder-checkbox').hide().prop('checked', false);
      $element.find('.script-item-control').show();
      $element.find('.drag-handle').show();
      $element.find('.script-controls').show();
      $element.find('.folder-control .folder-script-toggle').show();
      $element.find('.folder-control .folder-edit').show();
      $element.find('.folder-control .folder-export').show();
      $element.find('.folder-control .folder-move').show();
      $element.find('.folder-control .folder-delete').show();
      $element.find('.script-checkbox, .folder-checkbox').off('change.batch');
    });
  }

  /**
   * 复选框状态变化时添加选中状态css
   * @param $element 元素jQuery对象
   */
  private handleCheckboxChange($element: JQuery<HTMLElement>): void {
    const isChecked = $element.find('.script-checkbox, .folder-checkbox').prop('checked');

    if (isChecked) {
      $element.addClass('selected');
    } else {
      $element.removeClass('selected');
    }
  }

  /**
   * 获取选中的项目
   * @param type 脚本类型
   * @returns 选中的脚本ID和文件夹ID数组
   */
  private getSelectedItems(type: ScriptType): { scriptIds: string[]; folderIds: string[] } {
    const listSelector = getScriptListSelector(type);
    const scriptIds: string[] = [];
    const folderIds: string[] = [];

    $(listSelector)
      .find('.script-item.selected')
      .each((_, element) => {
        const id = $(element).attr('id');
        if (id) scriptIds.push(id);
      });

    $(listSelector)
      .find('.script-folder.selected')
      .each((_, element) => {
        const id = $(element).attr('id');
        if (id) folderIds.push(id);
      });

    return { scriptIds, folderIds };
  }

  /**
   * 执行批量删除
   * @param type 脚本类型
   */
  private async performBatchDelete(type: ScriptType): Promise<void> {
    const { scriptIds, folderIds } = this.getSelectedItems(type);

    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.warning('请至少选择一个项目进行删除');
      return;
    }

    const totalCount = scriptIds.length + folderIds.length;
    const result = await callGenericPopup(
      `确定要删除选中的 ${totalCount} 个项目吗？此操作不可撤销。`,
      POPUP_TYPE.CONFIRM,
      '',
      { okButton: '删除', cancelButton: '取消' },
    );

    if (!result) return;

    try {
      for (const scriptId of scriptIds) {
        await this.scriptManager.deleteScript(scriptId, type);
      }

      for (const folderId of folderIds) {
        await this.handleFolderDelete(folderId, type, true);
      }

      toastr.success(`成功删除 ${totalCount} 个项目`);

      this.exitBatchMode(type);
      await this.renderScriptLists();
    } catch (error) {
      log.error('[ScriptManager] 批量删除失败:', error);
      toastr.error(`批量删除失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行批量导出
   * @param type 脚本类型
   */
  private async performBatchExport(type: ScriptType): Promise<void> {
    const { scriptIds, folderIds } = this.getSelectedItems(type);

    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.warning('请至少选择一个项目进行导出');
      return;
    }

    try {
      //@ts-ignore
      if (!window.JSZip) {
        await import('@sillytavern/lib/jszip.min.js');
      }
      //@ts-ignore
      const zip = new JSZip();
      let exportedCount = 0;

      let cancelExport = false;

      for (const scriptId of scriptIds) {
        const script = this.scriptManager.getScriptById(scriptId);
        if (script) {
          const scriptData = await this.checkScriptDataAndGetExportData(script);

          if (scriptData === null) {
            cancelExport = true;
            break;
          }

          const scriptFileName = `${script.name.replace(/[<>:"/\\|?*]/g, '_')}.json`;
          zip.file(scriptFileName, JSON.stringify(scriptData, null, 2));
          exportedCount++;
        }
      }

      if (cancelExport) {
        return;
      }

      const repository =
        type === ScriptType.GLOBAL
          ? this.scriptManager.getGlobalRepositoryItems()
          : this.scriptManager.getCharacterRepositoryItems();

      for (const folderId of folderIds) {
        const folder = repository.find(item => item.type === 'folder' && item.id === folderId);
        if (folder) {
          const folderName = folder.name || 'folder';
          const sanitizedFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

          if (Array.isArray(folder.value)) {
            for (const script of folder.value) {
              const scriptData = await this.checkScriptDataAndGetExportData(script);

              if (scriptData === null) {
                cancelExport = true;
                break;
              }

              const scriptFileName = `${script.name.replace(/[<>:"/\\|?*]/g, '_')}.json`;
              zip.file(`${sanitizedFolderName}/${scriptFileName}`, JSON.stringify(scriptData, null, 2));
            }

            if (cancelExport) {
              break;
            }
          }
          exportedCount++;
        }
      }

      if (cancelExport) {
        return;
      }

      if (exportedCount === 0) {
        toastr.error('没有找到有效的导出数据');
        return;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const typeName = type === ScriptType.GLOBAL ? 'global' : 'character';
      const filename = `batch_export_${typeName}_${timestamp}.zip`;

      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toastr.success(`成功导出 ${exportedCount} 个项目`);
    } catch (error) {
      log.error('[ScriptManager] 批量导出失败:', error);
      toastr.error(`批量导出失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 执行批量移动到文件夹
   * @param type 脚本类型
   */
  private async performBatchMove(type: ScriptType): Promise<void> {
    const { scriptIds, folderIds } = this.getSelectedItems(type);

    if (folderIds.length > 0) {
      toastr.error('不能移动文件夹，请只选择脚本进行移动操作');
      return;
    }

    if (scriptIds.length === 0) {
      toastr.warning('请至少选择一个脚本进行移动');
      return;
    }

    try {
      const repository =
        type === ScriptType.GLOBAL
          ? this.scriptManager.getGlobalRepositoryItems()
          : this.scriptManager.getCharacterRepositoryItems();

      const folders = repository.filter(item => item.type === 'folder');

      if (folders.length === 0) {
        toastr.error('没有可用的文件夹，请先创建一个文件夹');
        return;
      }

      const folderOptions = folders.map(folder => `<option value="${folder.id}">${folder.name}</option>`).join('');

      const template = $(`
        <div>
          <p>选择要移动到的文件夹：</p>
          <select id="target-folder-select" class="text_pole" style="width: 100%;">
            <option value="">根目录</option>
            ${folderOptions}
          </select>
        </div>
      `);

      const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
        okButton: '移动',
        cancelButton: '取消',
      });

      if (!result) return;

      const targetFolderId = (template.find('#target-folder-select').val() as string) || null;

      for (const scriptId of scriptIds) {
        await this.scriptManager.moveScriptToFolder(scriptId, targetFolderId, type);
      }

      const targetName = targetFolderId ? folders.find(f => f.id === targetFolderId)?.name || '未知文件夹' : '根目录';

      toastr.success(`成功将 ${scriptIds.length} 个脚本移动到"${targetName}"`);

      this.exitBatchMode(type);
      await this.renderScriptLists();
    } catch (error) {
      log.error('[ScriptManager] 批量移动失败:', error);
      toastr.error(`批量移动失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理文件夹创建事件
   * @param name 文件夹名称
   * @param type 脚本类型
   * @param icon 文件夹图标
   */
  private async handleFolderCreate(name: string, type: ScriptType, icon?: string, color?: string): Promise<void> {
    try {
      await this.scriptManager.createFolder(name, type, icon, color);
      await this.renderScriptLists();
      toastr.success(`文件夹 "${name}" 创建成功`);
    } catch (error) {
      log.error('[ScriptManager] 创建文件夹失败:', error);
      toastr.error(`创建文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理文件夹编辑事件
   * @param folderId 文件夹ID
   * @param newName 新名称
   * @param type 脚本类型
   * @param newIcon 新图标
   * @param newColor 新颜色
   */
  private async handleFolderEdit(
    folderId: string,
    newName: string,
    type: ScriptType,
    newIcon?: string,
    newColor?: string,
  ): Promise<void> {
    try {
      await this.scriptManager.editFolder(folderId, newName, type, newIcon, newColor);

      if (newName) {
        $(`#${folderId} .folder-name`).text(newName);
      }

      if (newIcon) {
        $(`#${folderId} .folder-icon`).removeClass().addClass(`fa ${newIcon} folder-icon marginLeft5`);
      }

      if (newColor) {
        $(`#${folderId} .folder-icon`).css('color', newColor);
        $(`#${folderId} .folder-header`).css('border-left-color', newColor);
      }

      toastr.success(`文件夹更新成功`);
    } catch (error) {
      log.error('[ScriptManager] 更新文件夹失败:', error);
      toastr.error(`更新文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 处理文件夹删除事件
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param skipUIRefresh 是否跳过UI刷新（用于批量操作）
   */
  private async handleFolderDelete(folderId: string, type: ScriptType, skipUIRefresh: boolean = false): Promise<void> {
    try {
      await this.scriptManager.deleteFolder(folderId, type);
      if (!skipUIRefresh) {
        await this.renderScriptLists();
        toastr.success('文件夹删除成功');
      }
    } catch (error) {
      log.error('[ScriptManager] 删除文件夹失败:', error);
      if (!skipUIRefresh) {
        toastr.error(`删除文件夹失败: ${error instanceof Error ? error.message : String(error)}`);
      }
      throw error;
    }
  }

  /**
   * 处理文件夹脚本批量开关
   * @param folderId 文件夹ID
   * @param type 脚本类型
   * @param enable 是否启用
   */
  private async handleFolderScriptsToggle(folderId: string, type: ScriptType, enable: boolean): Promise<void> {
    try {
      await this.scriptManager.toggleFolderScripts(folderId, type, enable);
      this.updateFolderAndScriptsUI(folderId, type, enable);
    } catch (error) {
      log.error('[ScriptManager] 批量切换文件夹脚本状态失败:', error);
      toastr.error(`批量切换脚本状态失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}
