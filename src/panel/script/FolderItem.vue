<template>
  <div
    class="w-full rounded-md border border-(--SmartThemeBorderColor) bg-(--grey5020a)"
    data-type="folder"
    data-folder
  >
    <div ref="folderHeaderRef" class="TH-folder-header flex flex-nowrap items-center justify-between px-0.5">
      <!-- prettier-ignore-attribute -->
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true"> ☰ </span>
      <i class="fa-solid fa-folder-open ml-0.5"></i>
      <span class="TH-folder-name ml-0.5 flex-grow overflow-hidden"> 占位文件夹 </span>
      <div class="flex flex-nowrap items-center gap-[5px]">
        <!-- 批量开关文件夹内脚本 -->
        <!-- prettier-ignore-attribute -->
        <div
          class="menu_button interactable cursor-pointer p-0.5 hover:bg-(--SmartThemeBlurTintColor)"
          :class="{ enabled: true }"
          title="批量开关文件夹内脚本"
        >
          <i class="fa-solid fa-toggle-on"></i>
        </div>

        <!-- 编辑文件夹 -->
        <div class="menu_button interactable mr-0.5" title="编辑文件夹">
          <i class="fa-solid fa-pencil"></i>
        </div>

        <!-- 导出文件夹 -->
        <div class="menu_button interactable mr-0.5" title="导出文件夹">
          <i class="fa-solid fa-file-export"></i>
        </div>

        <!-- 移动文件夹 -->
        <div class="menu_button interactable" title="移动到其他脚本库">
          <i class="fa-solid fa-exchange-alt"></i>
        </div>

        <!-- 删除文件夹 -->
        <div class="menu_button interactable" title="删除文件夹">
          <i class="fa-solid fa-trash"></i>
        </div>

        <!-- 展开/折叠 -->
        <div class="menu_button interactable" title="展开或折叠文件夹">
          <i class="fa-solid fa-chevron-down"></i>
        </div>
      </div>
    </div>
    <div ref="folderContentRef" data-folder-content class="flex flex-col gap-0.5 p-0.5"></div>
  </div>
</template>

<script setup lang="ts">
import { useSortable } from '@vueuse/integrations/useSortable';
import { ref } from 'vue';

type SortableMoveEvent = { to: Element; dragged: Element };

const folderHeaderRef = ref<HTMLElement | null>(null);
const folderContentRef = ref<HTMLElement | null>(null);
const folderContentItems = ref<unknown[]>([]);

useSortable(folderContentRef, folderContentItems, {
  group: { name: 'scripts', pull: true, put: true },
  handle: '.TH-handle',
  draggable: '[data-sortable-item]',
  onMove: (evt: SortableMoveEvent) => {
    const to = evt.to as HTMLElement | null;
    const dragged = evt.dragged as HTMLElement | null;
    if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') return false;
    return true;
  },
});
</script>

<style lang="scss" scoped>
.batch-mode.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent);
  border-color: var(--SmartThemeQuoteColor);
}

:has(.TH-script-toggle:not(.enabled)) .TH-folder-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

[data-folder-content] {
  border-top: 1px solid var(--SmartThemeBorderColor);
}

[data-folder-content] :deep([data-sortable-item]) {
  background-color: var(--SmartThemeBlurTintColor);
}

[data-folder-content] :deep([data-sortable-item]:last-child) {
  margin-bottom: 0;
}

.menu_button {
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
  background-color: transparent;
  border: none;
}

.menu_button:hover {
  background-color: var(--SmartThemeBlurTintColor);
}

/* 拖拽状态样式 */
.dragging-source {
  opacity: 0.6;
}

.ui-dragging {
  opacity: 0.8;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 文件夹头部交互 */
.TH-folder-header {
  cursor: pointer;
  transition: background-color 0.2s;
}

.folder-slide-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.folder-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.folder-slide-enter-to,
.folder-slide-leave-from {
  max-height: 1000px; /* 足够大的值 */
  opacity: 1;
  transform: translateY(0);
}

/* 拖拽状态样式 */
[data-folder].dragging-source {
  opacity: 0.6;
}

[data-folder].ui-dragging {
  opacity: 0.8;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

[data-folder].folder-drag-target .TH-folder-header {
  border-color: var(--SmartThemeQuoteColor);
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 15%, transparent);
}
</style>
