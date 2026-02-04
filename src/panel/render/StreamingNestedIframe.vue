<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div ref="host" v-html="html" />

  <Teleport v-for="({ element, text }, index) in elements" :key="text" defer :to="element">
    <Iframe :id="`${id}${index > 0 ? `_${index}` : ''}`" :element="element" :use-blob-url="useBlobUrl" />
  </Teleport>
</template>

<script setup lang="ts">
import Iframe from '@/panel/render/Iframe.vue';
import { isFrontend } from '@/util/is_frontend';

const props = defineProps<{
  id: string;
  html: string;
  useBlobUrl: boolean;
}>();

const host = useTemplateRef<HTMLDivElement>('host');

const elements = ref<{ element: HTMLElement; text: string }[]>([]);
onMounted(() => {
  watchImmediate(
    () => props.html,
    () => {
      if (!host.value) {
        return;
      }
      elements.value = $(host.value)
        .find('pre')
        .filter((_, pre) => isFrontend($(pre).text()))
        .map((_, pre) => {
          const $pre = $(pre);
          const $possible_div = $pre.parent('div.TH-render');
          if ($possible_div.length > 0) {
            return { element: $possible_div[0], text: $pre.text() };
          }
          $pre.wrap('<div class="TH-render">');
          return { element: $pre.parent('div.TH-render')[0], text: $pre.text() };
        })
        .toArray();
    },
    { flush: 'post' },
  );
});
</script>
