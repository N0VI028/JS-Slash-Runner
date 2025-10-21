<template>
  <WordHighlighter :query="normalized_query" highlight-class="TH-Highlighter--mark">
    <slot />
  </WordHighlighter>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import WordHighlighter from 'vue-word-highlighter';

const props = defineProps<{
  query: RegExp | null;
}>();

const normalized_query = computed(() => {
  return props.query === null ? '' : props.query;
});
</script>

<style lang="scss">
.TH-Highlighter--mark {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 70%, transparent);
  color: var(--SmartThemeBodyColor);
}
</style>
