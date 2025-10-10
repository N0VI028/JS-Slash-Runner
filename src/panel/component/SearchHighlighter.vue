<template>
  <!--
    通用搜索高亮包装组件：
    - 默认使用 vue-word-highlighter 高亮匹配片段
    - 支持字符串、正则、HTML 内容（htmlToHighlight）与默认插槽三种高亮来源
    - 可在复杂组件中精准包裹需要高亮的文本位置
  -->
  <WordHighlighter
    v-bind="bindings"
    :query="normalizedQuery"
    @matches="onMatches"
  >
    <slot />
  </WordHighlighter>
  <!--
    当未提供 text/html 且无插槽内容时，不渲染任何内容
  -->
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WordHighlighter from 'vue-word-highlighter';

/**
 * 搜索高亮组件入参
 * - query: 传入的搜索关键词（字符串或正则）。若未传入，可由上层组件自行传递。
 * - 其余选项与 vue-word-highlighter 保持一致，默认做了轻量包装与安全默认值。
 */
const props = withDefaults(
  defineProps<{
    query?: string | RegExp;
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
    // 对于以空格分词的多关键词场景，可在具体使用处置为 true
    splitBySpace: false,
    matchMode: 'partial',
    highlightTag: 'mark',
    // 提供默认类，便于统一风格（可在使用处覆盖）
    highlightClass: 'th-highlight-mark',
    wrapperTag: 'span',
    wrapperClass: 'th-highlight-wrapper',
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
const normalizedQuery = computed(() => {
  const q = props.query;
  if (q === '' || q === undefined || q === null) return '';
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
.th-highlight-mark {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 35%, transparent);
  color: unset;
  border-radius: 2px;
  padding: 0 2px;
}

.th-highlight-wrapper {
  /* 保持与周边文字一致的排版，不做额外约束 */
}
</style>

