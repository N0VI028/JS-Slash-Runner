<template>
  <iframe v-show="false" :id="`TH-script--${name}--${id}`" :name="`TH-script--${name}--${id}`" v-bind="src_prop" />
</template>

<script setup lang="ts">
import { createSrcContent } from '@/panel/script/iframe';

const props = defineProps<{ id: string; name: string; content: string; useBlobUrl: boolean }>();

const src_prop = computed((old_src_prop?: { srcdoc?: string; src?: string }) => {
  if (old_src_prop?.src) {
    URL.revokeObjectURL(old_src_prop.src);
  }

  const content = createSrcContent(props.content, props.useBlobUrl);
  if (!props.useBlobUrl) {
    return { srcdoc: content };
  }
  return { src: URL.createObjectURL(new Blob([content], { type: 'text/html' })) };
});
onUnmounted(() => {
  if (src_prop.value.src) {
    URL.revokeObjectURL(src_prop.value.src);
  }
});
</script>
