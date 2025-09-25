<template>
  <div class="flex h-full w-full flex-col overflow-hidden py-0.5">
    <div class="relative flex h-4 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <Toolbar v-model="toolbar_state" />

    <Content v-model="variables" />
  </div>
</template>

<script setup lang="ts">
import Content from '@/panel/toolbox/variable_manager/Content.vue';
import Toolbar from '@/panel/toolbox/variable_manager/Toolbar.vue';

const active_tab = useLocalStorage<number>('TH-VariableManager:active_tab', 0);
const tabs = [{ name: t`全局` }, { name: t`角色` }, { name: t`聊天` }, { name: t`消息楼层` }];

const toolbar_state = ref({
  search_input: '',
});

const variables = ref<Record<string, any>>();
watch(active_tab, () => {});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";

.TH-tab-item {
  @apply px-1 cursor-pointer relative flex items-center z-1 h-full;

  &-text {
    @apply text-(length:--TH-FontSize-base) transition-all duration-300 ease-in-out relative inline-block;
  }

  &-text::after {
    @apply content-[''] absolute left-0 bottom-0 w-full h-0.25 bg-(--SmartThemeQuoteColor) transition-transform duration-300 ease-in-out;
    transform: scaleX(0);
    transform-origin: center;
  }

  &.TH-tab-active &-text {
    @apply font-bold text-(length:--TH-FontSize-md);
  }
  &.TH-tab-active &-text::after {
    transform: scaleX(1);
  }
}
</style>
