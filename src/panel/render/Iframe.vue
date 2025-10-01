<template>
  <div v-if="loading" class="TH-message-iframe-loading">Loading...</div>
  <iframe
    v-show="!loading"
    :id="`TH-message-${id}`"
    ref="iframe"
    loading="lazy"
    :src="useBlobUrl ? url : undefined"
    :srcdoc="useBlobUrl ? undefined : srcdoc"
    @load="onIframeLoad"
  />
</template>

<script setup lang="ts">
import { createSrcdoc } from '@/panel/render/iframe';

const props = defineProps<{
  id: string;
  element: HTMLElement;
  withLoading: boolean;
  useBlobUrl: boolean;
}>();

const $element = $(props.element);

const loading = ref(props.withLoading);
function onIframeLoad() {
  loading.value = false;
}

const srcdoc = createSrcdoc($(props.element).find('code').text(), props.useBlobUrl);

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
