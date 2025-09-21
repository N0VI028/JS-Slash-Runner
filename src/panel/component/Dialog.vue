<template>
  <!-- prettier-ignore -->
  <div
    ref="dialogRef"
    :style="dialogStyle"
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
      >
        <div class="flex-1 text-sm font-bold text-(--SmartThemeBodyColor)">{{ title }}</div>
        <div class="flex flex-shrink-0 gap-1">
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
      <div class="flex flex-1 flex-col overflow-hidden">
        <slot>
        </slot>
      </div>
    </div>
    
    <!-- 调整大小手柄 - 不可见，但可拖动（桌面与移动端均可用） -->
    <!-- 右边缘 -->
    <div
      class="absolute top-0 right-0 bottom-0 z-10 w-1 cursor-ew-resize opacity-0"
      @mousedown="startResize('right', $event)"
      @touchstart="startResize('right', $event)"
    ></div>
    
    <!-- 底边缘 -->
    <div
      class="absolute right-0 bottom-0 left-0 z-10 h-1 cursor-ns-resize opacity-0"
      @mousedown="startResize('bottom', $event)"
      @touchstart="startResize('bottom', $event)"
    ></div>
    
    <!-- 右下角 -->
    <div
      class="absolute right-0 bottom-0 z-10 h-3 w-3 cursor-nw-resize opacity-0"
      @mousedown="startResize('bottom-right', $event)"
      @touchstart="startResize('bottom-right', $event)"
    ></div>
    
    <!-- 左边缘 -->
    <div
      class="absolute top-0 bottom-0 left-0 z-10 w-1 cursor-ew-resize opacity-0"
      @mousedown="startResize('left', $event)"
      @touchstart="startResize('left', $event)"
    ></div>
    
    <!-- 顶边缘 -->
    <div
      class="absolute top-0 right-0 left-0 z-10 h-1 cursor-ns-resize opacity-0"
      @mousedown="startResize('top', $event)"
      @touchstart="startResize('top', $event)"
    ></div>
    
    <!-- 左上角 -->
    <div
      class="absolute top-0 left-0 z-10 h-3 w-3 cursor-nw-resize opacity-0"
      @mousedown="startResize('top-left', $event)"
      @touchstart="startResize('top-left', $event)"
    ></div>
    
    <!-- 右上角 -->
    <div
      class="absolute top-0 right-0 z-10 h-3 w-3 cursor-ne-resize opacity-0"
      @mousedown="startResize('top-right', $event)"
      @touchstart="startResize('top-right', $event)"
    ></div>
    
    <!-- 左下角 -->
    <div
      class="absolute bottom-0 left-0 z-10 h-3 w-3 cursor-ne-resize opacity-0"
      @mousedown="startResize('bottom-left', $event)"
      @touchstart="startResize('bottom-left', $event)"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';
import { useDraggable, useWindowSize } from '@vueuse/core';
import { computed, ref, useTemplateRef } from 'vue';

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
  }>(),
  {
    width: '50vw',
    height: '70vh',
    mobileWidth: '90vw',
    mobileHeight: '70vh',
    title: '',
  },
);
const emit = defineEmits<{ (e: 'close'): void }>();

// 获取窗口尺寸（用于初始居中与 vw 转换）
const { width: windowWidth } = useWindowSize();

const dialogRef = useTemplateRef<HTMLElement>('dialogRef');
const headerRef = useTemplateRef<HTMLElement>('headerRef');

// 当前对话框的实际尺寸
const dialogSize = ref({
  width: 0,
  height: 0,
});

// 初始化对话框尺寸
const initializeSize = () => {
  const targetWidth = isMobile() ? props.mobileWidth : props.width;
  const targetHeight = isMobile() ? props.mobileHeight : props.height;

  // 转换尺寸值为像素
  const convertToPixels = (value: string | number) => {
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
    return parseFloat(value) || 400;
  };

  dialogSize.value.width = convertToPixels(targetWidth);
  dialogSize.value.height = convertToPixels(targetHeight);
};

