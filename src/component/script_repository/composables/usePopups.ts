import { renderMarkdown } from '@/util/render_markdown';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import log from 'loglevel';
import { createApp } from 'vue';
import FolderCreate from '../components/FolderCreate.vue';
import ScriptDefaultRepository from '../components/ScriptDefaultRepository.vue';
import ScriptEditor from '../components/ScriptEditor.vue';
import ScriptTargetSelector from '../components/ScriptTargetSelector.vue';
import {
  FolderCreateFormSchema,
  ScriptEditorFormSchema,
  TargetSelectorFormSchema,
  type FolderCreateFormData,
  type ScriptEditorFormData,
  type TargetSelectorFormData,
} from '../schemas/popup.schema';
import type { Script } from '../schemas/script.schema';
import { DEFAULT_SCRIPT_CONFIGS, createDefaultScript } from '../utils/builtin_scripts';
import { FormValidator } from '../utils/formValidation';

/**
 * Popup 操作结果接口
 */
export interface PopupResult<T = any> {
  confirmed: boolean;
  data?: T;
}

/**
 * 创建Vue组件并挂载到DOM元素
 * @param component Vue组件
 * @param props 组件props
 * @returns 挂载后的jQuery元素和Vue应用实例
 */
function createVueComponentElement<T extends Record<string, any>>(
  component: any,
  props: T = {} as T,
): { $element: JQuery<HTMLElement>; vueApp: any; cleanup: () => void } {
  // 使用jQuery创建容器元素
  const $container = $('<div>');

  // 创建Vue应用实例
  const vueApp = createApp(component, props);

  // 挂载Vue组件
  vueApp.mount($container[0]);

  const cleanup = () => {
    try {
      vueApp.unmount();
    } catch (error) {
      log.warn('[usePopups] Vue组件卸载失败:', error);
    }
  };

  return { $element: $container, vueApp, cleanup };
}

/**
 * 绑定脚本编辑器的事件监听器
 * @param $editorHtml 编辑器HTML元素
 */
function bindScriptEditorEvents($editorHtml: JQuery<HTMLElement>): void {
  // 绑定变量添加按钮
  $editorHtml.find('#add-variable-trigger').on('click', () => {
    addVariableToEditor($editorHtml);
  });

  // 绑定按钮添加按钮
  $editorHtml.find('#add-button-trigger').on('click', () => {
    addButtonToEditor($editorHtml);
  });

  // 绑定删除变量按钮
  $editorHtml.on('click', '.delete-variable', (e: JQuery.ClickEvent) => {
    const $variableItem = $(e.currentTarget).closest('.variable-item');
    const $variableList = $variableItem.closest('#variable-list');

    $variableItem.remove();

    // 如果删除了最后一个变量，隐藏变量列表容器
    if ($variableList.find('.variable-item').length === 0) {
      $variableList.hide();
    }
  });

  // 绑定删除按钮按钮
  $editorHtml.on('click', '.delete-button', (e: JQuery.ClickEvent) => {
    $(e.currentTarget).closest('.button-item').remove();
  });

  // 初始化按钮列表的拖拽排序功能
  const $buttonList = $editorHtml.find('.button-list');
  if ($buttonList.length > 0) {
    // 确保jQuery UI sortable可用
    if (typeof $buttonList.sortable === 'function') {
      $buttonList.sortable({
        handle: '.drag-handle',
        items: '.button-item',
        tolerance: 'pointer',
        cursor: 'move',
      });
    }
  }
}

/**
 * 添加新变量到编辑器
 * @param $editorHtml 编辑器HTML元素
 */
function addVariableToEditor($editorHtml: JQuery<HTMLElement>): void {
  const $variableList = $editorHtml.find('#variable-list');

  // 添加变量前先显示变量列表容器
  $variableList.show();

  const $variableItem = $(`
    <div class="variable-item flex-container flexFlowColumn width100p">
      <div class="flex flexFlowColumn">
        <div class="flex-container alignitemscenter spaceBetween width100p">
          <div>名称:</div>
          <div class="menu_button interactable delete-variable" title="删除变量">
            <i class="fa-solid fa-trash"></i>
          </div>
        </div>
        <input type="text" class="text_pole variable-key" value="" placeholder="变量名">
      </div>
      <div class="flex flexFlowColumn" style="align-items: flex-start;">
        <div>值:</div>
        <textarea class="text_pole variable-value" style="min-height: 12px;" rows="1" placeholder="请以纯文本或YAML格式输入变量值"></textarea>
      </div>
      <hr>
    </div>
  `);
  $variableList.append($variableItem);

  // 聚焦到新添加的变量名输入框
  $variableItem.find('.variable-key').focus();
}

