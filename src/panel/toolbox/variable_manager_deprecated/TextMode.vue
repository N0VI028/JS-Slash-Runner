<template>
  <!-- prettier-ignore -->
  <div class="relative h-full w-full overflow-hidden">
    <!-- 文本编辑：正常模式显示 textarea -->
    <textarea
      v-show="!isSearching"
      ref="textareaRef"
      v-model="textContent"
      class="absolute inset-0 h-full w-full resize-none! th-text-sm!"
      spellcheck="false"
      @blur="handleSave"
    ></textarea>

    <!-- 搜索模式：隐藏 textarea，显示高亮 div（样式复制自 textarea） -->
    <div
      v-show="isSearching"
      ref="highlightRef"
      class="absolute inset-0 overflow-auto whitespace-pre-wrap"
    >
      <Highlighter :query="props.searchInput">{{ textContent }}</Highlighter>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  data: Record<string, unknown> | unknown[];
  searchInput: RegExp | null;
}>();

const emit = defineEmits<{
  (event: 'update:data', value: Record<string, unknown> | unknown[]): void;
}>();

const textareaRef = ref<HTMLTextAreaElement | null>(null);
const highlightRef = ref<HTMLDivElement | null>(null);
const textContent = ref('');
const isDirty = ref(false);
const isInitialized = ref(false);
const isSearching = computed(() => props.searchInput !== null);

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

/**
 * 复制 textarea 的关键样式到高亮容器，确保无感切换
 */
function copyTextareaStyles() {
  const ta = textareaRef.value;
  const hi = highlightRef.value;
  if (!ta || !hi) return;
  const cs = window.getComputedStyle(ta);
  const keys: Array<string> = [
    'font-size',
    'line-height',
    'padding-top',
    'padding-right',
    'padding-bottom',
    'padding-left',
    'border-top-width',
    'border-right-width',
    'border-bottom-width',
    'border-left-width',
    'border-top-style',
    'border-right-style',
    'border-bottom-style',
    'border-left-style',
    'border-top-color',
    'border-right-color',
    'border-bottom-color',
    'border-left-color',
    'border-radius',
    'background-color',
  ];
  for (const prop of keys) {
    const v = cs.getPropertyValue(prop);
    if (v) hi.style.setProperty(prop, v);
  }
  hi.style.whiteSpace = 'pre-wrap';
  hi.style.overflow = 'auto';
}

// 切换搜索视图时，同步滚动位置并复制样式
watch(isSearching, async val => {
  await nextTick();
  if (val) {
    copyTextareaStyles();
    if (textareaRef.value && highlightRef.value) {
      highlightRef.value.scrollTop = textareaRef.value.scrollTop;
      highlightRef.value.scrollLeft = textareaRef.value.scrollLeft;
    }
  } else if (textareaRef.value && highlightRef.value) {
    textareaRef.value.scrollTop = highlightRef.value.scrollTop;
    textareaRef.value.scrollLeft = highlightRef.value.scrollLeft;
  }
});

onMounted(() => {
  if (isSearching.value) nextTick(copyTextareaStyles);
});
</script>
