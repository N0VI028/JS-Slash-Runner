<template>
  <div class="my-(--TH-FontSize) flex w-full items-center" :style="{ marginTop: marginY, marginBottom: marginY }">
    <!-- prettier-ignore-attribute -->
    <div
      v-if="$slots.default"
      class="
        mr-(--TH-FontSizeSm) flex
        text-[length:var(--TH-FontSizeSm)]
        whitespace-nowrap
      "
      :style="type === 'plain' ? '' : 'word-spacing: 1.5'"
    >
      <slot></slot>
    </div>
    <div class="flex-grow bg-[var(--grey5050a)]" :class="type === 'plain' ? 'h-[1px]' : 'h-[2px]'"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'plain' | 'major';
    marginY?: string;
  }>(),
  { type: 'plain', marginY: 'var(--TH-FontSize)' },
);
</script>
