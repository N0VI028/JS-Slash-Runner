<template>
  <Teleport :to="teleport_target">
    <div ref="dialog_ref" :style="dialog_style" :class="dialog_classes">
      <div
        class="TH-custom-tailwind flex h-full flex-col overflow-hidden bg-(--SmartThemeBlurTintColor) shadow-lg"
        role="dialog"
        aria-modal="true"
        :class="is_mobile ? '' : 'rounded-sm'"
      >
        <!-- prettier-ignore-attribute -->
        <div
          ref="header_ref"
          class="flex shrink-0 items-center justify-between bg-(--SmartThemeQuoteColor) px-1 select-none"
        >
          <div
            class="flex-1 cursor-move font-bold"
            style="touch-action: none"
            :style="{ color: getSmartThemeQuoteTextColor() }"
          >
            {{ title }}
          </div>
          <div class="flex shrink-0 gap-1" :style="{ color: getSmartThemeQuoteTextColor() }">
            <!-- prettier-ignore-attribute -->
            <div
              v-if="showGuide"
              class="
                flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent th-text-base!
              "
              :class="{ 'th-question-blink': should_show_question_blink }"
              @click="openGuidePopup"
            >
              <i class="fa-solid fa-question"></i>
            </div>
            <!-- prettier-ignore-attribute -->
            <div
              class="
                relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent
                th-text-base!
              "
              :title="is_collapsed ? t`展开` : t`折叠`"
              @click="toggleCollapse"
            >
              <i :class="is_collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"></i>
            </div>
            <!-- prettier-ignore-attribute -->
            <div
              class="
                fa-solid fa-close relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none
                bg-transparent th-text-base!
              "
              :title="t`关闭`"
              @click="emit('close')"
            ></div>
          </div>
        </div>
        <div v-show="!is_collapsed" class="flex flex-1 flex-col overflow-hidden">
          <slot> </slot>
        </div>
      </div>

      <!-- 调整大小手柄 -->
      <div
        v-for="handle in enabled_handles"
        :key="handle.name"
        :class="['absolute opacity-0', handle.cursor, handle.class]"
        :style="[handle.style, { touchAction: 'none' }]"
        @pointerdown="startResize(handle.name, $event)"
      ></div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { getSmartThemeQuoteTextColor } from '@/util/color';
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import {
  useDraggable,
  useEventListener,
  useLocalStorage,
  useResizeObserver,
  useThrottleFn,
  useWindowSize,
} from '@vueuse/core';
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watchEffect } from 'vue';
import { useGlobalSettingsStore } from '@/store/settings';

interface ResizeHandle {
  name: string;
  cursor: string;
  class: string;
  style: Record<string, string>;
}

/**
 * 对话框组件属性定义
 */
const props = withDefaults(
  defineProps<{
    // 桌面端宽度，单位可以是px、vw等
    width?: string | number;
    // 桌面端高度，单位可以是px、vh等
    height?: string | number;
    // 移动端高度，单位可以是px、vh等
    mobileHeight?: string | number;
    // 标题文本，由外部传入
    title?: string;
    // 是否显示使用指南
    showGuide?: boolean;
    // 是否可拖拽
    draggable?: boolean;
    // 是否可调整大小
    resizable?: boolean;
    // 最小宽度
    minWidth?: string | number;
    // 最小高度
    minHeight?: string | number;
    // 最大宽度
    maxWidth?: string | number;
    // 最大高度
    maxHeight?: string | number;
    // 启用边缘吸附（仅PC端）
    edgeSnap?: boolean;
    // 边缘吸附触发距离
    snapDistance?: number;
    // 调整大小手柄
    handles?: Array<'tl' | 'tm' | 'tr' | 'mr' | 'br' | 'bm' | 'bl' | 'ml'>;
    // 初始X位置（left）
    initialX?: number | string | (() => number);
    // 初始Y位置（top）
    initialY?: number | (() => number);
    // 本地存储ID
    storageId?: string;
  }>(),
  {
    width: '60dvw',
    height: '70dvh',
    mobileHeight: '90%',
    title: '未命名浮窗',
    showGuide: false,
    draggable: true,
    resizable: true,
    minWidth: 300,
    minHeight: 200,
    maxWidth: '90dvw',
    maxHeight: '90dvh',
    edgeSnap: true,
    snapDistance: 100,
    handles: () => ['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'],
    initialX: '10%',
    initialY: () => Math.max(50, window.innerHeight * 0.15),
    storageId: undefined,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'dragging', payload: { left: number; top: number; width: number; height: number }): void;
  (e: 'dragstop', payload: { left: number; top: number; width: number; height: number }): void;
  (e: 'resizing', payload: { left: number; top: number; width: number; height: number }): void;
  (e: 'resizestop', payload: { left: number; top: number; width: number; height: number }): void;
  (e: 'activated'): void;
  (e: 'deactivated'): void;
  (e: 'openGuidePopup'): void;
}>();

