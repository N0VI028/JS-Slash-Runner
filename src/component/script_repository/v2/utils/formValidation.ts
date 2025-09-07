import { debounce } from 'lodash';
import log from 'loglevel';
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
      
      log.error('[FormValidator] 验证失败:', error);
      return {
        success: false,
        errors: { _general: ['验证过程中发生未知错误'] },
      };
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
    
    error.issues.forEach((err) => {
      const path = err.path.length > 0 ? err.path.join('.') : '_general';
      
      if (!formattedErrors[path]) {
        formattedErrors[path] = [];
      }
      
      formattedErrors[path].push(err.message);
    });

    return formattedErrors;
  }

  /**
   * 在DOM中显示验证错误
   * @param $form jQuery表单元素
   * @param errors 错误对象
   */
  static showValidationErrors($form: JQuery, errors: Record<string, string[]>): void {
    // 清除之前的错误
    FormValidator.clearValidationErrors($form);

    Object.entries(errors).forEach(([field, messages]) => {
      if (field === '_general') {
        // 显示通用错误
        const $generalError = $(`<div class="validation-error general-error alert alert-danger">${messages.join(', ')}</div>`);
        $form.prepend($generalError);
      } else {
        // 显示字段特定错误
        const $field = $form.find(`#${field}-input, #${field}-textarea, input[name="${field}"], textarea[name="${field}"]`);
        
        if ($field.length) {
          $field.addClass('is-invalid');
          
          messages.forEach(message => {
            const $errorDiv = $(`<div class="validation-error field-error text-danger small">${message}</div>`);
            $field.after($errorDiv);
          });
        }
      }
    });
  }

  /**
   * 清除DOM中的验证错误
   * @param $form jQuery表单元素
   */
  static clearValidationErrors($form: JQuery): void {
    $form.find('.validation-error').remove();
    $form.find('.is-invalid').removeClass('is-invalid');
  }

  /**
   * 创建防抖的实时验证函数
   * @param schema Zod schema
   * @param $form jQuery表单元素
   * @param delay 防抖延迟（毫秒）
   * @returns 防抖验证函数
   */
  static createDebouncedValidator<T>(
    schema: z.ZodSchema<T>, 
    $form: JQuery, 
    delay: number = 300
  ): () => void {
    return debounce(() => {
      const formData = FormValidator.extractFormData($form);
      const result = FormValidator.validate(schema, formData);
      
      if (!result.success && result.errors) {
        FormValidator.showValidationErrors($form, result.errors);
      } else {
        FormValidator.clearValidationErrors($form);
      }
    }, delay);
  }

  /**
   * 从表单中提取数据
   * @param $form jQuery表单元素
   * @returns 表单数据对象
   */
  static extractFormData($form: JQuery): Record<string, any> {
    const formData: Record<string, any> = {};

    // 提取输入框和文本域
    $form.find('input, textarea, select').each(function() {
      const $element = $(this);
      const name = $element.attr('name') || $element.attr('id')?.replace('-input', '').replace('-textarea', '');
      
      if (name) {
        const type = $element.attr('type');
        
        if (type === 'checkbox') {
          formData[name] = $element.prop('checked');
        } else if (type === 'radio') {
          if ($element.prop('checked')) {
            formData[name] = $element.val();
          }
        } else if (type === 'number') {
          const value = $element.val();
          formData[name] = value ? Number(value) : undefined;
        } else {
          formData[name] = $element.val();
        }
      }
    });

    // 特殊处理：提取按钮列表
    const buttons: Array<{ name: string; visible: boolean }> = [];
    $form.find('.button-item').each(function() {
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

    // 特殊处理：提取变量数据
    const data: Record<string, any> = {};
    $form.find('.variable-item').each(function() {
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

    log.debug('[FormValidator] 提取的表单数据:', formData);
    return formData;
  }

  /**
   * 绑定实时验证到表单
   * @param schema Zod schema
   * @param $form jQuery表单元素
   * @param delay 防抖延迟
   */
  static bindRealTimeValidation<T>(
    schema: z.ZodSchema<T>, 
    $form: JQuery, 
    delay: number = 300
  ): void {
    const validator = FormValidator.createDebouncedValidator(schema, $form, delay);
    
    // 绑定到所有输入元素
    $form.find('input, textarea, select').on('input change', validator);
    
    // 特殊绑定：动态添加的按钮和变量
    $form.on('input change', '.button-item input, .variable-item input', validator);
    
    log.debug('[FormValidator] 已绑定实时验证');
  }

  /**
   * 填充表单数据
   * @param $form jQuery表单元素
   * @param data 要填充的数据
   */
  static populateForm($form: JQuery, data: Record<string, any>): void {
    Object.entries(data).forEach(([key, value]) => {
      if (value === null || value === undefined) return;

      const $field = $form.find(`#${key}-input, #${key}-textarea, input[name="${key}"], textarea[name="${key}"]`);
      
      if ($field.length) {
        const type = $field.attr('type');
        
        if (type === 'checkbox') {
          $field.prop('checked', Boolean(value));
        } else if (type === 'radio') {
          $form.find(`input[name="${key}"][value="${value}"]`).prop('checked', true);
        } else {
          $field.val(String(value));
        }
      }
    });

    // 特殊处理：填充按钮数据
    if (data.buttons && Array.isArray(data.buttons)) {
      // 这里需要根据具体的按钮UI实现来填充
      log.debug('[FormValidator] 需要填充按钮数据:', data.buttons);
    }

    // 特殊处理：填充变量数据
    if (data.data && typeof data.data === 'object') {
      // 这里需要根据具体的变量UI实现来填充
      log.debug('[FormValidator] 需要填充变量数据:', data.data);
    }

    log.debug('[FormValidator] 表单数据填充完成');
  }
}

/**
 * 便捷的验证函数
 */
export const validateForm = FormValidator.validate;
export const safeValidateForm = FormValidator.safeValidate;
export const showFormErrors = FormValidator.showValidationErrors;
export const clearFormErrors = FormValidator.clearValidationErrors;
export const extractFormData = FormValidator.extractFormData;
export const populateForm = FormValidator.populateForm;
export const bindRealTimeValidation = FormValidator.bindRealTimeValidation;
