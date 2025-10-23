<template>
  <div class="flex w-full items-center" :class="marginY">
    <!-- prettier-ignore-attribute -->
    <div
      v-if="$slots.default"
      class="mr-0.75 flex th-text-sm whitespace-nowrap"
      :style="type === 'plain' ? '' : 'word-spacing: 1.5'"
    >
      <slot></slot>
    </div>
    <div class="flex-grow bg-(--grey5050a)" :class="weight ? weight : type === 'plain' ? 'h-[1px]' : 'h-[2px]'"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'plain' | 'major';
    marginY?: string;
    weight?: string;
  }>(),
  { type: 'plain', marginY: 'my-0.5', weight: undefined },
);
</script>