const global_settings_store = useGlobalSettingsStore();

const { width: window_width } = useWindowSize();

const dialog_ref = useTemplateRef<HTMLElement>('dialog_ref');
const header_ref = useTemplateRef<HTMLElement>('header_ref');
const teleport_target = computed(() => (is_mobile ? '#movingDivs' : 'body'));
const mobile_dialog_index = ref(0);

const header_height = ref(32);
function updateHeaderHeight() {
  header_height.value = header_ref.value?.offsetHeight ?? 32;
}
watchEffect(() => {
  updateHeaderHeight();
});
useEventListener(window, 'resize', () => {
  updateHeaderHeight();
});

const dialog_size = ref({
  width: 0,
  height: 0,
});

const is_resizing = ref(false);
const resize_direction = ref<string>('');
const initial_aspect_ratio = ref(1);

const was_snapped = ref(false);
const pre_snap_rect = ref<{ left: number; top: number; width: number; height: number } | null>(null);

let dragStartPointerX = 0;
let dragStartPointerY = 0;
let dragStartLeft = 0;
let dragStartTop = 0;
let dragHasRestoredFromSnap = false;
let dragLastMouseX = 0;
let dragLastMouseY = 0;

const is_collapsed = ref(false);

/**
 * 切换浮窗折叠/展开状态
 * @description 切换浮窗的折叠状态，折叠时只显示标题栏，展开时显示完整内容
 * 切换后会自动检查并调整边界位置
 */
function toggleCollapse() {
  is_resizing.value = false;
  resize_direction.value = '';
  is_collapsed.value = !is_collapsed.value;

  // 折叠状态变化后检查边界
  setTimeout(() => {
    checkAndAdjustBounds();
  }, 10);
}

/**
 * 计算是否应该显示问号闪烁效果
 * @description 根据全局设置判断用户是否已经查看过提示词模板的指导弹窗，如果没有则显示闪烁效果
 */
const should_show_question_blink = computed(() => {
  return !global_settings_store.settings.$impl.已经提醒过查看提示词模板问号;
});

/**
 * 打开使用指南弹窗
 * @description 触发使用指南弹窗的显示，通过emit向父组件发送事件，同时标记用户已经查看过，停止闪烁效果
 */
function openGuidePopup() {
  // 标记用户已经点击过问号，停止闪烁
  if (!global_settings_store.settings.$impl.已经提醒过查看提示词模板问号) {
    global_settings_store.settings.$impl.已经提醒过查看提示词模板问号 = true;
  }
  emit('openGuidePopup');
}

/**
 * 统一的单位转换函数 - 将任何单位转换为像素值
 * @param {string | number} value - 需要转换的值，支持px、vw、vh、%、rem等单位
 * @param {'width' | 'height'} dimension - 维度类型，用于百分比计算的参考维度
 * @returns {number} 转换后的像素值
 * @description 支持多种CSS单位转换为像素值，包括视口单位、百分比、rem等
 */
const convertToPixels = (value: string | number, dimension: 'width' | 'height' = 'width'): number => {
  if (typeof value === 'number') return value;
  if (value.endsWith('vw')) {
    return (parseFloat(value) * window_width.value) / 100;
  }
  if (value.endsWith('vh')) {
    return (parseFloat(value) * window.innerHeight) / 100;
  }
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  if (value.endsWith('%')) {
    const reference = dimension === 'width' ? window_width.value : window.innerHeight;
    return (parseFloat(value) * reference) / 100;
  }
  if (value.endsWith('rem')) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(value) * rootFontSize;
  }
  return parseFloat(value) || 400;
};

