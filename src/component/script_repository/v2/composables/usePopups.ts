import { renderMarkdown } from '@/util/render_markdown';
import { POPUP_TYPE, callGenericPopup } from '@sillytavern/scripts/popup';
import log from 'loglevel';
import { DEFAULT_SCRIPT_CONFIGS, createDefaultScript } from '../../builtin_scripts';
import {
  FolderCreateFormSchema,
  ScriptEditorFormSchema,
  TargetSelectorFormSchema,
  type FolderCreateFormData,
  type ScriptEditorFormData,
  type TargetSelectorFormData,
} from '../schemas/popup.schema';
import type { Script } from '../schemas/script.schema';
import { useUiStore } from '../stores/ui.store';
import { FormValidator } from '../utils/formValidation';
import { TemplateLoader } from '../utils/templateLoader';

/**
 * Popup 操作结果接口
 */
export interface PopupResult<T = any> {
  confirmed: boolean;
  data?: T;
}

/**
 * 使用ST popup系统的composable
 */
export function usePopups() {
  const uiStore = useUiStore();

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
            content: loadedScript?.content || config.content
          };
        } catch (error) {
          log.warn(`[usePopups] 加载内置脚本配置失败: ${key}`, error);
          // 回退到原始配置
          return {
            id: key,
            name: config.name,
            info: config.info,
            content: config.content
          };
        }
      })
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
        okButton: '关闭'
      });
    } catch (error) {
      log.error('[usePopups] 显示脚本信息失败:', error);
      uiStore.showError('显示脚本信息失败', String(error));
    }
  };

  /**
   * 打开脚本编辑器
   * @param script 要编辑的脚本（新建时为undefined）
   * @returns 编辑结果
   */
  const openScriptEditor = async (script?: Script): Promise<PopupResult<ScriptEditorFormData>> => {
    try {
      // 加载模板
      const $editorHtml = $(await TemplateLoader.loadV1Template('script_editor'));

      // 填充现有数据
      if (script) {
        FormValidator.populateForm($editorHtml, {
          name: script.name,
          content: script.content,
          info: script.info,
          enabled: script.enabled,
          buttons: script.buttons,
          data: script.data,
        });
      }

      // 绑定实时验证
      FormValidator.bindRealTimeValidation(ScriptEditorFormSchema, $editorHtml);

      // 显示编辑器popup
      const result = await callGenericPopup($editorHtml, POPUP_TYPE.CONFIRM, '', {
        wide: true,
        okButton: '保存',
        cancelButton: '取消',
      });

      if (result) {
        // 收集表单数据
        const formData = FormValidator.extractFormData($editorHtml);
        
        // 验证数据
        const validation = FormValidator.validate(ScriptEditorFormSchema, formData);
        
        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as ScriptEditorFormData,
          };
        } else {
          uiStore.showError('表单验证失败', '请检查输入的数据');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 脚本编辑器失败:', error);
      uiStore.showError('打开脚本编辑器失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 创建文件夹对话框
   * @param parentId 父文件夹ID
   * @returns 创建结果
   */
  const createFolder = async (parentId?: string): Promise<PopupResult<FolderCreateFormData>> => {
    try {
      // 加载模板
      const $folderHtml = $(await TemplateLoader.loadV1Template('folder_create', {
        defaultColor: '#4a90e2'
      }));

      // 绑定实时验证
      FormValidator.bindRealTimeValidation(FolderCreateFormSchema, $folderHtml);

      // 显示创建对话框
      const result = await callGenericPopup($folderHtml, POPUP_TYPE.CONFIRM, '', {
        okButton: '创建',
        cancelButton: '取消',
      });

      if (result) {
        // 收集表单数据
        const formData = FormValidator.extractFormData($folderHtml);
        formData.parentId = parentId || null;
        
        // 验证数据
        const validation = FormValidator.validate(FolderCreateFormSchema, formData);
        
        if (validation.success) {
          return {
            confirmed: true,
            data: validation.data as FolderCreateFormData,
          };
        } else {
          uiStore.showError('表单验证失败', '请检查输入的数据');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 文件夹创建失败:', error);
      uiStore.showError('创建文件夹失败', String(error));
      return { confirmed: false };
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
      // 加载模板
      const $selectorHtml = $(await TemplateLoader.loadV1Template('script_target_selector', {
        title: config.title,
        prefix: 'target',
        globalLabel: '全局脚本库',
        characterLabel: '角色脚本库',
        presetLabel: '预设脚本库',
        showPresetOption: config.showPresetOption || false,
      }));

      // 显示选择对话框
      const result = await callGenericPopup($selectorHtml, POPUP_TYPE.CONFIRM, '', {
        okButton: '确认',
        cancelButton: '取消',
      });

      if (result) {
        // 收集表单数据
        const formData = FormValidator.extractFormData($selectorHtml);
        
        // 映射字段名（因为模板中使用了prefix）
        const mappedData = {
          target: formData['target-target'] || formData.target,
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
          uiStore.showError('表单验证失败', '请选择一个目标');
          return { confirmed: false };
        }
      }

      return { confirmed: false };
    } catch (error) {
      log.error('[usePopups] 目标选择失败:', error);
      uiStore.showError('目标选择失败', String(error));
      return { confirmed: false };
    }
  };

  /**
   * 显示内置脚本库
   * @param onAddScript 添加脚本的回调函数
   * @returns 选择的脚本ID
   */
  const showBuiltinLibrary = async (onAddScript?: (scriptId: string, target: 'global' | 'character') => Promise<void>): Promise<PopupResult<string[]>> => {
    try {
      // 异步加载内置脚本配置
      const builtinScripts = await getBuiltinScriptConfigs();
      
      // 创建容器
      const $container = $('<div class="default-script-repository-container"></div>');
      
      // 为每个内置脚本创建项目
      for (const script of builtinScripts) {
        const $item = await TemplateLoader.loadV1Template('script_default_repository', {
          id: `default_lib_${script.id}`,
          scriptName: script.name
        });
        
        const $scriptHtml = $($item);
        
        // 绑定信息按钮
        $scriptHtml.find('.script-info').on('click', () => {
          const htmlText = renderMarkdown(script.info);
          callGenericPopup(htmlText, POPUP_TYPE.DISPLAY, undefined, { wide: true });
        });
        
        // 绑定添加按钮
        $scriptHtml.find('.add-script').on('click', async () => {
          const targetResult = await selectTarget({
            title: '添加到:',
            showPresetOption: false,
          });
          
          if (targetResult.confirmed && targetResult.data) {
            try {
              if (onAddScript && (targetResult.data.target === 'global' || targetResult.data.target === 'character')) {
                await onAddScript(script.id, targetResult.data.target);
                uiStore.showSuccess('添加成功', `脚本 "${script.name}" 已添加到${targetResult.data.target === 'global' ? '全局' : '角色'}脚本库`);
              } else {
                uiStore.showSuccess('添加成功', `脚本 "${script.name}" 已添加`);
              }
            } catch (error) {
              uiStore.showError('添加失败', `添加脚本 "${script.name}" 失败: ${error}`);
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
      uiStore.showError('显示内置脚本库失败', String(error));
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
      uiStore.showError('确认删除失败', String(error));
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
      uiStore.showError('文本输入失败', String(error));
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
      uiStore.showError('显示警告失败', String(error));
    }
  };

  return {
    // 脚本相关
    showScriptInfo,
    openScriptEditor,
    
    // 文件夹相关
    createFolder,
    
    // 通用选择器
    selectTarget,
    
    // 内置脚本库
    showBuiltinLibrary,
    
    // 通用对话框
    confirmDelete,
    promptText,
    showAlert,
  };
}
