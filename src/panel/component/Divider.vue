<template>
  <div class="flex w-full items-center" :class="marginY">
    <!-- prettier-ignore-attribute -->
    <div
      v-if="$slots.default"
      class="mr-(--TH-FontSize-sm) flex text-(length:--TH-FontSize-sm) whitespace-nowrap"
      :style="type === 'plain' ? '' : 'word-spacing: 1.5'"
    >
      <slot></slot>
    </div>
    <div
      class="flex-grow bg-[var(--grey5050a)]"
      :class="weight ? weight : (type === 'plain' ? 'h-[1px]' : 'h-[2px]')"
    ></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'plain' | 'major';
    marginY?: string;
    weight?: string;
  }>(),
  { type: 'plain', marginY: 'my-0.5', weight: 'h-[1px]' },
);
</script>