/**
 * 添加新按钮到编辑器
 * @param $editorHtml 编辑器HTML元素
 */
function addButtonToEditor($editorHtml: JQuery<HTMLElement>): void {
  const $buttonList = $editorHtml.find('.button-list');
  const buttonIndex = $buttonList.find('.button-item').length;
  const buttonId = `button-${buttonIndex}`;

  const $buttonItem = $(`
    <div class="button-item" id="${buttonId}">
      <span class="drag-handle menu-handle">☰</span>
      <input type="checkbox" id="checkbox-${buttonId}" class="button-visible" checked>
      <input class="text_pole button-name" type="text" id="text-${buttonId}" placeholder="按钮名称">
      <div class="delete-button menu_button interactable" data-index="${buttonIndex}">
        <i class="fa-solid fa-trash"></i>
      </div>
    </div>
  `);
  $buttonList.append($buttonItem);

  // 聚焦到新添加的按钮名输入框
  $buttonItem.find('.button-name').focus();
}

/**
 * 重新绑定动态生成元素的事件
 * @param $editorHtml 编辑器HTML元素
 */
function rebindDynamicEvents($editorHtml: JQuery<HTMLElement>): void {
  // 重新初始化按钮列表的拖拽排序功能
  const $buttonList = $editorHtml.find('.button-list');
  if ($buttonList.length > 0 && typeof $buttonList.sortable === 'function') {
    // 销毁现有的sortable实例（如果存在）
    try {
      $buttonList.sortable('destroy');
    } catch (e) {
      // 忽略destroy错误（可能还没有初始化）
    }

    // 重新初始化sortable
    $buttonList.sortable({
      handle: '.drag-handle',
      items: '.button-item',
      tolerance: 'pointer',
      cursor: 'move',
    });
  }
}

/**
 * 使用ST popup系统的composable
 */
