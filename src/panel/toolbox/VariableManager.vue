<template>
  <div class="flex h-full w-full flex-col overflow-hidden">
    <div class="relative flex h-4 shrink-0 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <div class="flex-1 overflow-hidden px-0.75">
      <template v-for="({ component }, index) in tabs" :key="index">
        <component :is="component" v-if="active_tab === index" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Character from '@/panel/toolbox/variable_manager/Character.vue';
import Chat from '@/panel/toolbox/variable_manager/Chat.vue';
import Global from '@/panel/toolbox/variable_manager/Global.vue';
import Message from '@/panel/toolbox/variable_manager/Message.vue';
import Preset from '@/panel/toolbox/variable_manager/Preset.vue';
import { useCharacterSettingsStore } from '@/store/settings';

const character = useCharacterSettingsStore();

const active_tab = useLocalStorage<number>('TH-VariableManager:active_tab', 0);
const tabs = [
  { name: t`全局`, component: Global },
  { name: t`预设`, component: Preset },
]
  .concat(character.name ? [{ name: '角色', component: Character }] : [])
  .concat([
    { name: t`聊天`, component: Chat },
    { name: t`消息楼层`, component: Message },
  ]);
</script>

<style lang="scss" scoped>
@reference '../../global.css';

.TH-tab-item {
  @apply px-0.75 cursor-pointer relative flex items-center z-1 h-full;

  &-text {
    @apply th-text-base transition-all duration-300 ease-in-out relative inline-block;
  }

  &-text::after {
    @apply content-[''] absolute left-0 bottom-0 w-full h-0.25 bg-(--SmartThemeQuoteColor) transition-transform duration-300 ease-in-out;
    transform: scaleX(0);
    transform-origin: center;
  }

  &.TH-tab-active &-text {
    @apply font-bold th-text-md;
  }
  &.TH-tab-active &-text::after {
    transform: scaleX(1);
  }
}
</style>
