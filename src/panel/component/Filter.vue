<template>
  <div ref="filterRef" class="relative">
    <div
      class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
      :title="title"
      @click="is_open = !is_open"
    >
      <i class="fa-solid fa-filter"></i>
    </div>
    <teleport v-if="is_open" :to="to" :disabled="!to">
      <div ref="contentRef">
        <slot />
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { onClickOutside } from '@vueuse/core';
import { ref, type Ref } from 'vue';

defineProps<{
  title: string;
  to?: string | HTMLElement | Ref<any> | null;
}>();

const is_open = ref(false);
const filterRef = ref<HTMLElement>();
const contentRef = ref<HTMLElement>();

onClickOutside(
  filterRef,
  () => {
    is_open.value = false;
  },
  {
    ignore: [contentRef],
  },
);
</script>
