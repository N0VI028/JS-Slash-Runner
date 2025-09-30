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
      <DefineToolButton v-slot="{ name, icon }">
        <div class="menu_button interactable mt-0! mr-0.5 mb-0! p-[5px]!" :title="name">
          <i class="fa-solid" :class="icon"></i>
        </div>
      </DefineToolButton>
      <ToolButton name="查看脚本信息" icon="fa-info-circle" />
      <ToolButton name="编辑脚本" icon="fa-pencil" @click="openScriptEditor" />
      <ToolButton name="导出脚本" icon="fa-file-export" />
      <ToolButton name="删除脚本" icon="fa-trash" @click="openDeleteConfirm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import ScriptEditor from '@/panel/script/ScriptEditor.vue';
import { ScriptForm } from '@/panel/script/type';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes/script';
import { Script } from '@/type/scripts';
import { createReusableTemplate } from '@vueuse/core';

const [DefineToolButton, ToolButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script = defineModel<Script>({ required: true });

const emit = defineEmits<{
  delete: [id: string];
}>();

const { open: openScriptEditor } = useModal({
  component: ScriptEditor,
  attrs: {
    script: script.value,
    onSubmit: (result: ScriptForm) => {
      const should_reload =
        script.value.enabled && !_.isEqual(_.pick(script.value, 'content', 'data'), _.pick(result, 'content', 'data'));
      _.assign(script.value, result);
      if (should_reload) {
        useScriptIframeRuntimesStore().reload(script.value.id);
      }
    },
  },
});

const { open: openDeleteConfirm } = useModal({
  component: Popup,
  attrs: {
    buttons: [
      {
        name: '确定',
        shouldEmphasize: true,
        onClick: () => {
          emit('delete', script.value.id);
          return true;
        },
      },
      { name: '取消', onClick: () => true },
    ],
  },
  slots: {
    default: `<div>确定要删除脚本吗？此操作无法撤销。</div>`,
  },
});
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
