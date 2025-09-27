<template>
  <div v-if="loading">Loading...</div>
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

const full_content = computed(
  () => `
<html>
<head>
${third_party}
${props.useBlobUrl ? `<base href="${window.location.origin}"/>` : ''}
<!-- TODO: <script src="${predefine_url}"/> -->
</head>
<body>
${$(props.element).text()}
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

onMounted(() => {
  $(props.element).find('code').hide();
});
onBeforeUnmount(() => {
  $(props.element).find('code').show();
});
</script>
