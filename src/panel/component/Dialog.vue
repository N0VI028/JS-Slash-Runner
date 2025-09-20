<template>
  <Teleport to="body">
    <Vue3DraggableResizable
      ref="dialogRef"
      v-model:w="w"
      v-model:h="h"
      v-model:x="x"
      v-model:y="y"
      class="TH-floating-dialog"
      :style="null"
      :data-dialog-id="id"
      :init-w="initialW"
      :init-h="initialH"
      :min-w="minWpx"
      :min-h="minHpx"
      :draggable="draggable && draggableNow"
      :resizable="resizable && !collapsed"
      :handles="handles"
      :parent="true"
      class-name-dragging="dragging"
      class-name-resizing="resizing"
      @activated="bringToFront"
      @resize-end="onResizeEnd"
    >
      <div ref="headerRef" class="dialog-header" @mousedown="onHeaderPointerDown">
        <div class="dialog-title">{{ title }}</div>

        <div class="dialog-controls">
          <button v-if="collapsible" title="折叠/展开内容" @click.stop="toggleCollapsed" @mousedown.stop>
            <i :class="collapsed ? 'fa-solid fa-chevron-down' : 'fa-solid fa-chevron-up'"></i>
          </button>

          <button class="dialog-close-btn" title="关闭" @click.stop="handleClose" @mousedown.stop>
            <i class="fa-solid fa-times"></i>
          </button>
        </div>
      </div>

      <div v-show="!collapsed" ref="contentRef" class="dialog-content" @mousedown.stop>
        <slot />
      </div>
    </Vue3DraggableResizable>
  </Teleport>
</template>

<script setup lang="ts">
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import log from 'loglevel';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
// import Vue3DraggableResizable from 'vue3-draggable-resizable';

type Dimension = number | string | undefined;

const DEFAULT_MIN_WIDTH = 300;
const DEFAULT_MIN_HEIGHT = 250;
const DEFAULT_WIDTH = 600;
const DEFAULT_HEIGHT = 400;

const MOBILE_DEFAULT_MIN_WIDTH = 280;
const MOBILE_DEFAULT_MIN_HEIGHT = 200;
const MOBILE_DEFAULT_WIDTH = 200;
const MOBILE_DEFAULT_HEIGHT = 100;

const STORAGE_KEY_PREFIX = 'TH_floating_dialog_size_';

const props = withDefaults(
  defineProps<{
    title: string;
    id: string;
    minWidth?: number | string;
    minHeight?: number | string;
    width?: number | string;
    height?: number | string;
    mobileMinWidth?: number | string;
    mobileMinHeight?: number | string;
    mobileWidth?: number | string;
    mobileHeight?: number | string;
    resizable?: boolean;
    draggable?: boolean;
    collapsible?: boolean;
  }>(),
  {
    resizable: true,
    draggable: true,
    collapsible: true,
    // dimension defaults for linter and runtime consistency
    minWidth: DEFAULT_MIN_WIDTH,
    minHeight: DEFAULT_MIN_HEIGHT,
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    mobileMinWidth: MOBILE_DEFAULT_MIN_WIDTH,
    mobileMinHeight: MOBILE_DEFAULT_MIN_HEIGHT,
    mobileWidth: MOBILE_DEFAULT_WIDTH,
    mobileHeight: MOBILE_DEFAULT_HEIGHT,
  },
);

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'toggle', collapsed: boolean): void;
}>();

const dialogRef = ref<any | null>(null);
const headerRef = ref<HTMLDivElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);

const isMobileDevice = ref<boolean>(isMobile());
const collapsed = ref<boolean>(false);
const draggableNow = ref<boolean>(false);

function saveWindowSize(id: string, width: number, height: number, isMobileDeviceParam: boolean): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    const sizeData = { width, height, isMobile: isMobileDeviceParam };
    localStorage.setItem(key, JSON.stringify(sizeData));
  } catch (error) {
    log.warn('保存窗口大小失败:', error);
  }
}

function loadWindowSize(id: string, isMobileDeviceParam: boolean): { width: number; height: number } | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${id}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const sizeData = JSON.parse(stored);
    if (sizeData.isMobile === isMobileDeviceParam && sizeData.width && sizeData.height) {
      return { width: sizeData.width, height: sizeData.height };
    }
  } catch (error) {
    log.warn('加载窗口大小失败:', error);
  }
  return null;
}

// removed unused resolveCssSize helper after migrating to component-controlled sizing

function computePixelSize(value: Dimension, axis: 'w' | 'h'): number {
  const viewportW = window.innerWidth || 0;
  const viewportH = window.innerHeight || 0;
  const mobile = isMobileDevice.value;
  const fallback =
    axis === 'w'
      ? mobile
        ? MOBILE_DEFAULT_MIN_WIDTH
        : DEFAULT_MIN_WIDTH
      : mobile
        ? MOBILE_DEFAULT_MIN_HEIGHT
        : DEFAULT_MIN_HEIGHT;

  if (typeof value === 'number' || typeof value === 'undefined') {
    return typeof value === 'number' ? value : fallback;
  }

  const trimmed = value.trim();
  const percentMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)%$/);
  if (percentMatch) {
    const ratio = parseFloat(percentMatch[1]) / 100;
    return Math.max(0, Math.round((axis === 'w' ? viewportW : viewportH) * ratio));
  }
  const vwMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)vw$/i);
  if (vwMatch && axis === 'w') {
    const ratio = parseFloat(vwMatch[1]) / 100;
    return Math.max(0, Math.round(viewportW * ratio));
  }
  const vhMatch = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)vh$/i);
  if (vhMatch && axis === 'h') {
    const ratio = parseFloat(vhMatch[1]) / 100;
    return Math.max(0, Math.round(viewportH * ratio));
  }

  // Measure other CSS units using a temporary element
  const temp = document.createElement('div');
  temp.style.position = 'absolute';
  temp.style.visibility = 'hidden';
  if (axis === 'w') temp.style.width = trimmed;
  else temp.style.height = trimmed;
  document.body.appendChild(temp);
  const measured = axis === 'w' ? temp.getBoundingClientRect().width : temp.getBoundingClientRect().height;
  temp.remove();
  return measured || fallback;
}

