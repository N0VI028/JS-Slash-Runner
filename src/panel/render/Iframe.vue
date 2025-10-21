<template>
  <iframe :id="`TH-message-${id}`" ref="iframe_ref" loading="lazy" v-bind="src_prop" class="w-full" frameborder="0" />
</template>

<script setup lang="ts">
import { createSrcContent } from '@/panel/render/iframe';
import { useHeightObserver } from '@/panel/render/use_height_observer';

const props = defineProps<{
  id: string;
  element: HTMLElement;
  useBlobUrl: boolean;
}>();

const $div = $(props.element);
const $pre = $div.children('pre');

const iframe_ref = useTemplateRef<HTMLIFrameElement>('iframe');

const { observe, unobserve } = useHeightObserver();
useEventListener('message', event => {
  const data = (event && event.data) || {};
  if (data?.type === 'TH_DOM_CONTENT_LOADED' && data.iframe_name === iframe_ref.value?.id) {
    observe(iframe_ref.value!);
  }
});
onBeforeUnmount(() => {
  unobserve(iframe_ref.value!);
});

const src_prop = computed((old_src_prop?: { srcdoc?: string; src?: string }) => {
  if (old_src_prop?.src) {
    URL.revokeObjectURL(old_src_prop.src);
  }

  const content = createSrcContent($pre.find('code').text(), props.useBlobUrl);
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

// 与折叠代码块的兼容性
onMounted(() => {
  $div
    .children()
    .filter((_index, child) => !$(child).is('iframe'))
    .hide();
});
onBeforeUnmount(() => {
  const $button = $div.children('.TH-collapse-code-block-button');
  if ($button.length === 0) {
    $pre.show();
  } else {
    $button.text('显示前端代码块').show();
  }
});
</script>
