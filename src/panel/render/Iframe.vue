<template>
  <div v-if="loading" class="TH-message-iframe-loading">Loading...</div>
  <iframe
    v-show="!loading"
    :id="`TH-message-${id}`"
    ref="iframe"
    loading="lazy"
    v-bind="src_prop"
    @load="loading = false"
  />
</template>

<script setup lang="ts">
import { createSrcContent } from '@/panel/render/iframe';

const props = defineProps<{
  id: string;
  element: HTMLElement;
  withLoading: boolean;
  useBlobUrl: boolean;
}>();

const $element = $(props.element);

const loading = ref(props.withLoading);

const src_prop = computed((old_src_prop?: { srcdoc?: string; src?: string }) => {
  if (old_src_prop?.src) {
    URL.revokeObjectURL(old_src_prop.src);
  }

  const content = createSrcContent($element.find('code').text(), props.useBlobUrl);
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

// TODO: 应该有更好的办法处理和折叠代码块的兼容性
onMounted(() => {
  $element
    .children()
    .filter((_index, child) => !$(child).is('iframe') && !$(child).hasClass('TH-message-iframe-loading'))
    .hide();
});
onBeforeUnmount(() => {
  const $button = $element.children('.TH-collapse-code-block-button');
  if ($button.length === 0) {
    $element.children('code').show();
  } else {
    $button.text('显示代码块').show();
  }
});
</script>
