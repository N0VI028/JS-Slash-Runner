<template>
  <!-- prettier-ignore -->
  <div
    class="
      relative flex w-full rounded border border-solid
      border-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_25%,transparent)] transition-all duration-200 ease-in-out
      hover:border-[var(--SmartThemeQuoteColor)]
      hover:bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_5%,transparent)]
      hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--SmartThemeQuoteColor)_45%,transparent)]
    "
    :class="depthClass"
  >
    <div class="shrink-0 transition-all duration-200 ease-in-out" :style="depthIndicatorStyle"></div>

    <div class="min-w-0 flex-1 p-0.5">
      <div class="flex items-center justify-between gap-2 select-none" :class="{ 'cursor-pointer': collapsible }">
        <div class="flex min-w-0 items-center gap-0.5" @click="handleTitleClick">
          <div
            v-if="collapsible"
            class="
              inline-flex shrink-0 cursor-pointer items-center justify-center rounded border-none bg-none th-text-xs
              text-[var(--SmartThemeBodyColor)] transition-all duration-200 ease-in-out
            "
            type="button"
            :title="isCollapsed ? t`展开` : t`折叠`"
            @click.stop="toggleCollapse"
          >
            <i
              class="fa-solid fa-angle-right"
              :style="{ transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }"
            ></i>
          </div>
          <template v-if="!isEditingName">
            <span
              ref="nameDisplayRef"
              :class="nameDisplayClass"
              :title="displayNameFixed"
              @click.stop="handleNameClick"
              @dblclick.stop.prevent="handleNameDoubleClick"
              @touchend="handleNameTouchEnd"
            >
              <Highlighter :query="props.searchInput">{{ displayNameFixed }}</Highlighter>
            </span>
          </template>
          <template v-else>
            <!-- prettier-ignore -->
            <input
              ref="nameInputRef"
              v-model="nameDraft"
              :style="nameInputInlineStyle"
              class="
                inline-flex min-w-0 rounded border border-(--SmartThemeQuoteColor)/40 bg-transparent px-0.25 th-text-sm
                text-[var(--SmartThemeQuoteColor)]
                focus:border-(--SmartThemeQuoteColor) focus:outline-none
              "
              @keydown="handleNameInputKeydown"
            />
          </template>
          <slot name="tag">
            <span
              v-if="typeLabel"
              class="
                inline-flex items-center rounded-full
                bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_15%,transparent)] px-0.25
                text-[length:8px]
                text-[var(--SmartThemeQuoteColor)]
              "
              >{{ typeLabel }}</span
            >
          </slot>
        </div>
        <div class="flex items-center gap-1">
          <Tippy ref="menuRef" trigger="click" :offset="[0, 4]" :interactive="true" :z-index="99999" :append-to="appendToElement">
            <div
              class="
                inline-flex cursor-pointer items-center justify-center border-none bg-none
                text-[var(--SmartThemeBodyColor)]
              "
              :title="t`菜单`"
            >
              <i class="fa-regular fa-ellipsis"></i>
            </div>
            <template #content>
              <div
                class="flex flex-col items-start justify-center gap-0.5 rounded-sm bg-(--grey30) px-1 py-0.5 th-text-sm"
              >
                <div
                  v-if="allowAddChild"
                  class="flex cursor-pointer items-center gap-0.5 text-white"
                  @click="handleAddChildClick"
                >
                  <i class="fa-solid fa-plus"></i>
                  <span>{{ t`新增变量` }}</span>
                </div>
                <div class="flex cursor-pointer items-center gap-0.5 text-(--warning)" @click="handleDeleteClick">
                  <i class="fa-regular fa-trash-can"></i>
                  <span>{{ t`删除` }}</span>
                </div>
              </div>
            </template>
          </Tippy>
        </div>
      </div>
      <transition
        name="vm-card-collapse"
        @enter="onEnter"
        @after-enter="onAfterEnter"
        @leave="onLeave"
        @after-leave="onAfterLeave"
      >
        <div
          v-show="!isCollapsed"
          class="overflow-visible text-[var(--SmartThemeBodyColor)]"
        >
          <slot />
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Tippy, TippyComponent } from 'vue-tippy';

import { treeControlKey } from '@/panel/toolbox/variable_manager/types';
import { onClickOutside, whenever } from '@vueuse/core';

const nameModel = defineModel<number | string | undefined>('name');

const props = withDefaults(
  defineProps<{
    depth?: number;
    typeLabel?: string;
    icon?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    defaultCollapsed?: boolean;
    searchInput: RegExp | null;
    /** 是否允许通过菜单新增子变量 */
    allowAddChild?: boolean;
  }>(),
  {
    depth: 0,
    typeLabel: undefined,
    icon: undefined,
    collapsible: true,
    defaultCollapsed: false,
    allowAddChild: false,
  },
);

