<template>
  <iframe v-show="false" :id="id" :src="useBlobUrl ? url : undefined" :srcdoc="useBlobUrl ? undefined : full_content" />
</template>

<script setup lang="ts">
import parent_jquery from '@/iframe/parent_jquery?url';
import predefine_url from '@/iframe/predefine.js?url';
import third_party from '@/iframe/third_party_script.html?raw';

const props = defineProps<{ id: string; content: string; useBlobUrl: boolean }>();

const full_content = `
<html>
<head>
${third_party}
${props.useBlobUrl ? `<base href="${window.location.origin}"/>` : ''}
<script src="${parent_jquery}"/>
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
</script>
