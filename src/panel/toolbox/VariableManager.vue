<template>
  <div class="flex h-full w-full flex-col overflow-hidden py-0.5">
    <div class="relative flex h-4 flex-shrink-0 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <div class="flex-shrink-0">
      <Toolbar
        v-model:search_input="search_input"
        v-model:filters="filters"
        :can-undo="canUndo"
        :can-redo="canRedo"
        @collapse-all="collapseAllTree"
        @expand-all="expandAllTree"
        @undo="handleUndo"
        @redo="handleRedo"
      />
    </div>

    <div class="flex-1 overflow-hidden">
      <template v-for="({ component }, index) in tabs" :key="index">
        <component
          :is="component"
          v-if="active_tab === index"
          :ref="el => setTabRef(index, el as HistoryController | null)"
          class="h-full"
          :filters="filters"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Character from '@/panel/toolbox/variable_manager/ContentCharacter.vue';
import Chat from '@/panel/toolbox/variable_manager/ContentChat.vue';
import Global from '@/panel/toolbox/variable_manager/ContentGlobal.vue';
import Message from '@/panel/toolbox/variable_manager/ContentMessage.vue';
import Preset from '@/panel/toolbox/variable_manager/ContentPreset.vue';
import type Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import Toolbar from '@/panel/toolbox/variable_manager/Toolbar.vue';
import { createDefaultFilters } from '@/panel/toolbox/variable_manager/filter';
import { treeControlKey } from '@/panel/toolbox/variable_manager/treeControl';

type HistoryController = InstanceType<typeof Editor>;

const collapseAllSignal = ref(0);
const expandAllSignal = ref(0);
const lastAction = ref<'collapse' | 'expand' | null>(null);
const tabRefs = ref<(HistoryController | null)[]>([]);
const setTabRef = (index: number, el: HistoryController | null) => {
  tabRefs.value[index] = el;
};

const activeHistory = computed(() => tabRefs.value[active_tab.value] ?? null);
const canUndo = computed(() => !!activeHistory.value?.canUndo);
const canRedo = computed(() => !!activeHistory.value?.canRedo);
const handleUndo = () => activeHistory.value?.undo?.();
const handleRedo = () => activeHistory.value?.redo?.();

provide(treeControlKey, {
  collapseAllSignal,
  expandAllSignal,
  lastAction,
});

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
const filters = ref(createDefaultFilters());

const collapseAllTree = () => {
  collapseAllSignal.value += 1;
  lastAction.value = 'collapse';
};

const expandAllTree = () => {
  expandAllSignal.value += 1;
  lastAction.value = 'expand';
};
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
