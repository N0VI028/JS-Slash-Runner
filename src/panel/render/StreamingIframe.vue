<template>
  <iframe
    :id="prefixed_id"
    ref="iframe_ref"
    :name="prefixed_id"
    loading="lazy"
    v-bind="src_prop"
    class="w-full"
    frameborder="0"
    @load="onLoad"
  />
</template>

<script setup lang="ts">
import { createSrcContent } from '@/panel/render/iframe';
import { eventSource } from '@sillytavern/script';

const props = defineProps<{
  id: string;
  srcdoc: string;
  useBlobUrl: boolean;
}>();

const iframe_ref = useTemplateRef<HTMLIFrameElement>('iframe');

// 高度调整
useEventListener(window, 'resize', () => {
  iframe_ref.value?.contentWindow?.postMessage({ type: 'TH_UPDATE_VIEWPORT_HEIGHT' }, '*');
});

// 代码内容
const src_prop = computed((old_src_prop?: { srcdoc?: string; src?: string }) => {
  if (old_src_prop?.src) {
    URL.revokeObjectURL(old_src_prop.src);
  }

  const content = createSrcContent(props.srcdoc, props.useBlobUrl);
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

// 相关事件
const prefixed_id = computed(() => `TH-message--${props.id}`);
onMounted(() => {
  eventSource.emit('message_iframe_render_started', prefixed_id.value);
});
function onLoad() {
  eventSource.emit('message_iframe_render_ended', prefixed_id.value);
}
</script>
