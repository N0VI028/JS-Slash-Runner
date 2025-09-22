<template>
  <!-- prettier-ignore -->
  <div
    ref="dialogRef"
    :style="dialogStyle"
    :class="dialogClasses"
  >
    <div
      class="flex h-full flex-col overflow-hidden rounded-sm bg-(--SmartThemeBlurTintColor) shadow-lg"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref="headerRef"
        class="
          flex flex-shrink-0 cursor-move items-center justify-between rounded-t-sm bg-(--SmartThemeQuoteColor) px-1
          select-none
        "
        style="touch-action: none;"
        @pointerdown="startDrag"
      >
        <div class="flex-1 text-sm font-bold text-(--SmartThemeBodyColor)">{{ title }}</div>
        <div class="flex flex-shrink-0 gap-1">
          <button
            class="
              relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent
              text-(length:--TH-FontSizeM)!
              text-(--SmartThemeBodyColor)
            " 
            :title="isCollapsed ? t`展开` : t`折叠`" 
            @click="toggleCollapse"
          ><i :class="isCollapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"></i></button>
          <button
            class="
              relative z-20 flex cursor-pointer items-center justify-center rounded-md border-none bg-transparent
              text-(length:--TH-FontSizeM)!
              text-(--SmartThemeBodyColor)
            " 
            :title="t`关闭`" 
            @click="onClose"
          >×</button>
        </div>
      </div>
      <div v-if="!isCollapsed" class="flex flex-1 flex-col overflow-hidden">
        <slot>
        </slot>
      </div>
    </div>
    
    <!-- 调整大小手柄 -->
    <div
      v-for="handle in enabledHandles"
      :key="handle.name"
      :class="[
        'absolute opacity-0',
        handle.cursor,
        handle.class,
        {
          'opacity-100': showHandles
        }
      ]"
      :style="handle.style"
      @pointerdown="startResize(handle.name, $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import { useEventListener, useThrottleFn, useWindowSize } from '@vueuse/core';
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
    initX?: number | string | (() => number);
    /** 初始Y位置（top） */
    initY?: number | (() => number);
    /** 移动端初始X位置（left） */
    mobileInitX?: number | (() => number);
    /** 移动端初始Y位置（top） */
    mobileInitY?: number | (() => number);
    /** 本地存储键前缀 */
    storagePrefix?: string;
    /** 本地存储ID */
    storageId?: string;
  }>(),
  {
    width: '50vw',
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
    snapDistance: 50,
    aspectRatio: false,
    handles: () => ['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'],
    showHandles: false,
    initX: '10%',
    initY: () => Math.max(50, window.innerHeight * 0.15),
    mobileInitX: () => Math.max(0, window.innerWidth * 0.05),
    mobileInitY: () => Math.max(20, window.innerHeight * 0.15),
    storagePrefix: 'TH-FloatingDialog:',
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

const { width: windowWidth } = useWindowSize();

const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const headerRef = useTemplateRef<HTMLElement>('headerRef');

const headerHeight = ref(32);
function updateHeaderHeight() {
  headerHeight.value = headerRef.value?.offsetHeight ?? 32;
}
watchEffect(() => {
  updateHeaderHeight();
});
useEventListener(window, 'resize', () => {
  updateHeaderHeight();
});

const dialogSize = ref({
  width: 0,
  height: 0,
});

const isResizing = ref(false);
const resizeDirection = ref<string>('');
const initAspectRatio = ref(1);

const tempPosition = { x: 0, y: 0 };
const tempSize = { width: 0, height: 0 };

function applyTempToDOM() {
  if (!dialogRef.value) return;
  dialogRef.value.style.left = `${tempPosition.x}px`;
  dialogRef.value.style.top = `${tempPosition.y}px`;
  dialogRef.value.style.width = `${tempSize.width}px`;
  const collapsedHeight = `${headerHeight.value}px`;
  dialogRef.value.style.height = isCollapsed.value ? collapsedHeight : `${tempSize.height}px`;
}

const isCollapsed = ref(false);

function toggleCollapse() {
  isResizing.value = false;
  resizeDirection.value = '';
  isCollapsed.value = !isCollapsed.value;
}

/**
 * 统一的单位转换函数 - 将任何单位转换为像素值
 */
const convertToPixels = (value: string | number): number => {
  if (typeof value === 'number') return value;
  if (value.endsWith('vw')) {
    return (parseFloat(value) * windowWidth.value) / 100;
  }
  if (value.endsWith('vh')) {
    return (parseFloat(value) * window.innerHeight) / 100;
  }
  if (value.endsWith('px')) {
    return parseFloat(value);
  }
  if (value.endsWith('%')) {
    return (parseFloat(value) * windowWidth.value) / 100;
  }
  if (value.endsWith('rem')) {
    const rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return parseFloat(value) * rootFontSize;
  }
  return parseFloat(value) || 400;
};

/**
 * 初始化大小
 */
const initizeSize = () => {
  const targetWidth = isMobile() ? props.mobileWidth : props.width;
  const targetHeight = isMobile() ? props.mobileHeight : props.height;

  dialogSize.value.width = convertToPixels(targetWidth);
  dialogSize.value.height = convertToPixels(targetHeight);
  tempSize.width = dialogSize.value.width;
  tempSize.height = dialogSize.value.height;

  initAspectRatio.value = dialogSize.value.width / dialogSize.value.height;
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
  const isM = isMobile();

  const getInitValue = (value: number | string | (() => number)): number => {
    if (typeof value === 'function') return value();
    if (typeof value === 'string') return convertToPixels(value);
    return value;
  };

  const targetinitX = getInitValue(isM ? props.mobileInitX : props.initX);
  const targetinitY = getInitValue(isM ? props.mobileInitY : props.initY);

  const finalinitX = targetinitX || Math.max(0, windowWidth.value * 0.1);
  const finalinitY = targetinitY || Math.max(20, window.innerHeight * 0.15);

  return { x: finalinitX, y: finalinitY };
};

const initPos = getinitPosition();
const x = ref(initPos.x);
const y = ref(initPos.y);

const isDragging = ref(false);

const throttledUpdateUI = useThrottleFn(() => {
  applyTempToDOM();
}, 16);

/**
 * 获取存储键
 */
function getStorageKey(): string | null {
  if (!props.storageId) return null;
  return `${props.storagePrefix}${props.storageId}`;
}

const __storageKey = getStorageKey();

if (!props.storageId) {
  console.warn('[TH-Dialog] storageId 未提供，状态将不会持久化到本地存储。');
}

/**
 * 获取位置存储键
 */
function getPositionStorageKey(): string | null {
  return __storageKey ? `${__storageKey}:pos` : null;
}

/**
 * 获取大小存储键
 */
function getSizeStorageKey(): string | null {
  return __storageKey ? `${__storageKey}:size` : null;
}

/**
 * 读取本地存储
 */
function readStorageJSON<T extends Record<string, any>>(key: string): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : ({} as T);
  } catch {
    return {} as T;
  }
}

