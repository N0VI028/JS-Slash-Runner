<template>
  <div class="flex h-full w-full flex-col overflow-hidden py-0.5">
    <div class="relative flex h-4 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <Toolbar v-model:search_input="search_input" />

    <template v-for="({ component }, index) in tabs" :key="index">
      <component :is="component" v-if="active_tab === index" />
    </template>
  </div>
</template>

<script setup lang="ts">
import Character from '@/panel/toolbox/variable_manager/ContentCharacter.vue';
import Chat from '@/panel/toolbox/variable_manager/ContentChat.vue';
import Global from '@/panel/toolbox/variable_manager/ContentGlobal.vue';
import Message from '@/panel/toolbox/variable_manager/ContentMessage.vue';
import Preset from '@/panel/toolbox/variable_manager/ContentPreset.vue';
import Toolbar from '@/panel/toolbox/variable_manager/Toolbar.vue';

const active_tab = useLocalStorage<number>('TH-VariableManager:active_tab', 0);
const tabs = [
  { name: t`全局`, component: Global },
  { name: t`预设`, component: Preset },
  { name: t`角色`, component: Character },
  { name: t`聊天`, component: Chat },
  { name: t`消息楼层`, component: Message },
];

const search_input = ref<string | RegExp>('');
// TODO: 将 search_input 等 Toolbar 数据传入 tabs.component
</script>

<style lang="scss" scoped>
@reference "../../global.css";

.TH-tab-item {
  @apply px-1 cursor-pointer relative flex items-center z-1 h-full;

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
