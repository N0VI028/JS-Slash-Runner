<template>
  <Popup v-model="isVisible" :buttons="popupButtons">
    <div class="flex w-full flex-col gap-0.75 th-text-sm text-(--SmartThemeBodyColor)">
      <div class="th-text-md font-bold">新建变量</div>
      <div class="flex flex-col gap-0.25">
        <label class="font-semibold">键名</label>
        <input v-model="form.key" type="text" class="text_pole" placeholder="请输入键名" />
      </div>
      <div class="flex flex-col gap-0.25">
        <label class="font-semibold">数据类型</label>
        <select v-model="form.type" class="text_pole">
          <option v-for="option in typeOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div v-if="form.type === 'string'" class="flex flex-col gap-0.25">
        <label class="font-semibold">变量值</label>
        <textarea v-model="form.stringValue" rows="3" class="text_pole" placeholder="请输入字符串，支持多行"></textarea>
      </div>
      <div v-else-if="form.type === 'number'" class="flex flex-col gap-0.25">
        <label class="font-semibold">变量值</label>
        <input v-model="form.numberValue" type="number" class="text_pole" placeholder="请输入数字" />
      </div>
      <div v-else-if="form.type === 'boolean'" class="flex flex-col gap-0.25">
        <label class="font-semibold">变量值</label>
        <select v-model="form.booleanValue" class="text_pole">
          <option v-for="option in booleanOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div v-else-if="form.type === 'array'" class="flex flex-col gap-0.25">
        <label class="font-semibold">变量值</label>
        <textarea
          v-model="form.arrayValue"
          rows="4"
          class="text_pole font-[family-name:var(--monoFontFamily)]!"
          placeholder="请输入 JSON 数组，例如 [1, 2, 3]"
        ></textarea>
      </div>
      <div v-else-if="form.type === 'object'" class="flex flex-col gap-0.25">
        <label class="font-semibold">变量值</label>
        <textarea
          v-model="form.objectValue"
          rows="4"
          class="text_pole font-[family-name:var(--monoFontFamily)]!"
          placeholder='请输入 JSON 对象，例如 {"name": "Tavern"}'
        ></textarea>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import type { RootVariablePayload, RootVariableType } from '@/panel/toolbox/variable_manager/types';
import { rootVariableTypes } from '@/panel/toolbox/variable_manager/types';

const props = defineProps<{
  onSubmit?: (payload: RootVariablePayload) => boolean | Promise<boolean>;
}>();

const isVisible = ref(true);

const typeOptions = rootVariableTypes.map(value => ({
  value,
  label:
    value === 'string'
      ? '字符串'
      : value === 'number'
        ? '数字'
        : value === 'boolean'
          ? '布尔值'
          : value === 'array'
            ? '数组'
            : value === 'object'
              ? '对象'
              : 'Null',
}));

const booleanOptions = [
  { label: 'true', value: 'true' },
  { label: 'false', value: 'false' },
];

const form = reactive({
  key: '',
  type: 'string' as RootVariableType,
  stringValue: '',
  numberValue: '',
  booleanValue: 'true' as 'true' | 'false',
  arrayValue: '[]',
  objectValue: '{}',
});

const popupButtons = computed(() => [
  {
    name: '创建变量',
    shouldEmphasize: true,
    onClick: submit,
  },
  { name: '取消' },
]);

interface ValidationResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

/**
 * 根据变量类型验证并转换用户输入的值
 * @param type 变量的数据类型
 * @returns 验证结果对象，包含成功状态、转换后的数据或错误信息
 */
const validateValue = (type: RootVariableType): ValidationResult => {
  switch (type) {
    case 'string':
      return { success: true, data: form.stringValue };

    case 'number': {
      const trimmed = form.numberValue.toString().trim();
      return { success: true, data: trimmed === '' ? 0 : Number(trimmed) };
    }

    case 'boolean':
      return { success: true, data: form.booleanValue === 'true' };

    case 'array': {
      const trimmed = form.arrayValue.trim();
      if (!trimmed) {
        return { success: false, error: '数组内容不能为空' };
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (!Array.isArray(parsed)) {
          return { success: false, error: '请输入有效的 JSON 数组' };
        }
        return { success: true, data: parsed };
      } catch (error) {
        return { success: false, error: '请输入有效的 JSON 数组' };
      }
    }

    case 'object': {
      const trimmed = form.objectValue.trim();
      if (!trimmed) {
        return { success: false, error: '对象内容不能为空' };
      }
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
          return { success: false, error: '请输入有效的 JSON 对象' };
        }
        return { success: true, data: parsed };
      } catch (error) {
        return { success: false, error: '请输入有效的 JSON 对象' };
      }
    }

    case 'null':
      return { success: true, data: null };

    default:
      return { success: false, error: '未知的数据类型' };
  }
};

/**
 * 重置表单到初始状态，清空所有输入字段
 */
const resetForm = () => {
  form.key = '';
  form.type = 'string';
  form.stringValue = '';
  form.numberValue = '';
  form.booleanValue = 'true';
  form.arrayValue = '[]';
  form.objectValue = '{}';
};

/**
 * 处理表单提交逻辑，验证输入数据并创建根变量
 * @param close 关闭弹出窗口的回调函数
 */
const submit = async (close: () => void) => {
  // 简单验证键名
  if (!form.key || !form.key.trim()) {
    toastr.error('键名不能为空', '键名校验失败');
    return;
  }

  const valueResult = validateValue(form.type);
  if (!valueResult.success) {
    toastr.error(valueResult.error || '未知错误', '变量值校验失败');
    return;
  }

  const payload: RootVariablePayload = {
    key: form.key.trim(),
    type: form.type,
    value: valueResult.data,
  };

  const shouldClose = (await props.onSubmit?.(payload)) ?? true;
  if (shouldClose !== false) {
    close();
    resetForm();
  }
};
</script>
