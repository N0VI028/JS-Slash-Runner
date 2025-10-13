<template>
  <WordHighlighter v-bind="bindings" :query="normalized_query" @matches="onMatches">
    <slot />
  </WordHighlighter>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WordHighlighter from 'vue-word-highlighter';

const props = withDefaults(
  defineProps<{
    query?: RegExp | null;
    textToHighlight?: string;
    htmlToHighlight?: string;
    caseSensitive?: boolean;
    diacriticsSensitive?: boolean;
    splitBySpace?: boolean;
    matchMode?: 'partial' | 'exact';
    highlightTag?: string;
    highlightClass?: string | Record<string, boolean> | string[];
    highlightStyle?: string | Record<string, string> | Array<Record<string, string>>;
    wrapperTag?: string;
    wrapperClass?: string | Record<string, boolean> | string[];
  }>(),
  {
    query: undefined,
    textToHighlight: undefined,
    htmlToHighlight: undefined,
    caseSensitive: false,
    diacriticsSensitive: false,
    splitBySpace: false, // 对于以空格分词的多关键词场景，可在具体使用处置为 true
    matchMode: 'partial',
    highlightTag: 'mark',
    highlightClass: 'TH-highlight-mark', // 提供默认类，便于统一风格（可在使用处覆盖）
    highlightStyle: '',
    wrapperTag: 'span',
    wrapperClass: 'TH-highlight-wrapper',
  },
);

const emit = defineEmits<{
  /**
   * 将 vue-word-highlighter 的 matches 事件透出，便于上层统计匹配数量/定位等
   */
  (e: 'matches', matches: Array<unknown>): void;
}>();

/**
 * 归一化查询：
 * - 若为字符串空值（''），按无查询处理，避免全量高亮或无意义计算
 * - 保留正则表达式，以支持 /pattern/ 或复杂匹配
 */
const normalized_query = computed(() => {
  const q = props.query;
  if (q === null) {
    return '';
  }
  return q;
});

/**
 * 组装传递给 WordHighlighter 的绑定参数
 */
const bindings = computed(() => ({
  caseSensitive: props.caseSensitive,
  diacriticsSensitive: props.diacriticsSensitive,
  splitBySpace: props.splitBySpace,
  matchMode: props.matchMode,
  highlightTag: props.highlightTag,
  highlightClass: props.highlightClass,
  highlightStyle: props.highlightStyle as any,
  wrapperTag: props.wrapperTag,
  wrapperClass: props.wrapperClass as any,
  textToHighlight: props.textToHighlight,
  htmlToHighlight: props.htmlToHighlight,
}));

function onMatches(e: Array<unknown>) {
  emit('matches', e);
}
</script>

<style scoped>
/* 默认高亮样式（可在使用处传入 highlightClass 覆盖） */
.TH-highlight-mark {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 35%, transparent);
  color: unset;
  border-radius: 2px;
  padding: 0 2px;
}

.TH-highlight-wrapper {
  /* 保持与周边文字一致的排版，不做额外约束 */
}
</style>
