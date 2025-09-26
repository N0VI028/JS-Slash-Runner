<template>
  <!-- prettier-ignore-attribute -->
  <div
    class="
      flex w-full flex-wrap items-center justify-between rounded-[10px] border border-(--SmartThemeBorderColor) p-[5px]
    "
    data-type="script"
    data-sortable-item
  >
    <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>
    <div
      class="TH-script-item-name ml-0.5 flex-grow overflow-hidden"
      :style="{
        textDecoration: script.enabled ? 'none' : 'line-through',
        filter: script.enabled ? 'none' : 'grayscale(0.5)',
      }"
    >
      {{ script.name }}
    </div>
    <div class="flex flex-nowrap items-center gap-[5px]">
      <!-- 脚本开关 -->
      <div class="cursor-pointer" :class="{ enabled: script.enabled }" @click="script.enabled = !script.enabled">
        <i v-if="script.enabled" class="fa-solid fa-toggle-on"></i>
        <i v-else class="fa-solid fa-toggle-off"></i>
      </div>
      <DefineScriptIconTemplate v-slot="{ name, icon }">
        <div class="menu_button interactable mt-0! mr-0.5 mb-0! p-[5px]!" :title="name">
          <i class="fa-solid" :class="icon"></i>
        </div>
      </DefineScriptIconTemplate>
      <ReuseScriptIconTemplate name="查看脚本信息" icon="fa-info-circle" />
      <ReuseScriptIconTemplate name="编辑脚本" icon="fa-pencil" @click="openEditor" />
      <ReuseScriptIconTemplate name="移动到其他脚本库" icon="fa-exchange-alt" />
      <ReuseScriptIconTemplate name="导出脚本" icon="fa-file-export" />
      <ReuseScriptIconTemplate name="删除脚本" icon="fa-trash" />
    </div>
  </div>

  <Popup v-model="showEditor" :on-confirm="handleEditorConfirm">
    <Editor ref="editorRef" v-model="script" />
  </Popup>
</template>

<script setup lang="ts">
import Editor from '@/panel/script/Editor.vue';
import { Script } from '@/type/scripts';
import { createReusableTemplate } from '@vueuse/core';

const [DefineScriptIconTemplate, ReuseScriptIconTemplate] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script = defineModel<Script>({ required: true });

const showEditor = ref(false);
const editorRef = ref<InstanceType<typeof Editor>>();

const openEditor = () => {
  showEditor.value = true;
};

const handleEditorConfirm = () => {
  // TODO: 保存脚本
};
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
