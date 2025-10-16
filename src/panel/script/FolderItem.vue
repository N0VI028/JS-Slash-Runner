<template>
  <div
    v-show="is_visible"
    class="w-full rounded-md border border-(--SmartThemeBorderColor) bg-(--grey5020a)"
    data-type="folder"
    data-folder
    :data-folder-id="script_folder.id"
  >
    <div class="flex w-full cursor-pointer items-center justify-between p-0.5" @click="is_expanded = !is_expanded">
      <!-- 批量模式下显示复选框，正常模式显示拖拽手柄 -->
      <div v-if="props.isBatchMode" class="flex items-center" @click.stop>
        <input
          type="checkbox"
          :checked="props.isSelected"
          class="cursor-pointer"
          @change="emit('toggle-selection', script_folder.id)"
        />
      </div>
      <!-- prettier-ignore-attribute -->
      <span v-else class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true" @click.stop>
        ☰
      </span>

      <i
        class="fa-solid ml-0.5"
        :class="script_folder.icon || 'fa-folder'"
        :style="{ color: script_folder.color || 'var(--SmartThemeQuoteColor)' }"
      ></i>
      <span
        class="TH-folder-name ml-0.5 flex-grow overflow-hidden"
        :style="{
          textDecoration: script_folder.enabled ? 'none' : 'line-through',
          filter: script_folder.enabled ? 'none' : 'grayscale(0.5)',
        }"
      >
        <Highlighter :query="props.searchInput" :text-to-highlight="script_folder.name" />
      </span>
      <div v-show="!props.isBatchMode" class="flex shrink-0 flex-wrap items-center gap-0.25">
        <!-- prettier-ignore-attribute -->
        <div
          class="mt-0! mr-0.5 mb-0! cursor-pointer"
          :class="{ enabled: script_folder.enabled }"
          title="批量开关文件夹内脚本"
          @click.stop="script_folder.enabled = !script_folder.enabled"
        >
          <i class="fa-solid" :class="[script_folder.enabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
        </div>
        <DefineScriptFolderButton v-slot="{ icon }">
          <div class="mt-0! mr-0.5 mb-0! cursor-pointer">
            <i class="fa-solid" :class="icon"></i>
          </div>
        </DefineScriptFolderButton>
        <ScriptFolderButton name="编辑文件夹" icon="fa-pencil" @click.stop="openFolderEditor" />
        <ScriptFolderButton name="导出文件夹" icon="fa-file-export" @click.stop="exportFolder" />
        <ScriptFolderButton name="删除文件夹" icon="fa-trash" @click.stop="openDeleteConfirm" />
        <ScriptFolderButton name="展开或折叠文件夹" :icon="is_expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </div>
      <!-- 批量模式下显示展开/折叠按钮 -->
      <div v-if="props.isBatchMode" class="mr-0.5 cursor-pointer" @click.stop>
        <i class="fa-solid" :class="is_expanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </div>
    </div>
    <VueDraggable
      v-show="is_expanded"
      v-model="script_folder.scripts"
      group="scripts"
      handle=".TH-handle"
      class="flex flex-grow flex-col gap-[5px] overflow-y-auto p-0.5"
      item-key="id"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      direction="vertical"
      :disabled="searchInput !== null"
    >
      <div v-for="(_script, index) in script_folder.scripts" :key="script_folder.scripts[index].id">
        <ScriptItem
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
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate } from '@vueuse/core';
import { VueDraggable } from 'vue-draggable-plus';

const [DefineScriptFolderButton, ScriptFolderButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script_folder = defineModel<ScriptFolder>({ required: true });

const props = withDefaults(
  defineProps<{
    searchInput?: RegExp | null;
    isBatchMode?: boolean;
    isSelected?: boolean;
    isExpanded?: boolean;
  }>(),
  {
    searchInput: null,
    isBatchMode: false,
    isSelected: false,
    isExpanded: false,
  },
);

const emit = defineEmits<{
  delete: [id: string];
  'toggle-selection': [id: string];
  'update:is-expanded': [expanded: boolean];
}>();

const is_expanded = computed({
  get: () => props.isExpanded,
  set: (value: boolean) => {
    emit('update:is-expanded', value);
  },
});

const is_visible = computed(() => {
  if (props.searchInput === null) {
    return true;
  }
  if (props.searchInput.test(script_folder.value.name)) {
    return true;
  }
  return script_folder.value.scripts.some(script => props.searchInput!.test(script.name));
});

const { open: openFolderEditor } = useModal({
  component: FolderEditor,
  attrs: {
    scriptFolder: script_folder.value,
    onSubmit: (result: ScriptFolderForm) => {
      _.assign(script_folder.value, result);
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
        name: t`确定`,
        shouldEmphasize: true,
        onClick: close => {
          emit('delete', script_folder.value.id);
          close();
        },
      },
      { name: t`取消` },
    ],
  },
  slots: {
    default: t`<div>确定要删除文件夹及其中所有脚本吗？此操作无法撤销</div>`,
  },
});

type ScriptExportOptions = {
  should_strip_data: boolean;
};

type ScriptFolderExportPayload = {
  filename: string;
  data: string;
};

const createExportPayload = async (option: ScriptExportOptions): Promise<ScriptFolderExportPayload> => {
  const to_export = klona(script_folder.value);
  if (option.should_strip_data) {
    to_export.scripts.forEach(script => {
      _.set(script, 'data', {});
    });
  }
  const filename = await getSanitizedFilename(t`酒馆助手脚本-${to_export.name}.json`);
  const data = JSON.stringify(to_export, null, 2);
  return { filename, data };
};

const downloadExport = async (options: ScriptExportOptions) => {
  const { filename, data } = await createExportPayload(options);
  download(data, filename, 'application/json');
};

const exportFolder = async () => {
  const has_data = script_folder.value.scripts.some(script => !_.isEmpty(script.data));
  if (!has_data) {
    downloadExport({ should_strip_data: false });
    return;
  }

  useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`包含数据导出`,
          onClick: close => {
            void downloadExport({ should_strip_data: true });
            close();
          },
        },
        {
          name: t`清除数据导出`,
          shouldEmphasize: true,
          onClick: close => {
            void downloadExport({ should_strip_data: true });
            close();
          },
        },
        { name: t`取消`, onClick: close => close() },
      ],
    },
    slots: {
      // TODO: 显示脚本变量有什么?
      default: t`<div>'${script_folder.value.name}' 文件夹中脚本包含脚本变量, 是否要清除? 如有 API Key 等敏感数据，注意清除</div>`,
    },
  }).open();
};
</script>