export function usePopups() {
  /**
   * 获取内置脚本配置（异步加载实际内容）
   */
  const getBuiltinScriptConfigs = async () => {
    const configs = Object.keys(DEFAULT_SCRIPT_CONFIGS);
    const results = await Promise.all(
      configs.map(async key => {
        const config = DEFAULT_SCRIPT_CONFIGS[key];
        try {
          // 使用 createDefaultScript 来正确加载内容
          const loadedScript = await createDefaultScript(key);
          return {
            id: key,
            name: config.name,
            info: loadedScript?.info || config.info, // 优先使用加载的内容，回退到原始配置
            content: loadedScript?.content || config.content,
          };
        } catch (error) {
          log.warn(`[usePopups] 加载内置脚本配置失败: ${key}`, error);
          // 回退到原始配置
          return {
            id: key,
            name: config.name,
            info: config.info,
            content: config.content,
          };
        }
      }),
    );
    return results;
  };

  /**
   * 显示脚本信息
   * @param script 脚本对象
   */
  const showScriptInfo = async (script: Script): Promise<void> => {
    try {
      const scriptInfo = script.info || '暂无脚本信息';
      const htmlText = renderMarkdown(scriptInfo);

      await callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, {
        wide: true,
        okButton: '关闭',
      });
    } catch (error) {
      log.error('[usePopups] 显示脚本信息失败:', error);
      toastr.error('显示脚本信息失败', String(error));
    }
  };

  /**
   * 打开脚本编辑器
   * @param script 要编辑的脚本（新建时为undefined）
   * @returns 编辑结果
   */
  const openScriptEditor = async (script?: Script): Promise<PopupResult<ScriptEditorFormData>> => {
    let cleanup: (() => void) | null = null;

    try {
      // 创建Vue组件
      const { $element: $editorHtml, cleanup: vueCleanup } = createVueComponentElement(ScriptEditor, {
        script: script,
      });

      cleanup = vueCleanup;

      // 等待Vue组件渲染完成，然后绑定jQuery事件
      await new Promise<void>(resolve => {
        // 使用nextTick确保Vue组件完全渲染
        setTimeout(() => {
          bindScriptEditorEvents($editorHtml);

          // 对于新建脚本，隐藏变量列表容器
          if (!script) {
            $editorHtml.find('#variable-list').hide();
          }

          // 填充现有数据（在绑定事件后进行，这样动态生成的元素也能正常工作）
          if (script) {
            FormValidator.populateEditorForm($editorHtml, {
              name: script.name,
              content: script.content,
              info: script.info,
              enabled: script.enabled,
              buttons: script.buttons,
              data: script.data,
            });

            // 重新绑定动态生成元素的事件
            rebindDynamicEvents($editorHtml);
          }

          resolve();
        }, 50);
      });

      // 显示编辑器popup
      const result = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
        wide: true,
        okButton: '保存',
        cancelButton: '取消',
      });

      if (result) {
        // 收集表单数据
        const formData: { [key: string]: any } = {};
        formData.name = $editorHtml.find('#script-name-input').val();
        formData.content = $editorHtml.find('#script-content-textarea').val();
        formData.info = $editorHtml.find('#script-info-textarea').val();
        const $buttonItems = $editorHtml.find('.button-item');
        if ($buttonItems.length > 0) {
          const buttons: Array<{ name: string; visible: boolean }> = [];
          $buttonItems.each(function () {
            const $item = $(this);
            const name = String($item.find('.button-name').val() || '');
            const visible = Boolean($item.find('.button-visible').prop('checked'));

            if (name.trim()) {
              buttons.push({ name, visible });
            }
          });

          if (buttons.length > 0) {
            formData.buttons = buttons;
          }
        }

        const $variableItems = $editorHtml.find('.variable-item');
        if ($variableItems.length > 0) {
          const data: Record<string, any> = {};
          $variableItems.each(function () {
            const $item = $(this);
            const key = String($item.find('.variable-key').val() || '');
            const value = $item.find('.variable-value').val();

            if (key.trim()) {
              data[key] = value;
            }
          });

          if (Object.keys(data).length > 0) {
            formData.data = data;
          }
        }

        // 验证数据
        const validation = FormValidator.validate(ScriptEditorFormSchema, formData);

        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as ScriptEditorFormData,
          };
        } else {
          toastr.error('表单验证失败', '请检查输入的数据');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 脚本编辑器失败:', error);
      toastr.error('打开脚本编辑器失败', String(error));
      return { confirmed: false };
    } finally {
      // 清理Vue组件
      if (cleanup) {
        cleanup();
      }
    }
  };

  /**
   * 创建文件夹对话框
   * @returns 创建结果
   */
  const createFolder = async (): Promise<PopupResult<FolderCreateFormData>> => {
    let cleanup: (() => void) | null = null;

    try {
      // 创建Vue组件
      const { $element: $folderHtml, cleanup: vueCleanup } = createVueComponentElement(FolderCreate, {});

      cleanup = vueCleanup;

      // 用于存储颜色选择结果
      let folderColor: string | undefined;

      // 等待Vue组件渲染完成，然后绑定jQuery事件
      await new Promise<void>(resolve => {
        setTimeout(() => {
          // 绑定颜色选择器
          $folderHtml.find('#folder-color-picker').on('change', (evt: any) => {
            folderColor = evt.detail?.rgba || evt.detail?.hex;
          });

          // 绑定图标选择器
          $folderHtml.find('#folder-icon-preview').on('click', async () => {
            try {
              // @ts-ignore - showFontAwesomePicker 是全局函数
              const selectedIcon = await showFontAwesomePicker();
              if (selectedIcon && selectedIcon.trim() !== '') {
                $folderHtml.find('#folder-icon-preview').removeClass().addClass(`fa ${selectedIcon}`);
                $folderHtml.find('#folder-icon-value').val(selectedIcon);
              }
            } catch (error) {
              console.error('图标选择失败:', error);
            }
          });

          resolve();
        }, 50);
      });

      const result = await callGenericPopup($folderHtml, POPUP_TYPE.CONFIRM, '', {
        okButton: '创建',
        cancelButton: '取消',
      });

      if (result) {
        const formData: { [key: string]: any } = {};
        formData.name = $folderHtml.find('#folder-name-input').val();
        formData.color = $folderHtml.find('#folder-color-picker').val();
        formData.icon = $folderHtml.find('#folder-icon-value').val();

        if (folderColor) {
          formData.color = folderColor;
        }

        // 验证数据
        const validation = FormValidator.validate(FolderCreateFormSchema, formData);

        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as FolderCreateFormData,
          };
        } else {
          toastr.error('表单验证失败,错误信息:' + validation.errors, '请检查输入的数据');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[ScriptRepository] 文件夹创建失败:', error);
      toastr.error('创建文件夹失败', String(error));
      return { confirmed: false };
    } finally {
      // 清理Vue组件
      if (cleanup) {
        cleanup();
      }
    }
  };

  /**
   * 编辑文件夹对话框（预填名称/图标/颜色）
   */
  const editFolder = async (initial: Partial<FolderCreateFormData>): Promise<PopupResult<FolderCreateFormData>> => {
    let cleanup: (() => void) | null = null;

    try {
      // 创建Vue组件
      const { $element: $folderHtml, cleanup: vueCleanup } = createVueComponentElement(FolderCreate, {});

      cleanup = vueCleanup;

      // 预填初始值
      if (initial.name) $folderHtml.find('#folder-name-input').val(initial.name);
      if (initial.icon) {
        $folderHtml.find('#folder-icon-value').val(initial.icon);
        $folderHtml.find('#folder-icon-preview').removeClass().addClass(`fa ${initial.icon}`);
      }
      if (initial.color) {
        $folderHtml.find('#folder-color-picker').val(initial.color);
      }

      let folderColor: string | undefined = initial.color;
      $folderHtml.find('#folder-color-picker').on('change', (evt: any) => {
        folderColor =
          evt.detail?.rgba || evt.detail?.hex || String($folderHtml.find('#folder-color-picker').val() || '');
      });

      $folderHtml.find('#folder-icon-preview').on('click', async () => {
        try {
          // @ts-ignore
          const selectedIcon = await showFontAwesomePicker();
          if (selectedIcon && selectedIcon.trim() !== '') {
            $folderHtml.find('#folder-icon-preview').removeClass().addClass(`fa ${selectedIcon}`);
            $folderHtml.find('#folder-icon-value').val(selectedIcon);
          }
        } catch (error) {
          console.error('图标选择失败:', error);
        }
      });

      const result = await callGenericPopup($folderHtml, POPUP_TYPE.CONFIRM, '', {
        okButton: '保存',
        cancelButton: '取消',
      });

      if (result) {
        const formData: { [key: string]: any } = {};
        formData.name = $folderHtml.find('#folder-name-input').val();
        formData.color = folderColor || $folderHtml.find('#folder-color-picker').val();
        formData.icon = $folderHtml.find('#folder-icon-value').val();

        const validation = FormValidator.validate(FolderCreateFormSchema, formData);

        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as FolderCreateFormData,
          };
        } else {
          toastr.error('表单验证失败,错误信息:' + validation.errors, '请检查输入的数据');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[ScriptRepository] 文件夹编辑失败:', error);
      toastr.error('编辑文件夹失败', String(error));
      return { confirmed: false };
    } finally {
      // 清理Vue组件
      if (cleanup) {
        cleanup();
      }
    }
  };

  /**
   * 目标选择器对话框
   * @param config 选择器配置
   * @returns 选择结果
   */
  const selectTarget = async (config: {
    title: string;
    showPresetOption?: boolean;
  }): Promise<PopupResult<TargetSelectorFormData>> => {
    try {
      // 创建Vue组件
      const { $element: $selectorHtml } = createVueComponentElement(ScriptTargetSelector, {
        title: config.title,
        prefix: 'target',
        globalLabel: '全局脚本库',
        characterLabel: '角色脚本库',
        presetLabel: '预设脚本库',
        showPresetOption: config.showPresetOption || false,
      });

      // 显示选择对话框
      const result = await callGenericPopup($selectorHtml, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        // 收集表单数据
        const formData: { [key: string]: any } = {};
        // 从单选框读取已选中的目标值（prefix 固定为 'target'）
        const $checked = $selectorHtml.find('input[name="target-target"]:checked');
        formData.target = String($checked.val() || '');
        formData.showPresetOption = config.showPresetOption || false;

        // 映射字段名（因为模板中使用了prefix）
        const mappedData = {
          target: formData.target,
          showPresetOption: config.showPresetOption || false,
        };

        // 验证数据
        const validation = FormValidator.validate(TargetSelectorFormSchema, mappedData);

        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as TargetSelectorFormData,
          };
        } else {
          toastr.error('表单验证失败', '请选择一个目标');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 目标选择失败:', error);
      toastr.error('目标选择失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 显示内置脚本库
   * @param onAddScript 添加脚本的回调函数
   * @returns 选择的脚本ID
   */
  const showBuiltinLibrary = async (
    onAddScript?: (
      scriptId: string,
      target: import('@/component/script_repository/schemas/script.schema').ScriptType,
    ) => Promise<void>,
  ): Promise<PopupResult<string[]>> => {
    try {
      // 异步加载内置脚本配置
      const builtinScripts = await getBuiltinScriptConfigs();

      // 创建容器
      const $container = $('<div class="default-script-repository-container"></div>');

      // 为每个内置脚本创建项目
      for (const script of builtinScripts) {
        const { $element: $scriptHtml } = createVueComponentElement(ScriptDefaultRepository, {
          id: `default_lib_${script.id}`,
          scriptName: script.name,
        });

        // 绑定信息按钮
        $scriptHtml.find('.script-info').on('click', () => {
          const htmlText = renderMarkdown(script.info);
          callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
        });

        // 绑定添加按钮
        $scriptHtml.find('.add-script').on('click', async () => {
          const targetResult = await selectTarget({
            title: '添加到:',
            showPresetOption: true,
          });

          if (targetResult.confirmed && targetResult.data) {
            try {
              if (
                onAddScript &&
                (targetResult.data.target === 'global' ||
                  targetResult.data.target === 'character' ||
                  targetResult.data.target === 'preset')
              ) {
                await onAddScript(script.id, targetResult.data.target as any);
                const targetLabel =
                  targetResult.data.target === 'global'
                    ? '全局'
                    : targetResult.data.target === 'character'
                    ? '角色'
                    : '预设';
                toastr.success('添加成功', `脚本 "${script.name}" 已添加到${targetLabel}脚本库`);
              } else {
                toastr.success('添加成功', `脚本 "${script.name}" 已添加`);
              }
            } catch (error) {
              toastr.error('添加失败', `添加脚本 "${script.name}" 失败: ${error}`);
            }
          }
        });

        $container.append($scriptHtml);
      }

      // 显示弹窗
      await callGenericPopup($container, POPUP_TYPE.DISPLAY, '', { wide: true });

      return { confirmed: false }; // V1风格，不返回选择结果
    } catch (error) {
      log.error('[usePopups] 显示内置脚本库失败:', error);
      toastr.error('显示内置脚本库失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 显示文件夹选择器对话框
   * @param config 配置选项
   * @returns 选择结果
   */
  const selectFolder = async (config: {
    title: string;
    folders: Array<{ id: string; name: string }>;
    allowRoot?: boolean;
  }): Promise<PopupResult<string | null>> => {
    try {
      const { title, folders, allowRoot = true } = config;

      if (folders.length === 0) {
        toastr.error('没有可用的文件夹', '请先创建一个文件夹');
        return { confirmed: false };
      }

      const folderOptions = folders.map(folder => `<option value="${folder.id}">${folder.name}</option>`).join('');

      const rootOption = allowRoot ? '<option value="">根目录</option>' : '';

      const template = $(`
        <div>
          <p>${title}</p>
          <select id="folder-selector" class="text_pole" style="width: 100%;">
            ${rootOption}
            ${folderOptions}
          </select>
        </div>
      `);

      const result = await callGenericPopup(template, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        const selectedValue = template.find('#folder-selector').val() as string;
        return {
          confirmed: true,
          data: selectedValue || null,
        };
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 文件夹选择失败:', error);
      toastr.error('文件夹选择失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 确认删除对话框
   * @param message 确认消息
   * @returns 确认结果
   */
  const confirmDelete = async (message: string): Promise<boolean> => {
    try {
      const result = await callGenericPopup(message, POPUP_TYPE.CONFIRM);
      return Boolean(result);
    } catch (error) {
      log.error('[usePopups] 确认删除失败:', error);
      toastr.error('确认删除失败', String(error));
      return false;
    }
  };

  /**
   * 文本输入对话框
   * @param message 提示消息
   * @param defaultValue 默认值
   * @returns 输入结果
   */
  const promptText = async (message: string, defaultValue?: string): Promise<PopupResult<string>> => {
    try {
      const result = await callGenericPopup(message, POPUP_TYPE.TEXT, defaultValue || '');

      if (result) {
        return {
          confirmed: true,
          data: String(result),
        };
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 文本输入失败:', error);
      toastr.error('文本输入失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 显示警告对话框
   * @param message 警告消息
   */
  const showAlert = async (message: string): Promise<void> => {
    try {
      await callGenericPopup(message, POPUP_TYPE.DISPLAY);
    } catch (error) {
      log.error('[usePopups] 显示警告失败:', error);
      toastr.error('显示警告失败', String(error));
    }
  };

  /**
   * 导入时脚本ID冲突处理对话框
   * @returns 'override' | 'new' | 'cancel'
   */
  const resolveImportIdConflict = async (config: {
    scriptName: string;
    existingScriptName: string;
    existingType: import('@/component/script_repository/schemas/script.schema').ScriptType;
  }): Promise<'new' | 'override' | 'cancel'> => {
    try {
      const existingTypeText = config.existingType === 'global' ? '全局脚本' : '角色脚本';
      const message = `要导入的脚本 '${config.scriptName}' 与${existingTypeText}库中的 '${config.existingScriptName}' id 相同，是否要继续操作？`;

      const input = await callGenericPopup(message, POPUP_TYPE.TEXT, '', {
        okButton: '覆盖原脚本',
        cancelButton: '取消',
        customButtons: ['新建脚本'],
      });

      switch (input) {
        case 1:
          return 'override';
        case 2:
          return 'new';
        default:
          return 'cancel';
      }
    } catch (error) {
      log.error('[usePopups] 冲突对话框失败:', error);
      return 'cancel';
    }
  };

  /**
   * 跨类型移动时脚本ID冲突处理对话框
   * @returns 'override' | 'new' | 'cancel'
   */
  const resolveMoveIdConflict = async (config: {
    scriptName: string;
    existingScriptName: string;
    target: import('@/component/script_repository/schemas/script.schema').ScriptType;
  }): Promise<'new' | 'override' | 'cancel'> => {
    try {
      const targetTypeText =
        config.target === 'global' ? '全局脚本' : config.target === 'character' ? '角色脚本' : '预设脚本';
      const message = `要移动到${targetTypeText}库的脚本 '${config.scriptName}' 与目标库中的 '${config.existingScriptName}' id 相同，是否要继续操作？`;

      const input = await callGenericPopup(message, POPUP_TYPE.TEXT, '', {
        okButton: '覆盖原脚本',
        cancelButton: '取消',
        customButtons: ['新建脚本'],
      });

      switch (input) {
        case 1:
          return 'override';
        case 2:
          return 'new';
        default:
          return 'cancel';
      }
    } catch (error) {
      log.error('[usePopups] 移动冲突对话框失败:', error);
      return 'cancel';
    }
  };

  return {
    // 脚本相关
    showScriptInfo,
    openScriptEditor,

    // 文件夹相关
    createFolder,
    editFolder,

    // 通用选择器
    selectTarget,
    selectFolder,

    // 内置脚本库
    showBuiltinLibrary,

    // 通用对话框
    confirmDelete,
    promptText,
    showAlert,
    resolveImportIdConflict,
    resolveMoveIdConflict,
  };
}