const is_mobile = isMobile();
const mobile_top_offset = computed(() => mobile_dialog_index.value * header_height.value);
const MOBILE_STACK_KEY = '__TH_MOBILE_DIALOG_STACK__' as const;
const MOBILE_STACK_EVENT = 'th-mobile-dialog-stack-change' as const;
const mobile_dialog_id = Symbol('THDialogInstance');

type MobileStackWindow = Window & { [key in typeof MOBILE_STACK_KEY]?: symbol[] };

function ensureMobileStack(): symbol[] {
  const win = window as MobileStackWindow;
  if (!win[MOBILE_STACK_KEY]) {
    win[MOBILE_STACK_KEY] = [];
  }
  return win[MOBILE_STACK_KEY]!;
}

function updateMobileStackIndex() {
  if (!is_mobile || typeof window === 'undefined') {
    return;
  }
  const stack = ensureMobileStack();
  const idx = stack.indexOf(mobile_dialog_id);
  mobile_dialog_index.value = idx >= 0 ? idx : 0;
}

function broadcastMobileStackChange() {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new CustomEvent(MOBILE_STACK_EVENT));
}

if (typeof window !== 'undefined') {
  useEventListener(window, MOBILE_STACK_EVENT, () => {
    if (!is_mobile) return;
    updateMobileStackIndex();
  });
}

/**
 * 初始化浮窗大小
 * @description 根据props中的宽度和高度设置初始化浮窗大小，区分移动端和桌面端
 * 同时计算并保存初始宽高比
 */
const initizeSize = () => {
  const target_width = is_mobile ? '100%' : props.width;
  const target_height = is_mobile ? (props.mobileHeight ?? '80%') : props.height;

  dialog_size.value.width = convertToPixels(target_width, 'width');
  dialog_size.value.height = convertToPixels(target_height, 'height');

  initial_aspect_ratio.value = dialog_size.value.width / dialog_size.value.height;
};

initizeSize();

const throttledEmitDragging = useThrottleFn((payload: { left: number; top: number; width: number; height: number }) => {
  emit('dragging', payload);
}, 16);
const throttledEmitResizing = useThrottleFn((payload: { left: number; top: number; width: number; height: number }) => {
  emit('resizing', payload);
}, 16);
const throttledAdjustBounds = useThrottleFn(() => {
  checkAndAdjustBounds();
}, 100);

/**
 * 获取浮窗初始位置
 * @returns {object} 返回包含x和y坐标的位置对象
 * @description 根据props中的初始位置设置计算浮窗的初始位置，支持函数、字符串和数值格式
 */
const getinitPosition = () => {
  const getInitValue = (value: number | string | (() => number), dimension: 'width' | 'height'): number => {
    if (typeof value === 'function') {
      return value();
    }
    if (typeof value === 'string') {
      return convertToPixels(value, dimension);
    }
    return value;
  };

  return {
    x: getInitValue(props.initialX, 'width') || Math.max(0, window_width.value * 0.1),
    y: getInitValue(props.initialY, 'height') || Math.max(20, window.innerHeight * 0.15),
  };
};

const initial_position = getinitPosition();
const x = ref(initial_position.x);
const y = ref(initial_position.y);

const is_dragging = ref(false);

/**
 * 获取本地存储键名
 * @returns {string | null} 返回存储键名，如果未提供storageId则返回null
 * @description 根据storageId生成唯一的本地存储键名，用于持久化浮窗状态
 */
function getStorageKey(): string | null {
  if (!props.storageId) {
    return null;
  }
  return `TH-Dialog-${props.storageId}`;
}

const __storage_key = getStorageKey();

if (!props.storageId) {
  console.warn('[TH-Dialog] storageId 未提供，状态将不会持久化到本地存储。');
}

interface PositionStorage {
  left?: number;
  top?: number;
  mobileLeft?: number;
  mobileTop?: number;
}

interface SizeStorage {
  width?: number;
  height?: number;
  mobileHeight?: number;
}

const position_storage = props.storageId
  ? useLocalStorage<PositionStorage>(`TH-Dialog-${props.storageId}:pos`, {}, { mergeDefaults: true })
  : ref<PositionStorage>({});

const size_storage = props.storageId
  ? useLocalStorage<SizeStorage>(`TH-Dialog-${props.storageId}:size`, {}, { mergeDefaults: true })
  : ref<SizeStorage>({});

