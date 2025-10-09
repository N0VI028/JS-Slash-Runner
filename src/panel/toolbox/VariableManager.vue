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
        v-model:current-view="currentView"
        :can-undo="canUndo"
        :can-redo="canRedo"
        :on-create-root="handleCreateRootVariable"
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
          :current-view="currentView"
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
// 与各 Content 组件通过 defineExpose 暴露的公共接口保持一致
type HistoryController = {
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  createRootVariable?: (payload: import('./variable_manager/types').RootVariablePayload) => boolean | Promise<boolean>;
} | null;
import { createDefaultFilters } from '@/panel/toolbox/variable_manager/filter';
import Toolbar from '@/panel/toolbox/variable_manager/Toolbar.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager/types';
import { treeControlKey } from '@/panel/toolbox/variable_manager/types';

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

const handleCreateRootVariable = async (payload: RootVariablePayload) => {
  const editor = activeHistory.value;
  if (!editor || typeof editor.createRootVariable !== 'function') {
    toastr.error('当前标签页不支持新增变量', '操作失败');
    return false;
  }
  return editor.createRootVariable(payload);
};

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
  { name: t`消息`, component: Message },
];

const search_input = ref<string | RegExp>('');
// TODO: search_input 接入Toolbar，tabs.component
const filters = ref(createDefaultFilters());
const currentView = ref<'tree' | 'card' | 'text'>('tree');

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