// Compute initial numeric sizes and position for the draggable-resizable component
const mobile = isMobileDevice.value;
const savedSize = loadWindowSize(props.id, mobile);
const initialW =
  savedSize?.width ??
  computePixelSize(mobile ? (props.mobileWidth ?? MOBILE_DEFAULT_WIDTH) : (props.width ?? DEFAULT_WIDTH), 'w');
const initialH =
  savedSize?.height ??
  computePixelSize(mobile ? (props.mobileHeight ?? MOBILE_DEFAULT_HEIGHT) : (props.height ?? DEFAULT_HEIGHT), 'h');
const minWpx = computePixelSize(
  mobile ? (props.mobileMinWidth ?? MOBILE_DEFAULT_MIN_WIDTH) : (props.minWidth ?? DEFAULT_MIN_WIDTH),
  'w',
);
const minHpx = computePixelSize(
  mobile ? (props.mobileMinHeight ?? MOBILE_DEFAULT_MIN_HEIGHT) : (props.minHeight ?? DEFAULT_MIN_HEIGHT),
  'h',
);

const w = ref<number>(initialW);
const h = ref<number>(initialH);
const x = ref<number>(Math.max(0, Math.round(((window.innerWidth || 0) - initialW) / 2)));
const y = ref<number>(Math.max(0, Math.round(((window.innerHeight || 0) - initialH) / 2)));

const handles = computed<string[]>(() => {
  if (!props.resizable || collapsed.value) return [];
  return isMobileDevice.value ? ['br'] : ['tl', 'tm', 'tr', 'ml', 'mr', 'bl', 'bm', 'br'];
});

function bringToFront() {
  const refVal = dialogRef.value as any;
  const el = refVal && refVal.$el ? (refVal.$el as HTMLElement) : (refVal as HTMLElement | null);
  const target = el ?? document.querySelector<HTMLElement>(`.TH-floating-dialog[data-dialog-id="${props.id}"]`);
  if (!target) return;
  const dialogs = Array.from(document.querySelectorAll<HTMLElement>('.TH-floating-dialog'));
  const maxZ = dialogs.reduce((max, d) => {
    const z = parseInt(window.getComputedStyle(d).zIndex || '4000', 10);
    return Math.max(max, isNaN(z) ? 4000 : z);
  }, 4000);
  target.style.zIndex = String(maxZ + 1);
}

function handleClose() {
  emit('close');
}

function toggleCollapsed() {
  collapsed.value = !collapsed.value;
  emit('toggle', collapsed.value);
}

function onResizeEnd() {
  try {
    saveWindowSize(props.id, Math.round(w.value), Math.round(h.value), isMobileDevice.value);
  } catch (error) {
    log.warn('保存窗口大小失败:', error);
  }
}

function onHeaderPointerDown() {
  draggableNow.value = true;
  bringToFront();
}

onMounted(() => {
  try {
    bringToFront();
  } catch (err) {
    log.error('初始化浮窗失败', err);
  }
});

onMounted(() => {
  const onUp = () => {
    draggableNow.value = false;
  };
  window.addEventListener('pointerup', onUp, { passive: true });
  cleanupUpListener = () => window.removeEventListener('pointerup', onUp);
});

let cleanupUpListener: (() => void) | null = null;

onBeforeUnmount(() => {
  if (cleanupUpListener) cleanupUpListener();
});

// When collapsed state changes, optionally hide/show handles handled by v-if; nothing else needed
watch(
  () => collapsed.value,
  () => {
    // no-op; template controls handle visibility
  },
);
</script>

<style scoped>
.TH-floating-dialog .dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 12px;
  background-color: var(--SmartThemeQuoteColor);
  cursor: move;
  user-select: none;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  min-height: 32px;
}
.th-resize-handle {
  position: absolute;
  touch-action: none;
}
.th-n,
.th-s {
  left: 0;
  width: 100%;
  height: 6px;
}
.th-n {
  top: 0;
  cursor: n-resize;
}
.th-s {
  bottom: 0;
  cursor: s-resize;
}

.th-e,
.th-w {
  top: 0;
  height: 100%;
  width: 6px;
}
.th-e {
  right: 0;
  cursor: e-resize;
}
.th-w {
  left: 0;
  cursor: w-resize;
}

.th-ne,
.th-se,
.th-sw,
.th-nw {
  width: 12px;
  height: 12px;
}
.th-ne {
  top: 0;
  right: 0;
  cursor: ne-resize;
}
.th-se {
  bottom: 0;
  right: 0;
  cursor: se-resize;
}
.th-sw {
  bottom: 0;
  left: 0;
  cursor: sw-resize;
}
.th-nw {
  top: 0;
  left: 0;
  cursor: nw-resize;
}

.dialog-header {
  /* Improve drag on touch devices */
  touch-action: none;
}
</style>
