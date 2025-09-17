<template>
  <div
    :class="type === 'tavern_helper' ? 'TH-Button--container' : 'menu_button menu_button_icon interactable'"
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

<style lang="scss">
.TH-Button-- {
  &container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 55px;
    border: 1px solid var(--SmartThemeQuoteColor);
    border-radius: 5px;
    padding: 3px 5px;
    font-size: var(--TH-FontSizeSm);
    color: var(--SmartThemeBodyColor);

    a {
      color: var(--SmartThemeBodyColor);
    }

    i {
      font-size: var(--TH-FontSizeXs) !important;
      margin-left: 5px;
    }
  }
}
</style>
