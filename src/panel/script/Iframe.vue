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

let url = ref<string | undefined>(undefined);
if (props.useBlobUrl) {
  url = useObjectUrl(new Blob([srcdoc], { type: 'text/html' }));
}
</script>
