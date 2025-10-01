<template>
  <div
    class="w-full rounded-md border border-(--SmartThemeBorderColor) bg-(--grey5020a)"
    data-type="folder"
    data-folder
    :data-folder-id="script_folder.id"
  >
    <div class="flex w-full flex-wrap items-center justify-between p-0.5">
      <!-- prettier-ignore-attribute -->
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true"> ☰ </span>
      <i
        class="fa-solid fa-folder-open ml-0.5"
        :style="{ color: script_folder.color || 'var(--SmartThemeQuoteColor)' }"
      ></i>
      <span class="TH-folder-name ml-0.5 flex-grow overflow-hidden">{{ script_folder.name }}</span>
      <div class="flex shrink-0 flex-wrap items-center gap-0.25">
        <!-- prettier-ignore-attribute -->
        <div class="mt-0! mr-0.5 mb-0!" :class="{ enabled: true }" title="批量开关文件夹内脚本">
          <i class="fa-solid fa-toggle-on"></i>
        </div>
        <DefineScriptFolderButton v-slot="{ name, icon }">
          <div class="mt-0! mr-0.5 mb-0!" :title="name">
            <i class="fa-solid" :class="icon"></i>
          </div>
        </DefineScriptFolderButton>
        <SCriptFolderButton name="编辑文件夹" icon="fa-pencil" @click="openFolderEditor" />
        <SCriptFolderButton name="导出文件夹" icon="fa-file-export" />
        <SCriptFolderButton name="移动到其他脚本库" icon="fa-exchange-alt" />
        <SCriptFolderButton name="删除文件夹" icon="fa-trash" @click="openDeleteConfirm" />
        <SCriptFolderButton name="展开或折叠文件夹" icon="fa-chevron-down" />
      </div>
    </div>
    <VueDraggable
      v-model="script_folder.scripts"
      group="scripts"
      handle=".TH-handle"
      class="flex flex-grow flex-col gap-[5px] overflow-y-auto p-0.5"
      item-key="id"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      direction="vertical"
    >
      <div v-for="(_script, index) in script_folder.scripts" :key="script_folder.scripts[index].id">
        <ScriptItem v-model="script_folder.scripts[index]" @delete="handleScriptDelete" />
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import FolderEditor from '@/panel/script/FolderEditor.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { ScriptFolderForm } from '@/panel/script/type';
import { ScriptFolder } from '@/type/scripts';
import { createReusableTemplate } from '@vueuse/core';
import { VueDraggable } from 'vue-draggable-plus';

const [DefineScriptFolderButton, SCriptFolderButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script_folder = defineModel<ScriptFolder>({ required: true });

const props = defineProps<{ searchInput: string | RegExp }>();

const emit = defineEmits<{
  delete: [id: string];
}>();

// const filtered_scripts = computed(() => {
//   if (props.searchInput === '') {
//     return script_folder.value.scripts;
//   }
//   return script_folder.value.scripts.filter(script => includesOrTest(script.name, props.searchInput));
// });

const { open: openFolderEditor } = useModal({
  component: FolderEditor,
  attrs: {
    scriptFolder: script_folder.value,
    onSubmit: (result: ScriptFolderForm) => {
      _.assign(script_folder.value, result);
      return true;
    },
  },
});

const handleScriptDelete = (id: string) => {
  _.remove(script_folder.value.scripts, script => script.id === id);
};

const { open: openDeleteConfirm } = useModal({
  component: Popup,
  attrs: {
    buttons: [
      {
        name: '确定',
        shouldEmphasize: true,
        onClick: close => {
          emit('delete', script_folder.value.id);
          close();
        },
      },
      { name: '取消' },
    ],
  },
  slots: {
    default: `<div>确定要删除文件夹及其中所有脚本吗？此操作无法撤销。</div>`,
  },
});
</script>
