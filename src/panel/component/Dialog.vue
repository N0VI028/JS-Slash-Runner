<template>
  <div ref="dialog_ref" :style="dialog_style" :class="dialog_classes">
    <div
      class="flex h-full flex-col overflow-hidden rounded-sm bg-(--SmartThemeBlurTintColor) shadow-lg"
      role="dialog"
      aria-modal="true"
    >
      <!-- prettier-ignore-attribute -->
      <div
        ref="header_ref"
        class="
          flex flex-shrink-0 items-center justify-between rounded-t-sm bg-(--SmartThemeQuoteColor) px-1 select-none
        "
      >
        <div
          class="flex-1 cursor-move font-bold text-(--SmartThemeBodyColor)"
          style="touch-action: none"
          @pointerdown="startDrag"
        >
          {{ title }}
        </div>
        <div class="flex flex-shrink-0 gap-1">
          <!-- prettier-ignore-attribute -->
          <button
            class="
              relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent
              text-base!
              text-(--SmartThemeBodyColor)
            "
            :title="is_collapsed ? t`展开` : t`折叠`"
            @click="toggleCollapse"
          >
            <i :class="is_collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"></i>
          </button>
          <!-- prettier-ignore-attribute -->
          <button
            class="
              fa-solid fa-close relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none
              bg-transparent
              text-base!
              text-(--SmartThemeBodyColor)
            "
            :title="t`关闭`"
            @click="emit('close')"
          ></button>
        </div>
      </div>
      <div v-if="!is_collapsed" class="flex flex-1 flex-col overflow-hidden">
        <slot> </slot>
      </div>
    </div>

    <!-- 调整大小手柄 -->
    <div
      v-for="handle in enabled_handles"
      :key="handle.name"
      :class="[
        'absolute opacity-0',
        handle.cursor,
        handle.class,
        {
          'opacity-100': showHandles,
        },
      ]"
      :style="handle.style"
      @pointerdown="startResize(handle.name, $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import { useEventListener, useLocalStorage, useResizeObserver, useThrottleFn, useWindowSize } from '@vueuse/core';
import { computed, onMounted, ref, useTemplateRef, watchEffect } from 'vue';

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
    /** 桌面端宽度，单位可以是px、vw等 */
    width?: string | number;
    /** 桌面端高度，单位可以是px、vh等 */
    height?: string | number;
    /** 移动端宽度，单位可以是px、vw等 */
    mobileWidth?: string | number;
    /** 移动端高度，单位可以是px、vh等 */
    mobileHeight?: string | number;
    /** 标题文本，由外部传入 */
    title?: string;
    /** 是否可拖拽 */
    draggable?: boolean;
    /** 是否可调整大小 */
    resizable?: boolean;
    /** 最小宽度 */
    minWidth?: string | number;
    /** 最小高度 */
    minHeight?: string | number;
    /** 最大宽度 */
    maxWidth?: string | number;
    /** 最大高度 */
    maxHeight?: string | number;
    /** 启用边缘吸附（仅PC端） */
    edgeSnap?: boolean;
    /** 边缘吸附触发距离 */
    snapDistance?: number;
    /** 调整大小手柄 */
    handles?: Array<'tl' | 'tm' | 'tr' | 'mr' | 'br' | 'bm' | 'bl' | 'ml'>;
    /** 显示调整大小手柄 */
    showHandles?: boolean;
    /** 初始X位置（left）*/
    initialX?: number | string | (() => number);
    /** 初始Y位置（top） */
    initialY?: number | (() => number);
    /** 移动端初始X位置（left） */
    mobileInitialX?: number | (() => number);
    /** 移动端初始Y位置（top） */
    mobileInitialY?: number | (() => number);
    /** 本地存储ID */
    storageId?: string;
  }>(),
  {
    width: '60vw',
    height: '70vh',
    mobileWidth: '90vw',
    mobileHeight: '70vh',
    title: '未命名浮窗',
    draggable: true,
    resizable: true,
    minWidth: 300,
    minHeight: 200,
    maxWidth: '90vw',
    maxHeight: '90vh',
    edgeSnap: true,
    snapDistance: 100,
    aspectRatio: false,
    handles: () => ['tl', 'tm', 'mr', 'br', 'bm', 'bl'],
    showHandles: false,
    initialX: '10%',
    initialY: () => Math.max(50, window.innerHeight * 0.15),
    mobileInitialX: () => Math.max(0, window.innerWidth * 0.05),
    mobileInitialY: () => Math.max(20, window.innerHeight * 0.15),
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
}>();

