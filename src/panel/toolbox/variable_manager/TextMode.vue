<template>
  <!-- prettier-ignore -->
  <div class="relative h-full w-full overflow-hidden">
    <textarea
      ref="textareaRef"
      v-model="textContent"
      class="h-full w-full resize-none! text-sm!"
      spellcheck="false"
      @blur="handleSave"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
  data: Record<string, unknown> | unknown[];
}>();

const emit = defineEmits<{
  (event: 'update:data', value: Record<string, unknown> | unknown[]): void;
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const textContent = ref('');
const isDirty = ref(false);
const isInitialized = ref(false);

/**
 * 格式化对象为可读的JSON文本
 * @param {any} data - 要格式化的数据
 * @returns {string} 格式化后的JSON字符串
 */
const formatDataToText = (data: any): string => {
  try {
    return JSON.stringify(data, null, 2);
  } catch (error) {
    console.error('Failed to format data:', error);
    return '{}';
  }
};

/**
 * 解析文本为对象
 * @param {string} text - 要解析的JSON文本
 * @returns {Object} 解析结果
 * @returns {any} returns.data - 解析后的数据
 * @returns {boolean} returns.success - 是否解析成功
 * @returns {string} returns.error - 错误信息（如果有）
 */
const parseTextToData = (text: string): { data: any; success: boolean; error?: string } => {
  try {
    const parsed = JSON.parse(text);
    return { data: parsed, success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { data: null, success: false, error: errorMessage };
  }
};

/**
 * 保存文本内容的更改
 */
const handleSave = () => {
  if (!isDirty.value) return;

  const { data, success, error } = parseTextToData(textContent.value);

  if (!success) {
    toastr.error(`JSON 格式错误: ${error || '未知错误'}`);
    // 恢复原始内容
    textContent.value = formatDataToText(props.data);
    isDirty.value = false;
    return;
  }

  // 检查数据类型是否匹配
  const isOriginalArray = Array.isArray(props.data);
  const isParsedArray = Array.isArray(data);

  if (isOriginalArray !== isParsedArray) {
    toastr.error('数据类型不匹配，无法保存');
    textContent.value = formatDataToText(props.data);
    isDirty.value = false;
    return;
  }

  emit('update:data', data);
  isDirty.value = false;
  toastr.success('文本内容已保存');
};

// 初始化文本内容
watch(
  () => props.data,
  newData => {
    if (!isDirty.value) {
      textContent.value = formatDataToText(newData);
      if (!isInitialized.value) {
        isInitialized.value = true;
      }
    }
  },
  { immediate: true, deep: true },
);

// 监听文本变化，标记为已修改
watch(textContent, () => {
  if (isInitialized.value) {
    isDirty.value = true;
  }
});

// 点击外部保存
const stopClickOutside = onClickOutside(textareaRef, () => {
  handleSave();
});

onBeforeUnmount(() => {
  if (stopClickOutside) {
    stopClickOutside();
  }
});
</script>

<style scoped>
textarea {
  tab-size: 2;
  -moz-tab-size: 2;
}

textarea::selection {
  background-color: var(--SmartThemeQuoteColor);
  color: var(--SmartThemeBGColor);
}
</style>
