<template>
  <div class="tavern-helper-button" @click="props.on_click">
    <slot />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  on_click: () => void;
}>();
</script>

<style lang="scss" scoped>
.tavern-helper-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 55px;
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
  padding: 3px 5px;
  font-size: calc(var(--mainFontSize) * 0.8);
  color: var(--SmartThemeBodyColor);

  a {
    color: var(--SmartThemeBodyColor);
  }

  i {
    font-size: calc(var(--mainFontSize) * 0.6) !important;
    margin-left: 5px;
  }
}
</style>
