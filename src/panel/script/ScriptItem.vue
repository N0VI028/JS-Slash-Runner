<template>
  <div
    class="flex w-full flex-wrap items-center justify-between rounded-md border border-(--SmartThemeBorderColor) px-0.5"
    data-type="script"
    data-sortable-item
  >
    <!-- prettier-ignore-attribute -->
    <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>
    <div class="TH-script-item-name ml-0.5 flex-grow overflow-hidden">{{ script.name }}</div>
    <div class="flex flex-nowrap items-center gap-[5px]">
      <!-- 脚本开关 -->
      <div class="TH-script-toggle" :class="{ enabled: true }">
        <i v-if="true" class="fa-solid fa-toggle-on"></i>
        <i v-else class="fa-solid fa-toggle-off"></i>
      </div>

      <!-- 脚本信息 -->
      <div class="TH-script-info menu_button interactable" title="查看脚本信息">
        <i class="fa-solid fa-info-circle"></i>
      </div>

      <!-- 编辑脚本 -->
      <div class="TH-edit-script menu_button interactable" title="编辑脚本">
        <i class="fa-solid fa-pencil"></i>
      </div>

      <!-- 在各个脚本库之间移动脚本 -->
      <div class="TH-script-move-type menu_button interactable" title="移动到其他脚本库">
        <i class="fa-solid fa-exchange-alt"></i>
      </div>

      <!-- 导出脚本 -->
      <div class="TH-export-script menu_button interactable" title="导出脚本">
        <i class="fa-solid fa-file-export"></i>
      </div>

      <!-- 删除脚本 -->
      <div class="TH-delete-script menu_button interactable" title="删除脚本">
        <i class="fa-solid fa-trash"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Script } from '@/type/scripts';

const script = defineModel<Script>({ required: true });
</script>

<style lang="scss" scoped>
.TH-batch-mode.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent);
  border-color: var(--SmartThemeQuoteColor);
}

:has(.TH-script-toggle:not(.enabled)) .TH-script-item-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.menu_button {
  width: calc(var(--icon-size) * 1.6);
  height: calc(var(--icon-size) * 1.6);
}

i {
  font-size: calc(var(--icon-size) * 0.95) !important;
}

.TH-script-toggle {
  cursor: pointer;
  padding: 5px;
}

.TH-script-toggle:hover {
  background-color: var(--SmartThemeBlurTintColor);
  border-radius: 5px;
}

.menu_button {
  cursor: pointer;
  padding: 3px;
  border-radius: 5px;
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
</style>
