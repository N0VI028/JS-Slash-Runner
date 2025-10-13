<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <div class="relative flex h-4 flex-shrink-0 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <div class="flex-1 overflow-hidden">
      <template v-for="({ component }, index) in tabs" :key="index">
        <component :is="component" v-if="active_tab === index" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Global from '@/panel/toolbox/variable_manager2/Global.vue';

const active_tab = useLocalStorage<number>('TH-VariableManager:active_tab', 0);
const tabs = [{ name: t`全局`, component: Global }];
</script>

<style lang="scss" scoped>
@reference "../../global.css";

.TH-tab-item {
  @apply px-0.75 cursor-pointer relative flex items-center z-1 h-full;

  &-text {
    @apply text-base transition-all duration-300 ease-in-out relative inline-block;
  }

  &-text::after {
    @apply content-[''] absolute left-0 bottom-0 w-full h-0.25 bg-(--SmartThemeQuoteColor) transition-transform duration-300 ease-in-out;
    transform: scaleX(0);
    transform-origin: center;
  }

  &.TH-tab-active &-text {
    @apply font-bold text-md;
  }
  &.TH-tab-active &-text::after {
    transform: scaleX(1);
  }
}
</style>