const { width: window_width } = useWindowSize();

const dialog_ref = useTemplateRef<HTMLElement>('dialog_ref');
const header_ref = useTemplateRef<HTMLElement>('header_ref');

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

const temp_position = { x: 0, y: 0 };
const temp_size = { width: 0, height: 0 };

const was_snapped = ref(false);
const pre_snap_rect = ref<{ left: number; top: number; width: number; height: number } | null>(null);

function applyTempToDOM() {
  if (!dialog_ref.value) {
    return;
  }
  dialog_ref.value.style.left = `${temp_position.x}px`;
  dialog_ref.value.style.top = `${temp_position.y}px`;
  dialog_ref.value.style.width = `${temp_size.width}px`;
  const collapsedHeight = `${header_height.value}px`;
  dialog_ref.value.style.height = is_collapsed.value ? collapsedHeight : `${temp_size.height}px`;
}

const is_collapsed = ref(false);

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
 * 统一的单位转换函数 - 将任何单位转换为像素值
 */
const convertToPixels = (value: string | number): number => {
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
    return (parseFloat(value) * window_width.value) / 100;
  }
  if (value.endsWith('rem')) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(value) * rootFontSize;
  }
  return parseFloat(value) || 400;
};

const is_mobile = isMobile();

/**
 * 初始化大小
 */
const initizeSize = () => {
  const target_width = is_mobile ? props.mobileWidth : props.width;
  const target_height = is_mobile ? props.mobileHeight : props.height;

  dialog_size.value.width = convertToPixels(target_width);
  dialog_size.value.height = convertToPixels(target_height);
  temp_size.width = dialog_size.value.width;
  temp_size.height = dialog_size.value.height;

  initial_aspect_ratio.value = dialog_size.value.width / dialog_size.value.height;
};

initizeSize();

const throttledEmitDragging = useThrottleFn((payload: { left: number; top: number; width: number; height: number }) => {
  emit('dragging', payload);
}, 16);
const throttledEmitResizing = useThrottleFn((payload: { left: number; top: number; width: number; height: number }) => {
  emit('resizing', payload);
}, 16);

/**
 * 获取初始位置
 */
const getinitPosition = () => {
  const getInitValue = (value: number | string | (() => number)): number => {
    if (typeof value === 'function') {
      return value();
    }
    if (typeof value === 'string') {
      return convertToPixels(value);
    }
    return value;
  };

  return {
    x: getInitValue(is_mobile ? props.mobileInitialX : props.initialX) || Math.max(0, window_width.value * 0.1),
    y: getInitValue(is_mobile ? props.mobileInitialY : props.initialY) || Math.max(20, window.innerHeight * 0.15),
  };
};

const initial_position = getinitPosition();
const x = ref(initial_position.x);
const y = ref(initial_position.y);

const is_dragging = ref(false);

const throttledUpdateUI = useThrottleFn(() => {
  applyTempToDOM();
}, 16);

/**
 * 获取存储键
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
  mobileWidth?: number;
  mobileHeight?: number;
}

const position_storage = props.storageId
  ? useLocalStorage<PositionStorage>(`TH-Dialog-${props.storageId}:pos`, {}, { mergeDefaults: true })
  : ref<PositionStorage>({});

const size_storage = props.storageId
  ? useLocalStorage<SizeStorage>(`TH-Dialog-${props.storageId}:size`, {}, { mergeDefaults: true })
  : ref<SizeStorage>({});

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
 * 保存位置
 */