/**
 * 从持久化数据中提取数值
 * @param {Record<string, any>} obj - 包含持久化数据的对象
 * @param {readonly [string, string]} primary - 主要键名数组
 * @param {readonly [string, string]} fallback - 备用键名数组
 * @returns {{a?: number, b?: number} | null} 返回提取的数值对象或null
 * @description 从持久化存储中提取数值，优先使用主要键名，如果不存在则使用备用键名
 */
function pickPersistedValue(
  obj: Record<string, any>,
  primary: readonly [string, string],
  fallback: readonly [string, string],
): { a?: number; b?: number } | null {
  const [aKey, bKey] = primary;
  const [faKey, fbKey] = fallback;
  if (typeof obj[aKey] === 'number' && typeof obj[bKey] === 'number') {
    return { a: obj[aKey], b: obj[bKey] };
  }
  if (typeof obj[faKey] === 'number' && typeof obj[fbKey] === 'number') {
    return { a: obj[faKey], b: obj[fbKey] };
  }
  return null;
}

/**
 * 保存浮窗位置到本地存储
 * @param {number} left - 左边距
 * @param {number} top - 上边距
 * @description 将浮窗的当前位置保存到本地存储中，仅在非移动端且有storageId时生效
 */
function savePosition(left: number, top: number) {
  if (!__storage_key || is_mobile) return;
  try {
    position_storage.value.left = left;
    position_storage.value.top = top;
  } catch (err) {
    console.warn('[TH-Dialog] 保存位置失败:', err);
  }
}

/**
 * 保存浮窗大小到本地存储
 * @param {number} width - 宽度
 * @param {number} height - 高度
 * @description 将浮窗的当前大小保存到本地存储中，移动端和桌面端分别存储不同的字段
 */
function saveSize(width: number, height: number) {
  if (!__storage_key) return;
  try {
    if (is_mobile) {
      size_storage.value.mobileHeight = height;
    } else {
      size_storage.value.width = width;
      size_storage.value.height = height;
    }
  } catch (err) {
    console.warn('[TH-Dialog] 保存大小失败:', err);
  }
}

/**
 * 从本地存储加载浮窗位置
 * @returns {{left: number, top: number} | null} 返回加载的位置信息或null
 * @description 从本地存储中加载之前保存的浮窗位置，仅在非移动端且有storageId时生效
 */
