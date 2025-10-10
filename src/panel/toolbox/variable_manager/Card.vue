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
    <div class="flex-shrink-0 transition-all duration-200 ease-in-out" :style="depthIndicatorStyle"></div>

    <div class="min-w-0 flex-1 p-0.5">
      <div class="flex items-center justify-between gap-2 select-none" :class="{ 'cursor-pointer': collapsible }">
        <div class="flex min-w-0 items-center gap-0.5" @click="handleTitleClick">
          <div
            v-if="collapsible"
            class="
              inline-flex flex-shrink-0 cursor-pointer items-center justify-center rounded border-none bg-none text-xs
              text-[var(--SmartThemeBodyColor)] transition-all duration-200 ease-in-out
              hover:bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_15%,transparent)]
              hover:text-[var(--SmartThemeQuoteColor)]
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
          <span
            class="overflow-hidden font-semibold text-ellipsis whitespace-nowrap text-[var(--SmartThemeQuoteColor)]"
            :title="displayNameFixed"
          >
            <template v-if="isSearching">
              <SearchHighlighter :query="props.searchInput" :text-to-highlight="displayNameFixed" />
            </template>
            <template v-else>
              {{ displayNameFixed }}
            </template>
          </span>
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
                inline-flex cursor-pointer items-center justify-center rounded border-none bg-none
                text-[var(--SmartThemeBodyColor)] transition-all duration-200 ease-in-out
                hover:bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_15%,transparent)]
                hover:text-[var(--SmartThemeQuoteColor)]
              "
              :title="t`菜单`"
            >
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
import { computed, inject, onMounted, ref, watch } from 'vue';
import { Tippy, TippyComponent } from 'vue-tippy';
import SearchHighlighter from '@/panel/component/SearchHighlighter.vue';

import { treeControlKey } from '@/panel/toolbox/variable_manager/types';
import { whenever } from '@vueuse/core';

const nameModel = defineModel<number | string | undefined>('name');

const props = withDefaults(
  defineProps<{
    depth?: number;
    typeLabel?: string;
    icon?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    defaultCollapsed?: boolean;
    /** 搜索输入，空字符串或未定义表示未搜索 */
    searchInput?: string | RegExp;
  }>(),
  {
    depth: 0,
    typeLabel: undefined,
    icon: undefined,
    collapsible: true,
    defaultCollapsed: false,
    searchInput: '',
  },
);

const emit = defineEmits<{
  (e: 'open-menu'): void;
  (e: 'toggle-collapse', value: boolean): void;
  (e: 'update:collapsed', value: boolean): void;
  (e: 'delete'): void;
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

const handleDeleteClick = () => {
  emit('delete');
  menuRef.value?.hide?.();
};

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

const isSearching = computed(
  () => props.searchInput !== '' && props.searchInput !== undefined && props.searchInput !== null,
);

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
</script>
