<template>
  <div v-if="loading" class="TH-message-iframe-loading">Loading...</div>
  <iframe
    v-show="!loading"
    :id="id"
    ref="iframe"
    loading="lazy"
    :src="useBlobUrl ? url : undefined"
    :srcdoc="useBlobUrl ? undefined : full_content"
    @load="onIframeLoad"
  />
</template>

<script setup lang="ts">
import predefine_url from '@/iframe/predefine.js?url';
import third_party from '@/iframe/third_party_frontend.html?raw';

const props = defineProps<{
  id: string;
  element: HTMLElement;
  withLoading: boolean;
  useBlobUrl: boolean;
}>();

const $element = $(props.element);

const full_content = computed(
  () => `
<html>
<head>
${third_party}
${props.useBlobUrl ? `<base href="${window.location.origin}"/>` : ''}
<!-- TODO: <script src="${predefine_url}"/> -->
</head>
<body>
${$element.find('code').text()}
</body>
</html>
`,
);

const loading = ref(props.withLoading);
function onIframeLoad() {
  loading.value = false;
}

let url: Ref<string | undefined>;
if (props.useBlobUrl) {
  const blob = computed(() => new Blob([full_content.value], { type: 'text/html' }));
  url = useObjectUrl(blob);
}

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
