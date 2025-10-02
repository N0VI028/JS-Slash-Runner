<template>
  <div
    v-show="isVisible"
    class="w-full rounded-md border border-(--SmartThemeBorderColor) bg-(--grey5020a)"
    data-type="folder"
    data-folder
    :data-folder-id="script_folder.id"
  >
    <div class="flex w-full cursor-pointer flex-wrap items-center justify-between p-0.5" @click="toggleFolderExpand">
      <!-- prettier-ignore-attribute -->
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true" @click.stop> ☰ </span>
      <i
        class="fa-solid ml-0.5"
        :class="script_folder.icon || 'fa-folder'"
        :style="{ color: script_folder.color || 'var(--SmartThemeQuoteColor)' }"
      ></i>
      <span class="TH-folder-name ml-0.5 flex-grow overflow-hidden">{{ script_folder.name }}</span>
      <div class="flex shrink-0 flex-wrap items-center gap-0.25">
        <!-- prettier-ignore-attribute -->
        <div
          class="mt-0! mr-0.5 mb-0! cursor-pointer"
          :class="{ enabled: allScriptsEnabled }"
          title="批量开关文件夹内脚本"
          @click.stop="toggleAllScripts"
        >
          <i v-if="allScriptsEnabled" class="fa-solid fa-toggle-on"></i>
          <i v-else class="fa-solid fa-toggle-off"></i>
        </div>
        <DefineScriptFolderButton v-slot="{ name, icon }">
          <div class="mt-0! mr-0.5 mb-0! cursor-pointer" :title="name">
            <i class="fa-solid" :class="icon"></i>
          </div>
        </DefineScriptFolderButton>
        <ScriptFolderButton name="编辑文件夹" icon="fa-pencil" @click.stop="openFolderEditor" />
        <ScriptFolderButton name="导出文件夹" icon="fa-file-export" @click.stop="exportFolder" />
        <ScriptFolderButton name="删除文件夹" icon="fa-trash" @click.stop="openDeleteConfirm" />
        <ScriptFolderButton name="展开或折叠文件夹" :icon="isExpanded ? 'fa-chevron-down' : 'fa-chevron-up'" />
      </div>
    </div>
    <VueDraggable
      v-show="isExpanded"
      v-model="script_folder.scripts"
      group="scripts"
      handle=".TH-handle"
      class="flex flex-grow flex-col gap-[5px] overflow-y-auto p-0.5"
      item-key="id"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      direction="vertical"
      :disabled="searchInput !== ''"
    >
      <div v-for="(_script, index) in script_folder.scripts" :key="script_folder.scripts[index].id">
        <ScriptItem
          ref="scriptItemRefs"
          v-model="script_folder.scripts[index]"
          :search-input="props.searchInput"
          @delete="handleScriptDelete"
        />
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
import { includesOrTest } from '@/util/search';
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate } from '@vueuse/core';
import JSZip from 'jszip';
import type { ComponentPublicInstance } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';

type ScriptExportPayload = {
  filename: string;
  data: string;
};

type ScriptItemExpose = {
  createExportPayload: () => Promise<ScriptExportPayload>;
};

type ScriptItemComponent = ComponentPublicInstance<Record<string, never>, ScriptItemExpose>;

const [DefineScriptFolderButton, ScriptFolderButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script_folder = defineModel<ScriptFolder>({ required: true });

const props = withDefaults(defineProps<{ searchInput?: string | RegExp }>(), {
  searchInput: '',
});

const emit = defineEmits<{
  delete: [id: string];
}>();

const scriptItemRefs = ref<Array<ScriptItemComponent | null>>([]);

/**
 * 【展开/折叠】文件夹展开状态
 */
const isExpanded = ref(false);

/**
 * 【展开/折叠】切换文件夹展开状态
 */
const toggleFolderExpand = () => {
  isExpanded.value = !isExpanded.value;
};

/**
 * 【搜索】判断文件夹是否可见
 */
const isVisible = computed(() => {
  if (props.searchInput === '') {
    return true;
  }
  if (includesOrTest(script_folder.value.name, props.searchInput)) {
    return true;
  }
  return script_folder.value.scripts.some(script => includesOrTest(script.name, props.searchInput));
});

const { open: openFolderEditor } = useModal({
  component: FolderEditor,
  attrs: {
    scriptFolder: script_folder.value,
    isEdit: true,
    onSubmit: (result: ScriptFolderForm) => {
      _.assign(script_folder.value, result);
      return true;
    },
  },
});

const handleScriptDelete = (id: string) => {
  _.remove(script_folder.value.scripts, script => script.id === id);
};

/**
 * 【批量开关】判断文件夹内所有脚本是否全部启用
 */
const allScriptsEnabled = computed(() => {
  if (script_folder.value.scripts.length === 0) {
    return false;
  }
  return script_folder.value.scripts.every(script => script.enabled);
});

/**
 * 【批量开关】切换文件夹内所有脚本的开关状态
 */
const toggleAllScripts = () => {
  const shouldEnable = !allScriptsEnabled.value;
  script_folder.value.scripts.forEach(script => {
    script.enabled = shouldEnable;
  });
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

const exportFolder = async () => {
  if (script_folder.value.scripts.length === 0) {
    toastr.warning('文件夹内没有脚本可导出');
    return;
  }

  try {
    const zip = new JSZip();
    let exportedCount = 0;

    for (let index = 0; index < script_folder.value.scripts.length; index += 1) {
      const instance = scriptItemRefs.value[index];
      if (!instance?.createExportPayload) {
        console.warn('脚本导出失败', script_folder.value.scripts[index]?.id);
        continue;
      }

      const { filename, data } = await instance.createExportPayload();
      zip.file(filename, data);
      exportedCount += 1;
    }

    if (exportedCount === 0) {
      toastr.warning('文件夹内没有可导出的脚本');
      return;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipName = await getSanitizedFilename(`${script_folder.value.name}.zip`);
    download(zipBlob, zipName, 'application/zip');
  } catch (error) {
    console.error(error);
    toastr.error('导出文件夹失败');
  }
};
</script>
