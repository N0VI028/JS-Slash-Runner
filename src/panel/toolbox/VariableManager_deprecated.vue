<template>
  <div class="flex h-full w-full flex-col overflow-hidden py-0.5">
    <div class="relative flex h-4 shrink-0 justify-start py-0.5">
      <template v-for="({ name }, index) in tabs" :key="index">
        <div :class="['TH-tab-item', { 'TH-tab-active': active_tab === index }]" @click="active_tab = index">
          <div class="TH-tab-item-text">{{ name }}</div>
        </div>
      </template>
    </div>

    <div class="shrink-0">
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
          :search-input="search_input"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Character from '@/panel/toolbox/variable_manager_deprecated/ContentCharacter.vue';
import Chat from '@/panel/toolbox/variable_manager_deprecated/ContentChat.vue';
import Global from '@/panel/toolbox/variable_manager_deprecated/ContentGlobal.vue';
import Message from '@/panel/toolbox/variable_manager_deprecated/ContentMessage.vue';
import Preset from '@/panel/toolbox/variable_manager_deprecated/ContentPreset.vue';
import { createDefaultFilters } from '@/panel/toolbox/variable_manager_deprecated/filter';
import Toolbar from '@/panel/toolbox/variable_manager_deprecated/Toolbar.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager_deprecated/types';
import { treeControlKey } from '@/panel/toolbox/variable_manager_deprecated/types';
// 与各 Content 组件通过 defineExpose 暴露的公共接口保持一致
type HistoryController = {
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  createRootVariable?: (
    payload: import('./variable_manager_deprecated/types').RootVariablePayload,
  ) => boolean | Promise<boolean>;
} | null;

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

const search_input = ref<RegExp | null>(null);
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