// 仅在打开时确定一次尺寸
initializeSize();

// 拖动功能 - 只有头部可以拖动
const { x, y } = useDraggable(headerRef, {
  initialValue: {
    x: Math.max(0, (windowWidth.value - dialogSize.value.width) / 2),
    y: 50,
  },
  preventDefault: true,
});

// 调整大小状态
const isResizing = ref(false);
const resizeDirection = ref<string>('');

/**
 * 从鼠标或触摸事件中提取坐标
 * @param e 鼠标或触摸事件
 */
function getClientPoint(e: MouseEvent | TouchEvent) {
  if (e instanceof TouchEvent) {
    const touch = e.touches[0] || (e as any).changedTouches?.[0];
    return {
      clientX: touch ? touch.clientX : 0,
      clientY: touch ? touch.clientY : 0,
    };
  }
  const me = e as MouseEvent;
  return { clientX: me.clientX, clientY: me.clientY };
}

// 鼠标/触摸按下开始调整大小（移动端也启用）
const startResize = (direction: string, event: MouseEvent | TouchEvent) => {
  event.preventDefault();
  event.stopPropagation();

  isResizing.value = true;
  resizeDirection.value = direction;

  const startPoint = getClientPoint(event);
  const startX = startPoint.clientX;
  const startY = startPoint.clientY;
  const startWidth = dialogSize.value.width;
  const startHeight = dialogSize.value.height;
  const startLeft = x.value;
  const startTop = y.value;

  const handlePointerMove = (e: MouseEvent | TouchEvent) => {
    const point = getClientPoint(e);
    const deltaX = point.clientX - startX;
    const deltaY = point.clientY - startY;

    let newWidth = startWidth;
    let newHeight = startHeight;

    if (direction.includes('right')) {
      newWidth = Math.max(300, startWidth + deltaX);
    }
    if (direction.includes('left')) {
      newWidth = Math.max(300, startWidth - deltaX);
      x.value = startLeft + (startWidth - newWidth);
    }
    if (direction.includes('bottom')) {
      newHeight = Math.max(200, startHeight + deltaY);
    }
    if (direction.includes('top')) {
      newHeight = Math.max(200, startHeight - deltaY);
      y.value = startTop + (startHeight - newHeight);
    }

    dialogSize.value.width = newWidth;
    dialogSize.value.height = newHeight;

    // 边界保护，避免位置为负
    if (!Number.isNaN(x.value)) x.value = Math.max(0, x.value);
    if (!Number.isNaN(y.value)) y.value = Math.max(0, y.value);
  };

  const handlePointerUp = () => {
    isResizing.value = false;
    resizeDirection.value = '';
    document.removeEventListener('mousemove', handlePointerMove as any);
    document.removeEventListener('mouseup', handlePointerUp as any);
    document.removeEventListener('touchmove', handlePointerMove as any);
    document.removeEventListener('touchend', handlePointerUp as any);
    document.removeEventListener('touchcancel', handlePointerUp as any);
  };

  document.addEventListener('mousemove', handlePointerMove as any);
  document.addEventListener('mouseup', handlePointerUp as any);
  document.addEventListener('touchmove', handlePointerMove as any, { passive: false });
  document.addEventListener('touchend', handlePointerUp as any);
  document.addEventListener('touchcancel', handlePointerUp as any);
};

// 计算对话框样式
const dialogStyle = computed(() => ({
  position: 'fixed' as const,
  left: `${x.value}px`,
  top: `${y.value}px`,
  width: `${dialogSize.value.width}px`,
  height: `${dialogSize.value.height}px`,
  zIndex: 10000,
  userSelect: isResizing.value ? ('none' as const) : ('auto' as const),
}));

function onClose() {
  emit('close');
}
</script>