function savePosition(left: number, top: number) {
  if (!__storage_key) return;
  try {
    if (is_mobile) {
      position_storage.value.mobileLeft = left;
      position_storage.value.mobileTop = top;
    } else {
      position_storage.value.left = left;
      position_storage.value.top = top;
    }
  } catch (err) {
    console.warn('[TH-Dialog] 保存位置失败:', err);
  }
}

/**
 * 保存大小
 */
function saveSize(width: number, height: number) {
  if (!__storage_key) return;
  try {
    if (is_mobile) {
      size_storage.value.mobileWidth = width;
      size_storage.value.mobileHeight = height;
    } else {
      size_storage.value.width = width;
      size_storage.value.height = height;
    }
  } catch (err) {
    console.warn('[TH-Dialog] 保存大小失败:', err);
  }
}

function loadPosition(): { left: number; top: number } | null {
  if (!__storage_key) return null;
  try {
    const parsed = position_storage.value;
    const picked = pickPersistedValue(
      parsed,
      is_mobile ? (['mobileLeft', 'mobileTop'] as const) : (['left', 'top'] as const),
      is_mobile ? (['left', 'top'] as const) : (['mobileLeft', 'mobileTop'] as const),
    );
    if (picked && typeof picked.a === 'number' && typeof picked.b === 'number') {
      return { left: picked.a, top: picked.b };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载位置失败:', err);
  }
  return null;
}

function loadSize(): { width: number; height: number } | null {
  if (!__storage_key) return null;
  try {
    const parsed = size_storage.value;
    const picked = pickPersistedValue(
      parsed,
      is_mobile ? (['mobileWidth', 'mobileHeight'] as const) : (['width', 'height'] as const),
      is_mobile ? (['width', 'height'] as const) : (['mobileWidth', 'mobileHeight'] as const),
    );
    if (picked && typeof picked.a === 'number' && typeof picked.b === 'number') {
      return { width: picked.a, height: picked.b };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载大小失败:', err);
  }
  return null;
}

/**
 * 检查并调整浮窗边界，确保不超出视口
 */
function checkAndAdjustBounds() {
  const viewport_width = window.innerWidth;
  const viewport_height = window.innerHeight;

  let adjusted = false;

  const max_width = viewport_width * 0.95; // 留出5%的边距
  const max_height = viewport_height * 0.95;

  if (dialog_size.value.width > max_width) {
    dialog_size.value.width = max_width;
    temp_size.width = max_width;
    adjusted = true;
  }

  if (dialog_size.value.height > max_height) {
    dialog_size.value.height = max_height;
    temp_size.height = max_height;
    adjusted = true;
  }

  const min_x = 0;
  const max_x = viewport_width - dialog_size.value.width;
  const min_y = 0;
  const max_y = viewport_height - (is_collapsed.value ? header_height.value : dialog_size.value.height);

  if (x.value < min_x) {
    x.value = min_x;
    temp_position.x = min_x;
    adjusted = true;
  } else if (x.value > max_x) {
    x.value = Math.max(min_x, max_x);
    temp_position.x = x.value;
    adjusted = true;
  }

  if (y.value < min_y) {
    y.value = min_y;
    temp_position.y = min_y;
    adjusted = true;
  } else if (y.value > max_y) {
    y.value = Math.max(min_y, max_y);
    temp_position.y = y.value;
    adjusted = true;
  }

  if (adjusted) {
    applyTempToDOM();
    savePosition(x.value, y.value);
    saveSize(dialog_size.value.width, dialog_size.value.height);
  }
}

onMounted(() => {
  const pos = loadPosition();
  if (pos) {
    x.value = pos.left;
    y.value = pos.top;
  }
  temp_position.x = x.value;
  temp_position.y = y.value;

  const size = loadSize();
  if (size) {
    dialog_size.value.width = size.width;
    dialog_size.value.height = size.height;
    temp_size.width = size.width;
    temp_size.height = size.height;
  }
  applyTempToDOM();
  checkAndAdjustBounds();
});

/*
 * 监听视口大小变化
 */
useResizeObserver(document.body, () => {
  const throttledAdjust = useThrottleFn(() => {
    checkAndAdjustBounds();
  }, 100);

  throttledAdjust();
});

/**
 * 开始拖拽
 */
const startDrag = (event: PointerEvent) => {
  if (!props.draggable) return;

  event.preventDefault();
  event.stopPropagation();

  is_dragging.value = true;

  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = x.value;
  const startTop = y.value;

  let hasRestoredFromSnap = false;
  let lastMouseX = event.clientX;
  let lastMouseY = event.clientY;

  temp_position.x = startLeft;
  temp_position.y = startTop;

  const handleDragMove = (e: PointerEvent) => {
    const newX = startLeft + (e.clientX - startX);
    let newY = startTop + (e.clientY - startY);

    // 当组件已贴边，检查鼠标是否向反方向移动
    if (was_snapped.value && !hasRestoredFromSnap && pre_snap_rect.value) {
      const snapDist = props.snapDistance;
      const mouseNearLeft = e.clientX <= snapDist;
      const mouseNearRight = e.clientX >= window.innerWidth - snapDist;

      // 如果鼠标不再靠近边缘，则脱离吸附状态
      if (!mouseNearLeft && !mouseNearRight) {
        const { width: prevWidth, height: prevHeight } = pre_snap_rect.value;
        dialog_size.value.width = prevWidth;
        dialog_size.value.height = prevHeight;
        temp_size.width = prevWidth;
        temp_size.height = prevHeight;
        hasRestoredFromSnap = true;
        was_snapped.value = false;
      }
    }

    // 只保留上下边界限制，允许组件在左右方向超出视口
    const screenHeight = window.innerHeight;
    const dialogHeight = is_collapsed.value ? header_height.value : temp_size.height;

    newY = Math.max(0, Math.min(newY, screenHeight - dialogHeight));

    temp_position.x = newX;
    temp_position.y = newY;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    throttledUpdateUI();

    throttledEmitDragging({
      left: newX,
      top: newY,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });
  };

  const cleanupStops: Array<() => void> = [];

  const handleDragEnd = () => {
    is_dragging.value = false;

    const snapResult = checkEdgeSnap(
      lastMouseX,
      lastMouseY,
      temp_position.x,
      temp_position.y,
      dialog_size.value.width,
      dialog_size.value.height,
    );

    if (snapResult.snapped) {
      pre_snap_rect.value = {
        left: temp_position.x,
        top: temp_position.y,
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
      temp_size.width = snapResult.width;
      temp_size.height = snapResult.height;
      temp_position.x = snapResult.left;
      temp_position.y = snapResult.top;

      if (dialog_ref.value) {
        dialog_ref.value.style.left = `${snapResult.left}px`;
        dialog_ref.value.style.top = `${snapResult.top}px`;
        dialog_ref.value.style.width = `${snapResult.width}px`;
        dialog_ref.value.style.height = is_collapsed.value ? `${header_height.value}px` : `${snapResult.height}px`;
      }
    }

    cleanupStops.forEach(stop => stop());

    emit('dragstop', {
      left: x.value,
      top: y.value,
      width: dialog_size.value.width,
      height: dialog_size.value.height,
    });

    savePosition(x.value, y.value);
  };

  cleanupStops.push(
    useEventListener(document, 'pointermove', handleDragMove as any, { passive: false }),
    useEventListener(document, 'pointerup', handleDragEnd as any),
    useEventListener(document, 'pointercancel', handleDragEnd as any),
  );
};

/**
 * 边缘吸附 - 基于鼠标位置判断
 */
const checkEdgeSnap = (mouseX: number, mouseY: number, left: number, top: number, width: number, height: number) => {
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

/**
 * 调整大小手柄
 */
const handle_configs: Record<string, ResizeHandle> = {
  tl: {
    name: 'top-left',
    cursor: 'cursor-nw-resize',
    class: 'z-20 top-0 left-0 h-[5px] w-[5px]',
    style: { top: '0', left: '0' },
  },
  tm: {
    name: 'top',
    cursor: 'cursor-ns-resize',
    class: 'z-10 top-0 left-0 h-[5px]',
    style: { top: '0', left: '0', width: '100%' },
  },
  tr: {
    name: 'top-right',
    cursor: 'cursor-ne-resize',
    class: 'z-20 top-0 right-0 h-[5px] w-[5px]',
    style: { top: '0', right: '0' },
  },
  mr: {
    name: 'right',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 right-0 w-[5px]',
    style: { top: '0', right: '0', height: '100%' },
  },
  br: {
    name: 'bottom-right',
    cursor: 'cursor-nw-resize',
    class: 'z-20 bottom-0 right-0 h-[5px] w-[5px]',
    style: { bottom: '0', right: '0' },
  },
  bm: {
    name: 'bottom',
    cursor: 'cursor-ns-resize',
    class: 'z-10 bottom-0 left-0 h-[5px]',
    style: { bottom: '0', left: '0', width: '100%' },
  },
  bl: {
    name: 'bottom-left',
    cursor: 'cursor-ne-resize',
    class: 'z-20 bottom-0 left-0 h-[5px] w-[5px]',
    style: { bottom: '0', left: '0' },
  },
  ml: {
    name: 'left',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 left-0 w-[5px]',
    style: { top: '0', left: '0', height: '100%' },
  },
};

const enabled_handles = computed(() => {
  if (!props.resizable || is_collapsed.value) {
    return [] as ResizeHandle[];
  }

  const inset = 8;
  const cloned = props.handles
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

  const top_right_corner = cloned.find(h => h.name === 'top-right');
  if (top_right_corner) {
    top_right_corner.style.top = `0px`;
    (top_right_corner.style as any).right = `${inset}px`;
  }

  const top_left_corner = cloned.find(h => h.name === 'top-left');
  if (top_left_corner) {
    top_left_corner.style.top = `0px`;
    (top_left_corner.style as any).left = `${inset}px`;
  }

  return cloned;
});

const startResize = (direction: string, event: PointerEvent) => {
  if (!props.resizable || is_collapsed.value) return;

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

  temp_position.x = start_left;
  temp_position.y = start_top;
  temp_size.width = start_width;
  temp_size.height = start_height;

  emit('activated');

  const handlePointerMove = (e: PointerEvent) => {
    const delta_x = e.clientX - startX;
    const delta_y = e.clientY - startY;

    const min_width_px = convertToPixels(props.minWidth);
    const max_width_px = props.maxWidth ? convertToPixels(props.maxWidth) : Infinity;
    const min_height_px = convertToPixels(props.minHeight);
    const max_height_px = props.maxHeight ? convertToPixels(props.maxHeight) : Infinity;

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

    temp_position.x = new_left;
    temp_position.y = new_top;
    temp_size.width = new_width;
    temp_size.height = new_height;

    throttledUpdateUI();

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

    x.value = temp_position.x;
    y.value = temp_position.y;
    dialog_size.value.width = temp_size.width;
    dialog_size.value.height = temp_size.height;

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

const dialog_style = computed(() => ({
  position: 'fixed' as const,
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${dialog_size.value.width}px`,
  height: is_collapsed.value ? `${header_height.value}px` : `${dialog_size.value.height}px`,
  zIndex: 10000,
  userSelect: is_dragging.value || is_resizing.value ? ('none' as const) : ('auto' as const),
}));

const dialog_classes = computed(() => ({
  'dialog-dragging': is_dragging.value,
  'dialog-resizing': is_resizing.value,
  'dialog-resizable': props.resizable,
}));
</script>
