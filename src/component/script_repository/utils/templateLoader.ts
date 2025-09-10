import { extensionFolderPath } from '@/util/extension_variables';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';
import log from 'loglevel';

const TEMPLATE_PATH = `${extensionFolderPath}/src/component/script_repository/templates`;

/**
 * 加载模板
 * @param templateName 模板名称（不含扩展名）
 * @param data 模板数据
 * @returns 渲染后的HTML字符串
 */
export async function loadTemplate(templateName: string, data: Record<string, any> = {}): Promise<string> {
  try {
    const html = await renderExtensionTemplateAsync(TEMPLATE_PATH, templateName, data, false);

    log.info(`[TemplateLoader] 成功加载模板: ${templateName}`);
    return html;
  } catch (error) {
    log.error(`[TemplateLoader] 加载模板失败: ${templateName}`, error);
    throw new Error(`模板加载失败: ${templateName}`);
  }
}
