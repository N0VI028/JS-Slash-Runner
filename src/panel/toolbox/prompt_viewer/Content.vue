<template>
  <span ref="content">{{ content }}</span>
</template>

<script setup lang="ts">
import Mark from 'mark.js';

const props = defineProps<{
  content: string;
  searchInput: RegExp | null;
}>();

const content_ref = useTemplateRef<HTMLSpanElement>('content');
let marker: Mark;
onMounted(() => {
  marker = new Mark(content_ref.value!);
});

watch(
  () => props.searchInput,
  () => {
    nextTick(() => {
      marker.unmark();
      if (props.searchInput !== null) {
        marker.markRegExp(props.searchInput);
      }
    });
  },
  { immediate: true },
);
</script>
