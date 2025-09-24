<template>
  <!-- prettier-ignore-attribute -->
  <div
    class="
      flex w-full flex-wrap items-center justify-between rounded-md border border-(--SmartThemeBorderColor) px-0.5
      py-0.5
    "
    data-type="script"
    data-sortable-item
  >
    <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>
    <div class="TH-script-item-name ml-0.5 flex-grow overflow-hidden">{{ script.name }}</div>
    <div class="flex flex-nowrap items-center gap-0.5">
      <!-- 脚本开关 -->
      <div class="cursor-pointer" :class="{ enabled: true }">
        <i v-if="true" class="fa-solid fa-toggle-on"></i>
        <i v-else class="fa-solid fa-toggle-off"></i>
      </div>
      <DefineScriptIconTemplate v-slot="{ name, icon }">
        <div class="menu_button interactable mt-0! mr-0.5 mb-0!" :title="name">
          <i class="fa-solid" :class="icon"></i>
        </div>
      </DefineScriptIconTemplate>
      <ReuseScriptIconTemplate name="查看脚本信息" icon="fa-info-circle" />
      <ReuseScriptIconTemplate name="编辑脚本" icon="fa-pencil" />
      <ReuseScriptIconTemplate name="移动到其他脚本库" icon="fa-exchange-alt" />
      <ReuseScriptIconTemplate name="导出脚本" icon="fa-file-export" />
      <ReuseScriptIconTemplate name="删除脚本" icon="fa-trash" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core';

const [DefineScriptIconTemplate, ReuseScriptIconTemplate] = createReusableTemplate<{
  name: string;
  icon: string;
}>();
</script>

<script setup lang="ts">
import { Script } from '@/type/scripts';

const script = defineModel<Script>({ required: true });
</script>

<style lang="scss" scoped>
@reference "tailwindcss";

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
