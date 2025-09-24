<template>
  <div
    class="w-full rounded-md border border-(--SmartThemeBorderColor) bg-(--grey5020a)"
    data-type="folder"
    data-sortable-item
    data-folder
  >
    <div ref="folder_header_ref" class="TH-folder-header flex flex-nowrap items-center justify-between px-0.5">
      <!-- prettier-ignore-attribute -->
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true"> ☰ </span>
      <i class="fa-solid fa-folder-open ml-0.5"></i>
      <span class="TH-folder-name ml-0.5 flex-grow overflow-hidden">{{ script_folder.name }}</span>
      <div class="flex shrink-0 flex-nowrap items-center gap-0.25">
        <!-- 批量开关文件夹内脚本 -->
        <!-- prettier-ignore-attribute -->
        <div
          class="menu_button interactable mt-0! mr-0.5 mb-0!"
          :class="{ enabled: true }"
          title="批量开关文件夹内脚本"
        >
          <i class="fa-solid fa-toggle-on"></i>
        </div>
        <DefineScriptFolderIconTemplate v-slot="{ name, icon }">
          <div class="menu_button interactable mt-0! mr-0.5 mb-0!" :title="name">
            <i class="fa-solid" :class="icon"></i>
          </div>
        </DefineScriptFolderIconTemplate>
        <!-- 编辑文件夹 -->
        <ReuseScriptFolderIconTemplate name="编辑文件夹" icon="fa-pencil" />

        <!-- 导出文件夹 -->
        <ReuseScriptFolderIconTemplate name="导出文件夹" icon="fa-file-export" />

        <!-- 移动文件夹 -->
        <ReuseScriptFolderIconTemplate name="移动到其他脚本库" icon="fa-exchange-alt" />

        <!-- 删除文件夹 -->
        <ReuseScriptFolderIconTemplate name="删除文件夹" icon="fa-trash" />

        <!-- 展开/折叠 -->
        <ReuseScriptFolderIconTemplate name="展开或折叠文件夹" icon="fa-chevron-down" />
      </div>
    </div>
    <div ref="folder_content_ref" data-folder-content class="flex flex-col gap-0.5 p-0.5"></div>
  </div>
</template>

<script setup lang="ts">
import { ScriptFolder } from '@/type/scripts';
import { createReusableTemplate } from '@vueuse/core';
import { useSortable } from '@vueuse/integrations/useSortable';
import { ref } from 'vue';

const script_folder = defineModel<ScriptFolder>({ required: true });

const [DefineScriptFolderIconTemplate, ReuseScriptFolderIconTemplate] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const folder_header_ref = ref<HTMLElement | null>(null);
const folder_container_ref = ref<HTMLElement | null>(null);
const folderContentItems = ref<unknown[]>([]);

useSortable(folder_container_ref, folderContentItems, {
  group: { name: 'scripts', pull: true, put: true },
  handle: '.TH-handle',
  draggable: '[data-sortable-item]',
  onMove: event => {
    const to = event.to as HTMLElement | null;
    const dragged = event.dragged as HTMLElement | null;
    if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') return false;
    return true;
  },
});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";

.batch-mode.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent);
  border-color: var(--SmartThemeQuoteColor);
}

::has(.TH-script-toggle:not(.enabled)) .TH-folder-name {
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
  @apply cursor-pointer transition-colors duration-200 my-0.5;
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
