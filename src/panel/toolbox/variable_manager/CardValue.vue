<template>
  <!-- prettier-ignore -->
  <CardBase
    v-model:name="name"
    v-model:content="content"
    v-model:collapsed="isCollapsed"
    :depth="props.depth"
    :type-label="
      contentType === 'string'
        ? t`String`
        : contentType === 'number'
          ? t`Number`
          : contentType === 'boolean'
            ? t`Boolean`
            : t`Null`
    "
    :icon="
      contentType === 'string'
        ? 'fa-regular fa-font'
        : contentType === 'number'
          ? 'fa-solid fa-hashtag'
          : contentType === 'boolean'
            ? 'fa-solid fa-toggle-on'
            : 'fa-regular fa-circle-dot'
    "
    collapsible
    :search-input="props.searchInput"
    @delete="emitDelete"
  >
    <div
      v-show="!isCollapsed"
      class="
        mt-0.25 text-xs leading-snug break-words break-all whitespace-normal text-(--SmartThemeBodyColor)
        sm:text-sm sm:leading-relaxed
        md:text-base md:leading-normal
      "
    >
      <template v-if="isSearching">
        <SearchHighlighter :query="props.searchInput" :text-to-highlight="formattedValue" />
      </template>
      <template v-else>
        {{ formattedValue }}
      </template>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import SearchHighlighter from '@/panel/component/SearchHighlighter.vue';
import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { computed, ref, watch } from 'vue';
import { isSearching as isSearchingUtil, nodeMatchesSearch } from '@/panel/toolbox/variable_manager/search';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: any }): void;
}>();

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    depth?: number;
    filters: FiltersState;
    /** 搜索输入，空字符串或未定义表示未搜索 */
    searchInput?: string | RegExp;
  }>(),
  {
    collapsed: false,
    depth: 0,
    searchInput: '',
  },
);

const isCollapsed = ref(props.collapsed ?? false);

watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

type ContentType = 'string' | 'number' | 'boolean' | 'nil';

/**
 * 发射删除事件
 * 向父组件发送删除当前变量的信号，包含变量名和内容
 */
const emitDelete = () => {
  emit('delete', {
    name: name.value,
    content: content.value,
  });
};

/**
 * 计算内容类型
 * 根据变量的实际值确定其数据类型，用于UI显示和格式化
 * @returns {'string'|'number'|'boolean'|'nil'} 内容的数据类型
 */
const contentType = computed<ContentType>(() => {
  const v = content.value;
  if (v === null || v === undefined) return 'nil';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  // 兜底为字符串展示
  return 'string';
});

/**
 * 格式化显示值
 * 将变量的原始值转换为适合UI显示的字符串格式
 * @returns {string} 格式化后的显示字符串
 */
const formattedValue = computed(() => {
  const v = content.value;
  switch (contentType.value) {
    case 'string':
      return v === '' ? '""' : String(v);
    case 'number':
      return String(v);
    case 'boolean':
      return v ? 'true' : 'false';
    case 'nil':
      return v === null ? 'null' : 'undefined';
    default:
      return String(v);
  }
});

const isSearching = computed(() => props.searchInput !== '' && props.searchInput !== undefined && props.searchInput !== null);

// 搜索命中时自动展开
const searchMatched = computed(() => {
  if (!isSearchingUtil(props.searchInput)) return false;
  const q = props.searchInput as string | RegExp;
  return nodeMatchesSearch(name.value as any, content.value, q);
});

watch(
  () => searchMatched.value,
  matched => {
    if (matched && isCollapsed.value) {
      isCollapsed.value = false;
    }
  },
  { immediate: true },
);
</script>