/**
 * 写入本地存储
 */
function writeStorageJSON(key: string, value: Record<string, any>) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn('[TH-Dialog] 本地存储写入失败:', err);
  }
}

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
  const key = getPositionStorageKey();
  if (!key) return;
  try {
    const existing = readStorageJSON<Record<string, any>>(key);
    if (isMobile()) {
      existing.mobileLeft = left;
      existing.mobileTop = top;
    } else {
      existing.left = left;
      existing.top = top;
    }
    writeStorageJSON(key, existing);
  } catch (err) {
    console.warn('[TH-Dialog] 保存位置失败:', err);
  }
}

/**
 * 保存大小
 */
function saveSize(width: number, height: number) {
  const key = getSizeStorageKey();
  if (!key) return;
  try {
    const existing = readStorageJSON<Record<string, any>>(key);
    if (isMobile()) {
      existing.mobileWidth = width;
      existing.mobileHeight = height;
    } else {
      existing.width = width;
      existing.height = height;
    }
    writeStorageJSON(key, existing);
  } catch (err) {
    console.warn('[TH-Dialog] 保存大小失败:', err);
  }
}

/**
 * 加载位置
 */
function loadPosition(): { left: number; top: number } | null {
  const key = getPositionStorageKey();
  if (!key) return null;
  try {
    const parsed = readStorageJSON<Record<string, any>>(key);
    const isM = isMobile();
    const picked = pickPersistedValue(
      parsed,
      isM ? (['mobileLeft', 'mobileTop'] as const) : (['left', 'top'] as const),
      isM ? (['left', 'top'] as const) : (['mobileLeft', 'mobileTop'] as const),
    );
    if (picked && typeof picked.a === 'number' && typeof picked.b === 'number') {
      return { left: picked.a, top: picked.b };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载位置失败:', err);
  }
  return null;
}

/**
 * 加载大小
 */
function loadSize(): { width: number; height: number } | null {
  const key = getSizeStorageKey();
  if (!key) return null;
  try {
    const parsed = readStorageJSON<Record<string, any>>(key);
    const isM = isMobile();
    const picked = pickPersistedValue(
      parsed,
      isM ? (['mobileWidth', 'mobileHeight'] as const) : (['width', 'height'] as const),
      isM ? (['width', 'height'] as const) : (['mobileWidth', 'mobileHeight'] as const),
    );
    if (picked && typeof picked.a === 'number' && typeof picked.b === 'number') {
      return { width: picked.a, height: picked.b };
    }
  } catch (err) {
    console.warn('[TH-Dialog] 加载大小失败:', err);
  }
  return null;
}

onMounted(() => {
  const pos = loadPosition();
  if (pos) {
    x.value = pos.left;
    y.value = pos.top;
  }
  tempPosition.x = x.value;
  tempPosition.y = y.value;

  const size = loadSize();
  if (size) {
    dialogSize.value.width = size.width;
    dialogSize.value.height = size.height;
    tempSize.width = size.width;
    tempSize.height = size.height;
  }
  applyTempToDOM();
});

/**
 * 开始拖拽
 */
const startDrag = (event: PointerEvent) => {
  if (!props.draggable) return;

  event.preventDefault();
  event.stopPropagation();

  isDragging.value = true;

  const startX = event.clientX;
  const startY = event.clientY;
  const startLeft = x.value;
  const startTop = y.value;

  tempPosition.x = startLeft;
  tempPosition.y = startTop;

  const handleDragMove = (e: PointerEvent) => {
    const newXRaw = startLeft + (e.clientX - startX);
    const newYRaw = startTop + (e.clientY - startY);

    const newX = newXRaw;
    const newY = newYRaw;

    tempPosition.x = newX;
    tempPosition.y = newY;

    throttledUpdateUI();

    throttledEmitDragging({
      left: newX,
      top: newY,
      width: dialogSize.value.width,
      height: dialogSize.value.height,
    });
  };

  const cleanupStops: Array<() => void> = [];

  const handleDragEnd = () => {
    isDragging.value = false;

    const snapResult = checkEdgeSnap(tempPosition.x, tempPosition.y, dialogSize.value.width, dialogSize.value.height);

    x.value = snapResult.left;
    y.value = snapResult.top;

    if (snapResult.snapped) {
      dialogSize.value.width = snapResult.width;
      dialogSize.value.height = snapResult.height;
      tempSize.width = snapResult.width;
      tempSize.height = snapResult.height;
      tempPosition.x = snapResult.left;
      tempPosition.y = snapResult.top;

      if (dialogRef.value) {
        dialogRef.value.style.left = `${snapResult.left}px`;
        dialogRef.value.style.top = `${snapResult.top}px`;
        dialogRef.value.style.width = `${snapResult.width}px`;
        dialogRef.value.style.height = isCollapsed.value ? `${headerHeight.value}px` : `${snapResult.height}px`;
      }
    }

    cleanupStops.forEach(stop => stop());

    emit('dragstop', {
      left: x.value,
      top: y.value,
      width: dialogSize.value.width,
      height: dialogSize.value.height,
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
 * 边缘吸附
 */
const checkEdgeSnap = (left: number, top: number, width: number, height: number) => {
  if (!props.edgeSnap || isMobile()) {
    return { left, top, width, height, snapped: false };
  }

  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  const snapDist = props.snapDistance;

  if (left <= snapDist) {
    return {
      left: 0,
      top: 0,
      width,
      height: screenHeight,
      snapped: true,
    };
  }

  if (left + width >= screenWidth - snapDist) {
    return {
      left: screenWidth - width,
      top: 0,
      width,
      height: screenHeight,
      snapped: true,
    };
  }

  return { left, top, width, height, snapped: false };
};

/**
 * 调整大小手柄
 */
const handleConfigs: Record<string, ResizeHandle> = {
  tl: {
    name: 'top-left',
    cursor: 'cursor-nw-resize',
    class: 'z-20 top-0 left-0 h-3 w-3',
    style: { top: '0', left: '0' },
  },
  tm: {
    name: 'top',
    cursor: 'cursor-ns-resize',
    class: 'z-10 top-0 left-0 h-2',
    style: { top: '0', left: '0', width: '100%' },
  },
  tr: {
    name: 'top-right',
    cursor: 'cursor-ne-resize',
    class: 'z-20 top-0 right-0 h-3 w-3',
    style: { top: '0', right: '0' },
  },
  mr: {
    name: 'right',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 right-0 w-2',
    style: { top: '0', right: '0', height: '100%' },
  },
  br: {
    name: 'bottom-right',
    cursor: 'cursor-nw-resize',
    class: 'z-20 bottom-0 right-0 h-3 w-3',
    style: { bottom: '0', right: '0' },
  },
  bm: {
    name: 'bottom',
    cursor: 'cursor-ns-resize',
    class: 'z-10 bottom-0 left-0 h-2',
    style: { bottom: '0', left: '0', width: '100%' },
  },
  bl: {
    name: 'bottom-left',
    cursor: 'cursor-ne-resize',
    class: 'z-20 bottom-0 left-0 h-3 w-3',
    style: { bottom: '0', left: '0' },
  },
  ml: {
    name: 'left',
    cursor: 'cursor-ew-resize',
    class: 'z-10 top-0 left-0 w-2',
    style: { top: '0', left: '0', height: '100%' },
  },
};

const enabledHandles = computed(() => {
  if (!props.resizable || isCollapsed.value) return [] as ResizeHandle[];
  const inset = 8;
  const cloned = props.handles
    .map(handle => ({ ...handleConfigs[handle], style: { ...handleConfigs[handle].style } }))
    .filter(Boolean) as ResizeHandle[];

  const topHandle = cloned.find(h => h.name === 'top');
  if (topHandle) {
    topHandle.style.top = `${headerHeight.value}px`;
    topHandle.style.left = `${inset}px`;
    topHandle.style.right = `${inset}px`;
    delete (topHandle.style as any).width;
  }
  const rightHandle = cloned.find(h => h.name === 'right');
  if (rightHandle) {
    rightHandle.style.top = `${headerHeight.value + inset}px`;
    rightHandle.style.bottom = `${inset}px`;
    delete (rightHandle.style as any).height;
  }
  const leftHandle = cloned.find(h => h.name === 'left');
  if (leftHandle) {
    leftHandle.style.top = `${inset}px`;
    leftHandle.style.bottom = `${inset}px`;
    delete (leftHandle.style as any).height;
  }
  const bottomHandle = cloned.find(h => h.name === 'bottom');
  if (bottomHandle) {
    bottomHandle.style.left = `${inset}px`;
    bottomHandle.style.right = `${inset}px`;
    delete (bottomHandle.style as any).width;
  }
  const topRightCorner = cloned.find(h => h.name === 'top-right');
  if (topRightCorner) {
    topRightCorner.style.top = `${headerHeight.value}px`;
    (topRightCorner.style as any).right = `${inset}px`;
  }
  const topLeftCorner = cloned.find(h => h.name === 'top-left');
  if (topLeftCorner) {
    topLeftCorner.style.top = `${headerHeight.value}px`;
    (topLeftCorner.style as any).left = `${inset}px`;
  }

  return cloned;
});

/**
 * 开始调整大小
 */
const startResize = (direction: string, event: PointerEvent) => {
  if (!props.resizable || isCollapsed.value) return;

  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeDirection.value = direction;

  const startX = event.clientX;
  const startY = event.clientY;
  const startWidth = dialogSize.value.width;
  const startHeight = dialogSize.value.height;
  const startLeft = x.value;
  const startTop = y.value;

  tempPosition.x = startLeft;
  tempPosition.y = startTop;
  tempSize.width = startWidth;
  tempSize.height = startHeight;

  emit('activated');

  const handlePointerMove = (e: PointerEvent) => {
    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const minWidthPx = convertToPixels(props.minWidth);
    const maxWidthPx = props.maxWidth ? convertToPixels(props.maxWidth) : Infinity;
    const minHeightPx = convertToPixels(props.minHeight);
    const maxHeightPx = props.maxHeight ? convertToPixels(props.maxHeight) : Infinity;

    let newWidth = startWidth;
    let newHeight = startHeight;
    let newLeft = startLeft;
    let newTop = startTop;

    if (direction.includes('right')) {
      newWidth = Math.max(minWidthPx, startWidth + deltaX);
      if (props.maxWidth) newWidth = Math.min(maxWidthPx, newWidth);
    }
    if (direction.includes('left')) {
      newWidth = Math.max(minWidthPx, startWidth - deltaX);
      if (props.maxWidth) newWidth = Math.min(maxWidthPx, newWidth);
      newLeft = startLeft + (startWidth - newWidth);
    }
    if (direction.includes('bottom')) {
      newHeight = Math.max(minHeightPx, startHeight + deltaY);
      if (props.maxHeight) newHeight = Math.min(maxHeightPx, newHeight);
    }
    if (direction.includes('top')) {
      newHeight = Math.max(minHeightPx, startHeight - deltaY);
      if (props.maxHeight) newHeight = Math.min(maxHeightPx, newHeight);
      newTop = startTop + (startHeight - newHeight);
    }

    tempPosition.x = newLeft;
    tempPosition.y = newTop;
    tempSize.width = newWidth;
    tempSize.height = newHeight;

    throttledUpdateUI();

    throttledEmitResizing({
      left: newLeft,
      top: newTop,
      width: newWidth,
      height: newHeight,
    });
  };

  const cleanupStops: Array<() => void> = [];

  const handlePointerUp = () => {
    isResizing.value = false;
    resizeDirection.value = '';

    x.value = tempPosition.x;
    y.value = tempPosition.y;
    dialogSize.value.width = tempSize.width;
    dialogSize.value.height = tempSize.height;

    cleanupStops.forEach(stop => stop());

    emit('resizestop', {
      left: x.value,
      top: y.value,
      width: dialogSize.value.width,
      height: dialogSize.value.height,
    });

    emit('deactivated');

    saveSize(dialogSize.value.width, dialogSize.value.height);
  };

  cleanupStops.push(
    useEventListener(document, 'pointermove', handlePointerMove as any, { passive: false }),
    useEventListener(document, 'pointerup', handlePointerUp as any),
    useEventListener(document, 'pointercancel', handlePointerUp as any),
  );
};

const dialogStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${dialogSize.value.width}px`,
  height: isCollapsed.value ? `${headerHeight.value}px` : `${dialogSize.value.height}px`,
  zIndex: 10000,
  userSelect: isDragging.value || isResizing.value ? ('none' as const) : ('auto' as const),
}));

const dialogClasses = computed(() => ({
  'dialog-dragging': isDragging.value,
  'dialog-resizing': isResizing.value,
  'dialog-resizable': props.resizable,
}));

function onClose() {
  emit('close');
}
</script>
