<template>
  <div v-if="loading">Loading...</div>
  <iframe
    v-show="!loading"
    :id="id"
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
  content: string;
  withLoading: boolean;
  useBlobUrl: boolean;
}>();

const full_content = `
<html>
<head>
${third_party}
${props.useBlobUrl ? `<base href="${window.location.origin}"/>` : ''}
<!-- TODO: <script src="${predefine_url}"/> -->
</head>
<body>
${props.content}
</body>
</html>
`;

let url = ref<string | undefined>(undefined);
if (props.useBlobUrl) {
  url = useObjectUrl(new Blob([full_content], { type: 'text/html' }));
}

const loading = ref(props.withLoading);
function onIframeLoad() {
  loading.value = false;
}
</script>
