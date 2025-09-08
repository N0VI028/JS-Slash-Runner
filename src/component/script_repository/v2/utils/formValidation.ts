import log from 'loglevel';
import YAML from 'yaml';
import { z, ZodError } from 'zod';
import type { ValidationResult } from '../schemas/popup.schema';

/**
 * 表单验证工具类
 */
export class FormValidator {
  /**
   * 验证表单数据
   * @param schema Zod schema
   * @param data 要验证的数据
   * @returns 验证结果
   */
  static validate<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult {
    try {
      const validatedData = schema.parse(data);
      return {
        success: true,
        data: validatedData,
      };
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = FormValidator.formatZodErrors(error);
        return {
          success: false,
          errors,
        };
      }
      throw error;
    }
  }

  /**
   * 安全验证（不抛出异常）
   * @param schema Zod schema
   * @param data 要验证的数据
   * @returns 验证结果
   */
  static safeValidate<T>(schema: z.ZodSchema<T>, data: unknown) {
    return schema.safeParse(data);
  }

  /**
   * 格式化Zod错误为用户友好的格式
   * @param error ZodError实例
   * @returns 格式化后的错误对象
   */
  static formatZodErrors(error: ZodError): Record<string, string[]> {
    const formattedErrors: Record<string, string[]> = {};

    // 安全检查：确保 issues 数组存在
    if (!error.issues || !Array.isArray(error.issues)) {
      log.warn('[FormValidator] ZodError.issues 不存在或不是数组:', error);
      return { _general: ['验证失败'] };
    }

    error.issues.forEach(err => {
      const path = err.path.length > 0 ? err.path.join('.') : '_general';

      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }

      formattedErrors[path].push(err.message);
    });

    return formattedErrors;
  }

  /**
   * 填充表单数据到HTML表单
   * @param form JQuery表单元素
   * @param data 要填充的数据对象
   */
  static populateEditorForm(form: JQuery, data: Record<string, any>) {
    try {
      Object.entries(data).forEach(([key, value]) => {
        switch (key) {
          case 'name':
            // 脚本名称
            form.find('#script-name-input').val(value || '');
            break;

          case 'content':
            // 脚本内容
            form.find('#script-content-textarea').val(value || '');
            break;

          case 'info':
            // 脚本信息
            form.find('#script-info-textarea').val(value || '');
            break;

          case 'enabled':
            // 启用状态（如果有相关的checkbox）
            if (typeof value === 'boolean') {
              form.find('#script-enabled-input').prop('checked', value);
            }
            break;

          case 'buttons':
            // 填充按钮数据
            FormValidator.populateEditorButtons(form, value);
            break;

          case 'data':
            // 填充变量数据
            FormValidator.populateEditorVariables(form, value);
            break;

          default:
            // 通用字段填充（兼容其他表单）
            const $input = form.find(`#${key}-input`);
            if ($input.length > 0) {
              if ($input.is(':checkbox')) {
                $input.prop('checked', Boolean(value));
              } else {
                $input.val(value || '');
              }
            }
            break;
        }
      });

      log.debug('[FormValidator] 表单数据填充完成:', data);
    } catch (error) {
      log.error('[FormValidator] 填充表单数据失败:', error);
      throw error;
    }
  }

  /**
   * 填充按钮数据到表单
   * @param form JQuery表单元素
   * @param buttons 按钮数组
   */
  private static populateEditorButtons(form: JQuery, buttons: Array<{ name: string; visible: boolean }>) {
    if (!Array.isArray(buttons) || buttons.length === 0) {
      return;
    }

    const $buttonList = form.find('.button-list');
    if ($buttonList.length === 0) {
      log.warn('[FormValidator] 未找到按钮列表容器');
      return;
    }

    // 清空现有按钮
    $buttonList.empty();

    // 添加每个按钮
    buttons.forEach((button, index) => {
      const buttonId = `button-${index}`;
      const escapedButtonName = button.name || '';

      const $buttonItem = $(`
        <div class="button-item" id="${buttonId}">
          <span class="drag-handle menu-handle">☰</span>
          <input type="checkbox" id="checkbox-${buttonId}" class="button-visible" ${button.visible ? 'checked' : ''}>
          <input class="text_pole button-name" type="text" id="text-${buttonId}" placeholder="按钮名称" value="${escapedButtonName}">
          <div class="delete-button menu_button interactable" data-index="${index}">
            <i class="fa-solid fa-trash"></i>
          </div>
        </div>
      `);
      $buttonList.append($buttonItem);
    });

    log.debug('[FormValidator] 按钮数据填充完成:', buttons);
  }

  /**
   * 填充变量数据到表单
   * @param form JQuery表单元素
   * @param variables 变量对象
   */
  private static populateEditorVariables(form: JQuery, variables: Record<string, any>) {
    if (!variables || typeof variables !== 'object' || Object.keys(variables).length === 0) {
      return;
    }

    const $variableList = form.find('#variable-list');
    if ($variableList.length === 0) {
      log.warn('[ScriptRepository] 未找到变量列表容器');
      return;
    }

    $variableList.empty();

    Object.entries(variables).forEach(([key, value]) => {
      const valueStr = typeof value === 'string' ? value : YAML.stringify(value);

      const $variableItem = $(`
        <div class="variable-item flex-container flexFlowColumn width100p">
          <div class="flex flexFlowColumn">
            <div class="flex-container alignitemscenter spaceBetween wide100p">
              <div>名称:</div>
              <div class="menu_button interactable delete-variable" title="删除变量">
                <i class="fa-solid fa-trash"></i>
              </div>
            </div>
            <input type="text" class="text_pole variable-key" value="${key}" placeholder="变量名">
          </div>
          <div class="flex flexFlowColumn" style="align-items: flex-start;">
            <div>值:</div>
            <textarea class="text_pole variable-value" style="min-height: 12px;" rows="1" placeholder="请以纯文本或YAML格式输入变量值">${valueStr}</textarea>
          </div>
          <hr>
        </div>
      `);
      $variableList.append($variableItem);
    });

    log.debug('[FormValidator] 变量数据填充完成:', variables);
  }
}
