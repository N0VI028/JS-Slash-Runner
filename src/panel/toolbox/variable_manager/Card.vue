<template>
  <div class="vm-card" :class="depthClass">
    <!-- 左侧层级指示�?-->
    <div class="vm-card__depth-indicator" :style="depthIndicatorStyle"></div>

    <div class="vm-card__content">
      <div class="vm-card__header" :class="{ 'vm-card__header--clickable': collapsible }">
        <div class="vm-card__title" @click="handleTitleClick">
          <div
            v-if="collapsible"
            class="vm-card__toggle text-xs"
            type="button"
            :title="isCollapsed ? t`展开` : t`折叠`"
            @click.stop="toggleCollapse"
          >
            <i
              class="fa-solid fa-angle-right"
              :style="{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }"
            ></i>
          </div>
          <span class="vm-card__name" :title="displayName">{{ displayName }}</span>
          <slot name="tag">
            <span v-if="typeLabel" class="vm-card__tag">{{ typeLabel }}</span>
          </slot>
        </div>
        <div class="vm-card__actions">
          <Tippy ref="menuRef" trigger="click" :interactive="true" :z-index="99999" :append-to="appendToElement">
            <div class="vm-card__action" :title="t`菜单`">
              <i class="fa-regular fa-ellipsis"></i>
            </div>
            <template #content>
              <div
                class="flex flex-col items-start justify-center gap-0.5 rounded-sm bg-(--grey30) px-1 py-0.5 text-sm"
              >
                <div class="flex cursor-pointer items-center gap-0.5 text-(--warning)" @click="handleDeleteClick">
                  <i class="fa-regular fa-trash-can"></i>
                  <span>{{ t`删除` }}</span>
                </div>
              </div>
            </template>
          </Tippy>
        </div>
      </div>
      <transition name="vm-card-collapse">
        <div v-show="!isCollapsed" class="vm-card__body">
          <slot />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from 'vue';
import { Tippy, TippyComponent } from 'vue-tippy';

import { whenever } from '@vueuse/core';
import { treeControlKey } from '@/panel/toolbox/variable_manager/treeControl';

const nameModel = defineModel<number | string | undefined>('name');

const props = withDefaults(
  defineProps<{
    depth?: number;
    typeLabel?: string;
    icon?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    defaultCollapsed?: boolean;
  }>(),
  {
    depth: 0,
    collapsible: true,
    defaultCollapsed: false,
  },
);

const emit = defineEmits<{
  (e: 'open-menu'): void;
  (e: 'toggle-collapse', value: boolean): void;
  (e: 'update:collapsed', value: boolean): void;
  (e: 'delete'): void;
}>();

const displayName = computed(() => {
  const value = nameModel.value;
  if (value === undefined || value === null || `${value}`.trim() === '') {
    return '未命名变量';
  }
  return `${value}`;
});

const isCollapsed = ref(props.collapsed ?? props.defaultCollapsed ?? false);

watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

watch(
  () => isCollapsed.value,
  value => {
    emit('update:collapsed', value);
  },
);

const toggleCollapse = () => {
  if (!props.collapsible) return;
  const nextValue = !isCollapsed.value;
  isCollapsed.value = nextValue;
  emit('toggle-collapse', nextValue);
};

const handleTitleClick = () => {
  if (!props.collapsible) return;
  toggleCollapse();
};

const menuRef = ref<TippyComponent | null>(null);

const handleDeleteClick = () => {
  emit('delete');
  menuRef.value?.hide?.();
};

const treeControl = inject(treeControlKey, null);

if (treeControl) {
  onMounted(() => {
    if (!props.collapsible) return;
    if (treeControl.lastAction.value === 'expand') {
      isCollapsed.value = false;
    } else if (treeControl.lastAction.value === 'collapse') {
      isCollapsed.value = true;
    }
  });

  whenever(
    () => treeControl.collapseAllSignal.value,
    () => {
      if (!props.collapsible) return;
      isCollapsed.value = true;
    },
  );

  whenever(
    () => treeControl.expandAllSignal.value,
    () => {
      if (!props.collapsible) return;
      isCollapsed.value = false;
    },
  );
}

// 层级视觉样式计算
const depthColors = [
  '#3b82f6', // 蓝色 - level 0
  '#8b5cf6', // 紫色 - level 1
  '#ec4899', // 粉色 - level 2
  '#f59e0b', // 橙色 - level 3
  '#10b981', // 绿色 - level 4
  '#06b6d4', // 青色 - level 5
];

const getDepthColor = (depth: number): string => {
  return depthColors[depth % depthColors.length];
};

const depthClass = computed(() => {
  return `vm-card--depth-${Math.min(props.depth ?? 0, 5)}`;
});

const depthIndicatorStyle = computed(() => {
  const depth = props.depth ?? 0;
  const color = getDepthColor(depth);
  const width = 2;
  return {
    width: `${width}px`,
    backgroundColor: color,
    opacity: 0.7 + depth * 0.05,
  };
});

const appendToElement = computed(() => document.body);
</script>

<style scoped>
.vm-card {
  position: relative;
  display: flex;
  margin-bottom: 6px;
  border: 1px solid color-mix(in srgb, var(--SmartThemeQuoteColor) 25%, transparent);
  border-radius: 4px;
  font-size: 0.875rem;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    background-color 0.2s ease;
  width: 100%;
}

.vm-card:hover {
  border-color: var(--SmartThemeQuoteColor);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--SmartThemeQuoteColor) 45%, transparent);
}

/* 左侧层级指示�?*/
.vm-card__depth-indicator {
  flex-shrink: 0;
  transition: all 0.2s ease;
}

/* 卡片主内容区 */
.vm-card__content {
  flex: 1;
  min-width: 0;
  padding: 10px;
}

.vm-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  user-select: none;
}

.vm-card__header--clickable {
  cursor: pointer;
}

.vm-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.vm-card__icon {
  flex-shrink: 0;
}

.vm-card__name {
  font-weight: 600;
  color: var(--SmartThemeQuoteColor);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.vm-card__tag,
::v-deep(.vm-card__tag) {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 15%, transparent);
  padding: 1px 6px;
  font-size: 0.75rem;
  color: var(--SmartThemeQuoteColor);
}

.tippy-box[data-theme~='vm-card-menu'] {
  background-color: color-mix(in srgb, var(--SmartThemeBackgroundColor, #111827) 92%, #000 8%);
  color: inherit;
  border-radius: 8px;
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
  padding: 0;
}

.tippy-box[data-theme~='vm-card-menu'] .tippy-content {
  padding: 6px;
}

.vm-card__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.vm-card__action,
.vm-card__toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: none;
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
  border-radius: 4px;
}

.vm-card__action:hover,
.vm-card__toggle:hover {
  color: var(--SmartThemeQuoteColor);
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 15%, transparent);
}

.vm-card__toggle {
  flex-shrink: 0;
}

.vm-card__body {
  margin-top: 6px;
  color: var(--SmartThemeBodyColor);
}

.vm-card-collapse-enter-active,
.vm-card-collapse-leave-active {
  transition: all 0.15s ease;
}

.vm-card-collapse-enter-from,
.vm-card-collapse-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>


