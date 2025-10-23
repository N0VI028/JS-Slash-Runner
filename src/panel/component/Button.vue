<template>
  <div
    :class="type === 'tavern_helper' ? 'TH-Button--container' : 'menu_button menu_button_icon interactable flex-wrap'"
    class="cursor-pointer"
    @click="onClick"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    type?: 'tavern_helper' | 'tavern';
    onClick: () => void;
  }>(),
  { type: 'tavern_helper' },
);
</script>

<style lang="scss" scoped>
@reference '../../global.css';

.TH-Button-- {
  &container {
    @apply flex items-center justify-center w-4 border-1 border-(--SmartThemeQuoteColor) rounded-sm py-[3px] px-[5px] th-text-xs text-(--SmartThemeBodyColor);

    a {
      color: var(--SmartThemeBodyColor);
    }

    i {
      @apply th-text-xs! ml-0.5;
    }
  }
}
</style>
