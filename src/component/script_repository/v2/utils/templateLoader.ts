import { extensionFolderPath } from '@/util/extension_variables';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import log from 'loglevel';

/**
 * 模板加载器工具类
 */
export class TemplateLoader {
  private static readonly TEMPLATE_BASE_PATH = `${extensionFolderPath}/src/component/script_repository`;
  private static readonly V1_TEMPLATE_PATH = `${TemplateLoader.TEMPLATE_BASE_PATH}/public`;
  private static readonly V2_TEMPLATE_PATH = `${TemplateLoader.TEMPLATE_BASE_PATH}/v2/templates`;

  /**
   * 加载V1模板（向后兼容）
   * @param templateName 模板名称（不含扩展名）
   * @param data 模板数据
   * @returns 渲染后的HTML字符串
   */
  static async loadV1Template(templateName: string, data: Record<string, any> = {}): Promise<string> {
    try {
      const html = await renderExtensionTemplateAsync(
        TemplateLoader.V1_TEMPLATE_PATH,
        templateName,
        data
      );
      log.debug(`[TemplateLoader] 成功加载V1模板: ${templateName}`);
      return html;
    } catch (error) {
      log.error(`[TemplateLoader] 加载V1模板失败: ${templateName}`, error);
      throw new Error(`模板加载失败: ${templateName}`);
    }
  }

  /**
   * 加载V2模板
   * @param templateName 模板名称（不含扩展名）
   * @param data 模板数据
   * @returns 渲染后的HTML字符串
   */
  static async loadV2Template(templateName: string, data: Record<string, any> = {}): Promise<string> {
    try {
      const html = await renderExtensionTemplateAsync(
        TemplateLoader.V2_TEMPLATE_PATH,
        templateName,
        data
      );
      log.debug(`[TemplateLoader] 成功加载V2模板: ${templateName}`);
      return html;
    } catch (error) {
      log.warn(`[TemplateLoader] V2模板加载失败，尝试V1模板: ${templateName}`, error);
      // 如果V2模板不存在，尝试加载V1模板作为后备
      return TemplateLoader.loadV1Template(templateName, data);
    }
  }

  /**
   * 智能加载模板（优先V2，后备V1）
   * @param templateName 模板名称
   * @param data 模板数据
   * @returns 渲染后的HTML字符串
   */
  static async loadTemplate(templateName: string, data: Record<string, any> = {}): Promise<string> {
    return TemplateLoader.loadV2Template(templateName, data);
  }

  /**
   * 预加载常用模板
   * @returns 预加载结果
   */
  static async preloadCommonTemplates(): Promise<void> {
    const commonTemplates = [
      'script_editor',
      'folder_create',
      'script_target_selector',
      'script_allow_popup'
    ];

    const preloadPromises = commonTemplates.map(async (templateName) => {
      try {
        await TemplateLoader.loadTemplate(templateName);
        log.debug(`[TemplateLoader] 预加载模板成功: ${templateName}`);
      } catch (error) {
        log.warn(`[TemplateLoader] 预加载模板失败: ${templateName}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
    log.info('[TemplateLoader] 模板预加载完成');
  }
}

/**
 * 常用模板名称常量
 */
export const TEMPLATE_NAMES = {
  SCRIPT_EDITOR: 'script_editor',
  FOLDER_CREATE: 'folder_create',
  TARGET_SELECTOR: 'script_target_selector',
  SCRIPT_ALLOW: 'script_allow_popup',
} as const;

/**
 * 模板数据接口
 */
export interface ScriptEditorTemplateData {
  scriptName?: string;
  scriptContent?: string;
  scriptInfo?: string;
  variables?: Array<{ key: string; value: any }>;
  buttons?: Array<{ name: string; visible: boolean }>;
}

export interface FolderCreateTemplateData {
  defaultColor?: string;
  parentFolderName?: string;
}

export interface TargetSelectorTemplateData {
  title: string;
  prefix: string;
  globalLabel: string;
  characterLabel: string;
  presetLabel?: string;
  showPresetOption?: boolean;
}

/**
 * 便捷的模板加载函数
 */
export const loadScriptEditorTemplate = (data?: ScriptEditorTemplateData) => 
  TemplateLoader.loadTemplate(TEMPLATE_NAMES.SCRIPT_EDITOR, data);

export const loadFolderCreateTemplate = (data?: FolderCreateTemplateData) => 
  TemplateLoader.loadTemplate(TEMPLATE_NAMES.FOLDER_CREATE, data);

export const loadTargetSelectorTemplate = (data: TargetSelectorTemplateData) => 
  TemplateLoader.loadTemplate(TEMPLATE_NAMES.TARGET_SELECTOR, data);