const emit = defineEmits<{
  (e: 'open-menu'): void;
  (e: 'toggle-collapse', value: boolean): void;
  (e: 'update:collapsed', value: boolean): void;
  (e: 'delete'): void;
  (e: 'add-child'): void;
}>();

/**
 * 计算显示名称（修复编码异常场景下的显示问题）
 */
const displayNameFixed = computed(() => {
  const value = nameModel.value;
  if (value === undefined || value === null || `${value}`.trim() === '') {
    return '未命名变量';
  }
  return `${value}`;
});

const isCollapsed = ref(props.collapsed ?? props.defaultCollapsed ?? false);

/**
 * 监听外部传入的collapsed属性变化
 * 当父组件主动控制折叠状态时，同步更新内部状态
 */
watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

/**
 * 监听内部折叠状态变化
 * 向父组件发出update:collapsed事件，保持双向绑定
 */
watch(
  () => isCollapsed.value,
  value => {
    emit('update:collapsed', value);
  },
);

/**
 * 切换卡片的折叠/展开状态
 * 只有在collapsible为true时才会执行切换
 * 更新内部状态并发出toggle-collapse事件
 */
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

const handleAddChildClick = () => {
  if (!props.allowAddChild) return;
  emit('add-child');
  menuRef.value?.hide?.();
};

const handleDeleteClick = () => {
  emit('delete');
  menuRef.value?.hide?.();
};

const nameDisplayRef = ref<HTMLElement | null>(null);
const nameInputRef = ref<HTMLInputElement | null>(null);
const isEditingName = ref(false);
const nameDraft = ref('');
const nameInputSize = ref<{ width: string; height: string } | null>(null);
let stopNameOutside: (() => void) | null = null;

const MIN_INPUT_WIDTH = 40;
const MIN_INPUT_HEIGHT = 24;
const SINGLE_CLICK_DELAY = 250;
const DOUBLE_TAP_THRESHOLD = 300;

const computeInputSize = (el: HTMLElement | null) => {
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const width = Math.max(rect.width || el.offsetWidth || MIN_INPUT_WIDTH, MIN_INPUT_WIDTH);
  const height = Math.max(rect.height || el.offsetHeight || MIN_INPUT_HEIGHT, MIN_INPUT_HEIGHT);
  return {
    width: `${width}px`,
    height: `${height}px`,
  };
};

const canEditName = computed(() => typeof nameModel.value === 'string');

const nameInputInlineStyle = computed(() => {
  if (!nameInputSize.value) return undefined;
  return {
    width: nameInputSize.value.width,
    height: nameInputSize.value.height,
  };
});

const nameDisplayClass = computed(() => {
  const classes = ['overflow-hidden font-semibold text-ellipsis whitespace-nowrap text-[var(--SmartThemeQuoteColor)]'];
  if (canEditName.value) {
    classes.push('cursor-text select-text');
  } else if (props.collapsible) {
    classes.push('cursor-pointer select-none');
  } else {
    classes.push('select-none');
  }
  return classes;
});

let nameClickTimer: number | null = null;
let lastNameTapTime = 0;

const clearNameClickTimer = () => {
  if (nameClickTimer !== null) {
    clearTimeout(nameClickTimer);
    nameClickTimer = null;
  }
};

const startNameEditing = () => {
  if (!canEditName.value) return;
  clearNameClickTimer();
  nameDraft.value = typeof nameModel.value === 'string' ? nameModel.value : '';
  nameInputSize.value = computeInputSize(nameDisplayRef.value);
  isEditingName.value = true;
  nextTick(() => {
    if (nameInputRef.value) {
      nameInputRef.value.focus();
      nameInputRef.value.select();
    }
  });
  if (stopNameOutside) {
    stopNameOutside();
  }
  stopNameOutside = onClickOutside(nameInputRef, () => {
    saveNameEditing();
  });
};

const finishNameEditing = () => {
  isEditingName.value = false;
  if (stopNameOutside) {
    stopNameOutside();
    stopNameOutside = null;
  }
  nameInputSize.value = null;
};

const saveNameEditing = () => {
  if (!isEditingName.value) return;
  if (!canEditName.value) {
    finishNameEditing();
    return;
  }
  const previous = typeof nameModel.value === 'string' ? nameModel.value : '';
  const nextName = nameDraft.value.trim();
  if (!nextName.length) {
    toastr.error(t`键名不能为空`, t`编辑失败`);
    return;
  }
  finishNameEditing();
  if (nextName === previous) return;
  nameModel.value = nextName;
  toastr.success(t`已更新键名`, t`编辑成功`);
};

const cancelNameEditing = () => {
  if (!isEditingName.value) return;
  nameDraft.value = typeof nameModel.value === 'string' ? nameModel.value : '';
  finishNameEditing();
};

const handleNameInputKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveNameEditing();
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelNameEditing();
  }
};

const handleNameClick = (event: MouseEvent) => {
  if (isEditingName.value || !props.collapsible) return;
  if (event.detail > 1) {
    clearNameClickTimer();
    return;
  }
  clearNameClickTimer();
  nameClickTimer = window.setTimeout(() => {
    nameClickTimer = null;
    handleTitleClick();
  }, SINGLE_CLICK_DELAY);
};

const handleNameDoubleClick = () => {
  clearNameClickTimer();
  if (isEditingName.value || !canEditName.value) return;
  startNameEditing();
};

const handleNameTouchEnd = (event: TouchEvent) => {
  if (isEditingName.value) return;
  const now = event.timeStamp;
  if (now - lastNameTapTime <= DOUBLE_TAP_THRESHOLD) {
    event.preventDefault();
    event.stopPropagation();
    clearNameClickTimer();
    if (canEditName.value) {
      startNameEditing();
    }
  } else if (props.collapsible) {
    clearNameClickTimer();
    nameClickTimer = window.setTimeout(() => {
      nameClickTimer = null;
      handleTitleClick();
    }, SINGLE_CLICK_DELAY);
  }
  lastNameTapTime = now;
};

watch(
  () => nameModel.value,
  newValue => {
    if (!isEditingName.value) return;
    nameDraft.value = typeof newValue === 'string' ? newValue : '';
  },
);

/**
 * 注入树形结构全局控制对象
 * 用于响应全局的展开/折叠全部操作
 */
const treeControl = inject(treeControlKey, null);

if (treeControl) {
  /**
   * 组件挂载时根据全局最后操作状态初始化折叠状态
   * 如果最后操作为展开，则展开卡片；如果为折叠，则折叠卡片
   */
  onMounted(() => {
    if (!props.collapsible) return;
    if (treeControl.lastAction.value === 'expand') {
      isCollapsed.value = false;
    } else if (treeControl.lastAction.value === 'collapse') {
      isCollapsed.value = true;
    }
  });

  /**
   * 监听全局折叠全部信号
   * 当接收到折叠全部信号时，将卡片折叠
   */
  whenever(
    () => treeControl.collapseAllSignal.value,
    () => {
      if (!props.collapsible) return;
      isCollapsed.value = true;
    },
  );

  /**
   * 监听全局展开全部信号
   * 当接收到展开全部信号时，将卡片展开
   */
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
  getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeQuoteColor'), // 主题色 - level 0
  '#8b5cf6', // 紫色 - level 1
  '#ec4899', // 粉色 - level 2
  '#f59e0b', // 橙色 - level 3
  '#10b981', // 绿色 - level 4
  '#06b6d4', // 青色 - level 5
];

const getDepthColor = (depth: number): string => {
  return depthColors[depth % depthColors.length];
};

/**
 * 计算层级样式类名
 * 根据depth属性生成对应的CSS类名，用于控制视觉层级
 * 最大层级限制为5级
 * TODO：考虑层级大于5级的情况
 */
const depthClass = computed(() => {
  return `vm-card--depth-${Math.min(props.depth ?? 0, 5)}`;
});

/**
 * 计算层级指示器的内联样式
 * 生成左侧彩色条带的样式，包括宽度、背景色和透明度
 * 透明度会随着层级深度逐渐增加，增强视觉层次感
 */
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

const isSearching = computed(() => props.searchInput !== null);

/**
 * 展开动画：进入时
 * 设置初始高度为0
 */
const onEnter = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = '0';
  element.style.overflow = 'hidden';
  element.style.transition = 'height 0.2s ease-in-out';
  // 强制浏览器重排
  requestAnimationFrame(() => {
    element.style.height = `${element.scrollHeight}px`;
  });
};

/**
 * 展开动画：进入后
 * 清理内联样式，让内容自然显示
 */
const onAfterEnter = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = '';
  element.style.overflow = '';
  element.style.transition = '';
};

/**
 * 折叠动画：离开时
 * 从当前高度过渡到0
 */
const onLeave = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = `${element.scrollHeight}px`;
  element.style.overflow = 'hidden';
  element.style.transition = 'height 0.2s ease-in-out';
  // 强制浏览器重排
  requestAnimationFrame(() => {
    element.style.height = '0';
  });
};

/**
 * 折叠动画：离开后
 * 清理样式
 */
const onAfterLeave = (el: Element) => {
  const element = el as HTMLElement;
  element.style.height = '';
  element.style.overflow = '';
  element.style.transition = '';
};

onBeforeUnmount(() => {
  clearNameClickTimer();
  if (stopNameOutside) {
    stopNameOutside();
    stopNameOutside = null;
  }
});
</script>