function loadPosition(): { left: number; top: number } | null {
  if (!__storage_key || is_mobile) return null;
  try {
    const parsed = position_storage.value;
    const picked = pickPersistedValue(parsed, ['left', 'top'] as const, ['mobileLeft', 'mobileTop'] as const);
    if (picked && typeof picked.a === 'number' && typeof picked.b === 'number') {
      return { left: picked.a, top: picked.b };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载位置失败:', err);
  }
  return null;
}

/**
 * 从本地存储加载浮窗大小
 * @returns {{width: number, height: number} | null} 返回加载的大小信息或null
 * @description 从本地存储中加载之前保存的浮窗大小，移动端和桌面端分别处理不同的存储字段
 */
function loadSize(): { width: number; height: number } | null {
  if (!__storage_key) return null;
  try {
    const parsed = size_storage.value;
    if (is_mobile) {
      const heightValue =
        typeof parsed.mobileHeight === 'number'
          ? parsed.mobileHeight
          : typeof parsed.height === 'number'
            ? parsed.height
            : undefined;
      if (typeof heightValue === 'number') {
        return { width: dialog_size.value.width, height: heightValue };
      }
      return null;
    }
    const widthValue = typeof parsed.width === 'number' ? parsed.width : undefined;
    const heightValue = typeof parsed.height === 'number' ? parsed.height : undefined;
    if (widthValue !== undefined && heightValue !== undefined) {
      return { width: widthValue, height: heightValue };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载大小失败:', err);
  }
  return null;
}

/**
 * 检查并调整浮窗边界，确保不超出视口
 * @description 检查浮窗的位置和大小是否超出视口边界，如果超出则自动调整到合理范围内
 * 同时处理移动端和桌面端的不同边界限制逻辑
 */
function checkAndAdjustBounds() {
  const viewport_width = window.innerWidth;
  const viewport_height = window.innerHeight;

  let adjusted = false;

  const max_width = viewport_width * 0.95; // 留出5%的边距
  const max_height = viewport_height * 0.95;

  if (is_mobile) {
    const full_width = convertToPixels('100%', 'width');
    if (dialog_size.value.width !== full_width) {
      dialog_size.value.width = full_width;
      adjusted = true;
    }
  } else if (dialog_size.value.width > max_width) {
    dialog_size.value.width = max_width;
    adjusted = true;
  }

  // 移动端不对高度做强制限制，避免输入法弹出导致压缩高度
  if (!is_mobile && dialog_size.value.height > max_height) {
    dialog_size.value.height = max_height;
    adjusted = true;
  }

  const min_x = 0;
  const max_x = viewport_width - dialog_size.value.width;
  const min_y = 0;
  const dialog_current_height = is_collapsed.value ? header_height.value : dialog_size.value.height;
  const max_y = Math.max(0, viewport_height - dialog_current_height);

  if (!is_mobile) {
    if (x.value < min_x) {
      x.value = min_x;
      adjusted = true;
    } else if (x.value > max_x) {
      x.value = Math.max(min_x, max_x);
      adjusted = true;
    }

    if (y.value < min_y) {
      y.value = min_y;
      adjusted = true;
    } else if (y.value > max_y) {
      y.value = Math.max(min_y, max_y);
      adjusted = true;
    }
  }

  if (adjusted) {
    savePosition(x.value, y.value);
    saveSize(dialog_size.value.width, dialog_size.value.height);
  }
}

onMounted(() => {
  const shouldHandleMobileStack = is_mobile && typeof window !== 'undefined';
  if (shouldHandleMobileStack) {
    const stack = ensureMobileStack();
    if (!stack.includes(mobile_dialog_id)) {
      stack.push(mobile_dialog_id);
    }
    updateMobileStackIndex();
  }

  const pos = loadPosition();
  if (pos) {
    x.value = pos.left;
    y.value = pos.top;
  }

  const size = loadSize();
  if (size) {
    dialog_size.value.width = size.width;
    dialog_size.value.height = size.height;
  }
  checkAndAdjustBounds();

  if (shouldHandleMobileStack) {
    broadcastMobileStackChange();
  }
});

onBeforeUnmount(() => {
  if (!is_mobile || typeof window === 'undefined') {
    return;
  }
  const stack = ensureMobileStack();
  const index = stack.indexOf(mobile_dialog_id);
  if (index !== -1) {
    stack.splice(index, 1);
    broadcastMobileStackChange();
  }
});

/*
 * 监听视口大小变化
 */
useResizeObserver(document.body, () => {
  throttledAdjustBounds();
});

/**
 * 开始拖拽操作
 * @param {PointerEvent} event - 鼠标或触摸事件对象
 * @description 处理浮窗的拖拽开始逻辑，包括事件处理、边界检查、边缘吸附等功能
 * 支持拖拽过程中的实时位置更新和事件发射
 */
/**
 * 边缘吸附检测 - 基于鼠标位置判断是否应该吸附到屏幕边缘
 * @param {number} mouseX - 鼠标X坐标
 * @param {number} _mouseY - 鼠标Y坐标（未使用）
 * @param {number} left - 当前浮窗左边距
 * @param {number} top - 当前浮窗上边距
 * @param {number} width - 当前浮窗宽度
 * @param {number} height - 当前浮窗高度
 * @returns {object} 返回吸附后的位置和大小信息
 * @description 检测鼠标是否靠近屏幕边缘，如果是则返回吸附到边缘的位置和全屏大小
 */
const checkEdgeSnap = (mouseX: number, _mouseY: number, left: number, top: number, width: number, height: number) => {
  if (!props.edgeSnap || is_mobile) {
    return { left, top, width, height, snapped: false };
  }

  const screen_width = window.innerWidth;
  const screen_height = window.innerHeight;
  const snap_dist = props.snapDistance;

  // 基于鼠标位置判断是否靠近左边缘
  if (mouseX <= snap_dist) {
    return {
      left: 0,
      top: 0,
      width,
      height: screen_height,
      snapped: true,
    };
  }

  // 基于鼠标位置判断是否靠近右边缘
  if (mouseX >= screen_width - snap_dist) {
    return {
      left: screen_width - width,
      top: 0,
      width,
      height: screen_height,
      snapped: true,
    };
  }

  return { left, top, width, height, snapped: false };
};

useDraggable(dialog_ref, {
  handle: header_ref,
  preventDefault: true,
  stopPropagation: true,
  disabled: computed(() => !props.draggable || is_mobile),
  initialValue: computed(() => ({ x: x.value, y: y.value })),
  onStart: (_position, event) => {
    if (!props.draggable || is_mobile) {
      return;
    }
    is_dragging.value = true;
    dragStartPointerX = event.clientX;
    dragStartPointerY = event.clientY;
    dragStartLeft = x.value;
    dragStartTop = y.value;
    dragHasRestoredFromSnap = false;
    dragLastMouseX = event.clientX;
    dragLastMouseY = event.clientY;
  },
  onMove: (_position, event) => {
    if (!props.draggable || is_mobile) {
      return;
    }
    const newX = dragStartLeft + (event.clientX - dragStartPointerX);
    const newY = dragStartTop + (event.clientY - dragStartPointerY);

    if (was_snapped.value && !dragHasRestoredFromSnap && pre_snap_rect.value) {
      const snapDist = props.snapDistance;
      const mouseNearLeft = event.clientX <= snapDist;
      const mouseNearRight = event.clientX >= window.innerWidth - snapDist;
      if (!mouseNearLeft && !mouseNearRight) {
        const { width: prevWidth, height: prevHeight } = pre_snap_rect.value;
        dialog_size.value.width = prevWidth;
        dialog_size.value.height = prevHeight;
        dragHasRestoredFromSnap = true;
        was_snapped.value = false;
      }
    }

    const screenHeight = window.innerHeight;
    const dialogHeight = is_collapsed.value ? header_height.value : dialog_size.value.height;
    const clampedY = Math.max(0, Math.min(newY, screenHeight - dialogHeight));

    x.value = newX;
    y.value = clampedY;
    dragLastMouseX = event.clientX;
    dragLastMouseY = event.clientY;

    throttledEmitDragging({
      left: newX,
      top: clampedY,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });
  },
  onEnd: () => {
    if (!is_dragging.value) {
      return;
    }
    is_dragging.value = false;

    const snapResult = checkEdgeSnap(
      dragLastMouseX,
      dragLastMouseY,
      x.value,
      y.value,
      dialog_size.value.width,
      dialog_size.value.height,
    );

    if (snapResult.snapped) {
      pre_snap_rect.value = {
        left: x.value,
        top: y.value,
        width: dialog_size.value.width,
        height: dialog_size.value.height,
      };
      was_snapped.value = true;
    } else {
      was_snapped.value = false;
    }

    x.value = snapResult.left;
    y.value = snapResult.top;

    if (snapResult.snapped) {
      dialog_size.value.width = snapResult.width;
      dialog_size.value.height = snapResult.height;
    }

    emit('dragstop', {
      left: x.value,
      top: y.value,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });

    savePosition(x.value, y.value);
    dragHasRestoredFromSnap = false;
  },
});

/**
 * 调整大小手柄配置
 * @description 定义浮窗各个方向的调整大小手柄的样式和位置配置
 * 包括8个方向：左上、上、右上、右、右下、下、左下、左
 */
const handle_configs: Record<string, ResizeHandle> = {
  tl: {
    name: 'top-left',
    cursor: 'cursor-nw-resize',
    class: 'z-20 top-0 left-0 h-[7px] w-[7px]',
    style: { top: '0', left: '0' },
  },
  tm: {
    name: 'top',
    cursor: 'cursor-ns-resize',
    class: 'z-10 top-0 left-0 h-[7px]',
    style: { top: '0', left: '0', width: '100%' },
  },
  tr: {
    name: 'top-right',
    cursor: 'cursor-ne-resize',
    class: 'z-20 top-0 right-0 h-[7px] w-[7px]',
    style: { top: '0', right: '0' },
  },
  mr: {
    name: 'right',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 right-0 w-[7px]',
    style: { top: '0', right: '0', height: '100%' },
  },
  br: {
    name: 'bottom-right',
    cursor: 'cursor-nw-resize',
    class: 'z-20 bottom-0 right-0 h-[7px] w-[7px]',
    style: { bottom: '0', right: '0' },
  },
  bm: {
    name: 'bottom',
    cursor: 'cursor-ns-resize',
    class: 'z-10 bottom-0 left-0 h-[7px]',
    style: { bottom: '0', left: '0', width: '100%' },
  },
  bl: {
    name: 'bottom-left',
    cursor: 'cursor-ne-resize',
    class: 'z-20 bottom-0 left-0 h-[7px] w-[7px]',
    style: { bottom: '0', left: '0' },
  },
  ml: {
    name: 'left',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 left-0 w-[7px]',
    style: { top: '0', left: '0', height: '100%' },
  },
};

const enabled_handles = computed(() => {
  if (!props.resizable || is_collapsed.value) {
    return [] as ResizeHandle[];
  }

  const inset = 8;
  const handleKeys = is_mobile ? ['bm'] : props.handles;
  const cloned = handleKeys
    .map(handle => ({ ...handle_configs[handle], style: { ...handle_configs[handle].style } }))
    .filter(Boolean) as ResizeHandle[];

  const top_handle = cloned.find(h => h.name === 'top');
  if (top_handle) {
    top_handle.style.top = `0px`;
    top_handle.style.left = `${inset}px`;
    top_handle.style.right = `${inset}px`;
    delete (top_handle.style as any).width;
  }

  const right_handle = cloned.find(h => h.name === 'right');
  if (right_handle) {
    right_handle.style.top = `${inset}px`;
    right_handle.style.bottom = `${inset}px`;
    delete (right_handle.style as any).height;
  }

  const left_handle = cloned.find(h => h.name === 'left');
  if (left_handle) {
    left_handle.style.top = `${inset}px`;
    left_handle.style.bottom = `${inset}px`;
    delete (left_handle.style as any).height;
  }

  const bottom_handle = cloned.find(h => h.name === 'bottom');
  if (bottom_handle) {
    bottom_handle.style.left = `${inset}px`;
    bottom_handle.style.right = `${inset}px`;
    delete (bottom_handle.style as any).width;
  }

  return cloned;
});

/**
 * 移动端专用调整大小逻辑
 * @description 仅允许通过底部手柄调节高度，始终保持全宽
 */
const startMobileResize = (direction: string, event: PointerEvent) => {
  if (direction !== 'bottom') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  is_resizing.value = true;
  resize_direction.value = direction;

  const startY = event.clientY;
  const start_height = dialog_size.value.height;

  const min_height_px = convertToPixels(props.minHeight, 'height');
  const max_height_px = props.maxHeight ? convertToPixels(props.maxHeight, 'height') : Infinity;

  emit('activated');

  const handlePointerMove = (e: PointerEvent) => {
    const delta_y = e.clientY - startY;

    let new_height = Math.max(min_height_px, start_height + delta_y);
    if (props.maxHeight) {
      new_height = Math.min(max_height_px, new_height);
    }

    dialog_size.value.height = new_height;
    x.value = 0;
    y.value = 0;

    throttledEmitResizing({
      left: 0,
      top: 0,
      width: dialog_size.value.width,
      height: new_height,
    });
  };

  const cleanup_stops: Array<() => void> = [];

  const handlePointerUp = () => {
    is_resizing.value = false;
    resize_direction.value = '';

    x.value = 0;
    y.value = 0;

    cleanup_stops.forEach(stop => stop());

    emit('resizestop', {
      left: x.value,
      top: y.value,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });

    emit('deactivated');

    saveSize(dialog_size.value.width, dialog_size.value.height);
  };

  cleanup_stops.push(
    useEventListener(document, 'pointermove', handlePointerMove as any, { passive: false }),
    useEventListener(document, 'pointerup', handlePointerUp as any),
    useEventListener(document, 'pointercancel', handlePointerUp as any),
  );
};

/**
 * 开始调整大小操作
 * @param {string} direction - 调整方向，如'tl', 'tm', 'tr'等
 * @param {PointerEvent} event - 鼠标或触摸事件对象
 * @description 处理浮窗的调整大小开始逻辑，支持8个方向的调整
 * 包括最小/最大尺寸限制、实时更新和事件发射
 */
const startResize = (direction: string, event: PointerEvent) => {
  if (!props.resizable || is_collapsed.value) return;
  if (is_mobile) {
    startMobileResize(direction, event);
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  is_resizing.value = true;
  resize_direction.value = direction;

  const startX = event.clientX;
  const startY = event.clientY;
  const start_width = dialog_size.value.width;
  const start_height = dialog_size.value.height;
  const start_left = x.value;
  const start_top = y.value;

  emit('activated');

  const handlePointerMove = (e: PointerEvent) => {
    const delta_x = e.clientX - startX;
    const delta_y = e.clientY - startY;

    const min_width_px = convertToPixels(props.minWidth, 'width');
    const max_width_px = props.maxWidth ? convertToPixels(props.maxWidth, 'width') : Infinity;
    const min_height_px = convertToPixels(props.minHeight, 'height');
    const max_height_px = props.maxHeight ? convertToPixels(props.maxHeight, 'height') : Infinity;

    let new_width = start_width;
    let new_height = start_height;
    let new_left = start_left;
    let new_top = start_top;

    if (direction.includes('right')) {
      new_width = Math.max(min_width_px, start_width + delta_x);
      if (props.maxWidth) {
        new_width = Math.min(max_width_px, new_width);
      }
    }
    if (direction.includes('left')) {
      new_width = Math.max(min_width_px, start_width - delta_x);
      if (props.maxWidth) {
        new_width = Math.min(max_width_px, new_width);
      }
      new_left = start_left + (start_width - new_width);
    }
    if (direction.includes('bottom')) {
      new_height = Math.max(min_height_px, start_height + delta_y);
      if (props.maxHeight) {
        new_height = Math.min(max_height_px, new_height);
      }
    }
    if (direction.includes('top')) {
      new_height = Math.max(min_height_px, start_height - delta_y);
      if (props.maxHeight) {
        new_height = Math.min(max_height_px, new_height);
      }
      new_top = start_top + (start_height - new_height);
    }

    x.value = new_left;
    y.value = new_top;
    dialog_size.value.width = new_width;
    dialog_size.value.height = new_height;

    throttledEmitResizing({
      left: new_left,
      top: new_top,
      width: new_width,
      height: new_height,
    });
  };

  const cleanup_stops: Array<() => void> = [];

  const handlePointerUp = () => {
    is_resizing.value = false;
    resize_direction.value = '';

    cleanup_stops.forEach(stop => stop());

    emit('resizestop', {
      left: x.value,
      top: y.value,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });

    emit('deactivated');

    saveSize(dialog_size.value.width, dialog_size.value.height);
  };

  cleanup_stops.push(
    useEventListener(document, 'pointermove', handlePointerMove as any, { passive: false }),
    useEventListener(document, 'pointerup', handlePointerUp as any),
    useEventListener(document, 'pointercancel', handlePointerUp as any),
  );
};

/**
 * 对话框样式计算
 * @description 根据对话框大小、位置、状态等计算对话框样式
 * @returns {object} 返回对话框样式对象
 */
const dialog_style = computed(() => {
  const user_select = is_dragging.value || is_resizing.value ? ('none' as const) : ('auto' as const);
  const position = 'absolute' as const;
  if (is_mobile) {
    return {
      position: position,
      transform: `translateY(${mobile_top_offset.value}px)`,
      height: `${is_collapsed.value ? header_height.value : dialog_size.value.height}px`,
      maxHeight: `calc(100dvh - 45px - ${mobile_top_offset.value}px)`,
      zIndex: 10000,
      userSelect: user_select,
      borderRadius: '0px 0px 5px 5px',
    };
  } else {
    return {
      position: position,
      // 避免触发布局与重绘
      transform: `translate3d(${x.value}px, ${y.value}px, 0)`,
      willChange: 'transform',
      left: '0px',
      top: '0px',
      width: `${dialog_size.value.width}px`,
      height: is_collapsed.value ? `${header_height.value}px` : `${dialog_size.value.height}px`,
      zIndex: 10000,
      userSelect: user_select,
    };
  }
});

const dialog_classes = computed(() => ({
  'dialog-dragging': is_dragging.value,
  'dialog-resizing': is_resizing.value,
  'dialog-resizable': props.resizable,
  'dialog-teleported': teleport_target.value,
}));
</script>

<style scoped>
@keyframes th-question-blink-animation {
  0%,
  100% {
    opacity: 0.5;
    color: inherit;
  }
  50% {
    opacity: 1;
    color: #0059ff;
  }
}

.th-question-blink {
  animation: th-question-blink-animation 2s ease-in-out infinite;
}
</style>
