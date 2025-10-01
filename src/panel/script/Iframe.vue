<template>
  <iframe
    v-show="false"
    :id="`TH-script-${id}`"
    :src="useBlobUrl ? url : undefined"
    :srcdoc="useBlobUrl ? undefined : srcdoc"
  />
</template>

<script setup lang="ts">
import { createSrcdoc } from '@/panel/script/iframe';

const props = defineProps<{ id: string; content: string; useBlobUrl: boolean }>();

const srcdoc = createSrcdoc(props.content, props.useBlobUrl);

// @ts-expect-error 类型是正确的
const url = computed((old_url?: string) => {
  if (props.useBlobUrl) {
    if (old_url) {
      return old_url;
    }
    return URL.createObjectURL(new Blob([srcdoc], { type: 'text/html' }));
  }
  if (old_url) {
    URL.revokeObjectURL(old_url);
  }
  return undefined;
});
onUnmounted(() => {
  if (url.value) {
    URL.revokeObjectURL(url.value);
  }
});
</script>
