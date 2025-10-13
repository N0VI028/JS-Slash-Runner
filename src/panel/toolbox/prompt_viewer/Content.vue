<template>
  <Highlighter :query="searchInput">{{ content }}</Highlighter>
</template>

<script setup lang="ts">
defineProps<{
  content: string;
  searchInput: RegExp | null;
}>();
</script>
