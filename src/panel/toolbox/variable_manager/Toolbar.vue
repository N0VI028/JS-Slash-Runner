<template>
  <DefineIconButton v-slot="{ title, icon, onClick, active, disabled }">
    <div
      :class="[
        'flex items-center justify-center rounded-sm transition-colors duration-200',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
      ]"
      :title="title"
      :disabled="disabled"
      @click="
        () => {
          if (disabled) return;
          onClick?.();
        }
      "
    >
      <i :class="[icon, active ? 'text-(--SmartThemeQuoteColor)' : '']"></i>
    </div>
  </DefineIconButton>
  <!-- prettier-ignore -->
  <div class="mx-0.75 flex flex-col flex-wrap rounded-sm bg-(--SmartThemeQuoteColor)/50 p-0.5 pr-0.75 text-sm">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1">
        <div class="inline-flex overflow-hidden rounded border border-white">
          <div
            v-for="option in viewOptions"
            :key="option.value"
            class="min-w-3 px-0.5 py-[3px] text-center text-sm! transition-colors duration-200"
            :style="
              option.value === currentView
                ? 'background-color: white; color: var(--SmartThemeQuoteColor);'
                : 'background-color: transparent; color: white;'
            "
            @click="setView(option.value)"
          >
            {{ option.label }}
          </div>
        </div>
        <div class="h-1 w-px bg-(--SmartThemeBodyColor)"></div>
        <div class="flex items-center gap-0.75">
          <IconButton
            title="全部收起"
            icon="fa-solid fa-angles-up"
            :on-click="collapseAll"
            :disabled="currentView === 'text'"
          />
          <IconButton
            title="全部展开"
            icon="fa-solid fa-angles-down"
            :on-click="expandAll"
            :disabled="currentView === 'text'"
          />
          <IconButton
            title="筛选变量"
            icon="fa-solid fa-filter"
            :on-click="showFilter"
            :active="isFilterActive"
            :disabled="currentView === 'text'"
          />
          <IconButton title="搜索变量" icon="fa-solid fa-magnifying-glass" :on-click="showSearch" />
        </div>
      </div>
      <div class="flex items-center gap-0.75">
        <IconButton
          title="撤销"
          icon="fa-solid fa-rotate-left"
          :on-click="() => emit('undo')"
          :disabled="!canUndo"
        />
        <IconButton
          title="重做"
          icon="fa-solid fa-rotate-right"
          :on-click="() => emit('redo')"
          :disabled="!canRedo"
        />
      </div>
    </div>
    <div ref="teleportTarget"></div>
  </div>
  <!-- 搜索显示 -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <transition name="vm-toolbar-teleport">
      <SearchBar
        v-if="isSearchVisible"
        v-model="search_input"
        :placeholder="t`搜索变量(支持正则表达式)`"
        :clearable="true"
        class="mt-0.5 w-full"
      />
    </transition>
  </Teleport>
  <!-- 筛选显示 -->
  <Teleport :to="teleportTarget" :disabled="!teleportTarget">
    <transition name="vm-toolbar-teleport">
      <div v-if="isFilterVisible" class="mt-0.5 flex flex-wrap gap-1 rounded-sm text-(--SmartThemeBodyColor)">
        <template v-for="filter in filterDefinitions" :key="filter.type">
          <div class="flex items-center gap-0.5">
            <input
              :id="`filter-${filter.type}`"
              type="checkbox"
              class="m-0"
              :data-type="filter.type"
              :checked="filters[filter.type]"
              @change="onFilterChange(filter.type, $event)"
            />
            <label :for="`filter-${filter.type}`">{{ filter.name }}</label>
          </div>
        </template>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { FilterType, FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { createDefaultFilters } from '@/panel/toolbox/variable_manager/filter';
import { createReusableTemplate, useToggle } from '@vueuse/core';
import { computed, ref } from 'vue';

defineProps<{
  canUndo?: boolean;
  canRedo?: boolean;
}>();

const [DefineIconButton, IconButton] = createReusableTemplate<{
  title: string;
  icon: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}>();

const search_input = defineModel<string | RegExp>('search_input', { required: true });
const emit = defineEmits<{
  (e: 'collapse-all'): void;
  (e: 'expand-all'): void;
  (e: 'undo'): void;
  (e: 'redo'): void;
}>();

type ViewMode = 'tree' | 'card' | 'text';
const viewOptions: { label: string; value: ViewMode }[] = [
  { label: '树状', value: 'tree' },
  { label: '卡片', value: 'card' },
  { label: '文本', value: 'text' },
];

const filterDefinitions: { type: FilterType; name: string }[] = [
  { type: 'string', name: t`String` },
  { type: 'number', name: t`Number` },
  { type: 'array', name: t`Array` },
  { type: 'boolean', name: t`Boolean` },
  { type: 'object', name: t`Object` },
];

const filters = defineModel<FiltersState>('filters', {
  default: createDefaultFilters,
});

const currentView = defineModel<ViewMode>('currentView', { default: 'tree' });
const [isSearchVisible, toggleSearchVisible] = useToggle(false);
const [isFilterVisible, toggleFilterVisible] = useToggle(false);
const teleportTarget = ref<HTMLElement | null>(null);
const isFilterActive = computed(() => Object.values(filters.value).some(value => !value));

const setView = (mode: ViewMode) => {
  currentView.value = mode;
};

const showSearch = () => {
  const nextValue = toggleSearchVisible();
  console.log('showSearch', nextValue);
};

const showFilter = () => {
  const nextValue = toggleFilterVisible();
  console.log('showFilter', nextValue);
};

const collapseAll = () => {
  emit('collapse-all');
};

const expandAll = () => {
  emit('expand-all');
};

const onFilterChange = (filterType: FilterType, event: Event) => {
  const target = event.target as HTMLInputElement;
  filters.value = {
    ...filters.value,
    [filterType]: target.checked,
  };
};
</script>

<style scoped>
.vm-toolbar-teleport-enter-active,
.vm-toolbar-teleport-leave-active {
  transition: all 200ms ease;
}

.vm-toolbar-search-enter-from,
.vm-toolbar-search-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
