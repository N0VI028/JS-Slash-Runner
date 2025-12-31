<template>
  <div
    v-show="is_visible"
    ref="folder_item"
    class="w-full rounded-md border bg-(--grey5020a)"
    :class="[is_sorting_target ? 'border-solid! border-(--SmartThemeQuoteColor)' : 'border-(--SmartThemeBorderColor)']"
    data-type="folder"
    data-folder
    :data-folder-id="script_folder.id"
  >
    <div class="flex w-full cursor-pointer items-center justify-between p-0.5" @click="is_expanded = !is_expanded">
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true" @click.stop>☰</span>

      <i
        class="fa-solid ml-0.5"
        :class="[script_folder.icon || 'fa-folder', { 'opacity-50': !actually_enabled }]"
        :style="{ color: script_folder.color || 'var(--SmartThemeQuoteColor)' }"
      />
      <span class="ml-0.5 w-0 grow overflow-hidden" :class="{ 'opacity-50': !actually_enabled }">
        <Highlighter :query="search_input" :text-to-highlight="script_folder.name" />
      </span>
      <div class="flex shrink-0 flex-wrap items-center gap-0.25">
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
        <ScriptFolderButton name="移动文件夹" icon="fa-arrow-right-arrow-left" @click.stop="openMoveConfirm" />
        <ScriptFolderButton name="导出文件夹" icon="fa-file-export" @click.stop="exportFolder" />
        <ScriptFolderButton name="删除文件夹" icon="fa-trash" @click.stop="openDeleteConfirm" />
        <ScriptFolderButton name="展开或折叠文件夹" :icon="is_expanded ? 'fa-chevron-up' : 'fa-chevron-down'" />
      </div>
    </div>
    <VueDraggable
      v-show="is_expanded"
      v-model="script_folder.scripts"
      :group="{
        name: 'TH-scripts',
        pull: true,
        put: (_to, _from, draggedEl) => {
          const getType = (containerEl: HTMLElement) => {
            return containerEl?.dataset?.type;
          };
          const targetType = getType(draggedEl.querySelector('[data-type]') as HTMLElement);
          if (targetType === 'folder') return false;
          return true;
        },
      }"
      handle=".TH-handle"
      class="flex grow flex-col gap-[5px] overflow-y-auto p-0.5"
      :animation="150"
      direction="vertical"
      :disabled="search_input !== null"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      @start="during_sorting_item = true"
      @end="during_sorting_item = false"
    >
      <div v-for="(_script, index) in script_folder.scripts" :key="script_folder.scripts[index].id">
        <ScriptItem
          v-model="script_folder.scripts[index]"
          :target="props.target"
          :folder-enabled="script_folder.enabled"
          :search-input="search_input"
          @delete="handleScriptDelete"
          @move="handleMove"
        />
      </div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import FolderEditor from '@/panel/script/FolderEditor.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import TargetSelector from '@/panel/script/TargetSelector.vue';
import { ScriptFolderForm } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { ScriptFolder } from '@/type/scripts';
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate } from '@vueuse/core';
import { VueDraggable } from 'vue-draggable-plus';

const [DefineScriptFolderButton, ScriptFolderButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script_folder = defineModel<ScriptFolder>({ required: true });

const props = defineProps<{
  target: 'global' | 'character' | 'preset';
}>();

const emit = defineEmits<{
  delete: [id: string];
  move: [id: string, target: 'global' | 'character' | 'preset'];
}>();

const container_enabled = inject<Ref<boolean>>('container_enabled', ref(true));
const actually_enabled = computed(() => container_enabled.value && script_folder.value.enabled);

const search_input = inject<Ref<RegExp | null>>('search_input', ref(null));
const during_sorting_item = inject<Ref<boolean>>('during_sorting_item', ref(false));

const is_expanded = ref<boolean>(false);

const folder_item_ref = useTemplateRef<HTMLDivElement>('folder_item');
const { isOutside: is_outside } = useMouseInElement(folder_item_ref, {
  handleOutside: false,
  windowResize: false,
  windowScroll: false,
});
const is_sorting_target = computed(() => during_sorting_item.value && !is_outside.value);
watch(is_sorting_target, value => {
  if (value) {
    _.delay(() => {
      if (is_sorting_target.value) {
        is_expanded.value = true;
      }
    }, 500);
  }
});

const is_visible = computed(() => {
  if (search_input.value === null) {
    return true;
  }
  if (search_input.value.test(script_folder.value.name)) {
    return true;
  }
  return script_folder.value.scripts.some(script => search_input.value!.test(script.name));
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

const { open: openMoveConfirm } = useModal({
  component: TargetSelector,
  attrs: {
    target: props.target,
    onSubmit: (target: 'global' | 'character' | 'preset') => {
      if (props.target === target) {
        return;
      }
      emit('move', script_folder.value.id, target);
    },
  },
});

const handleMove = (id: string, target: 'global' | 'character' | 'preset') => {
  const removed = _.remove(script_folder.value.scripts, script => script.id === id);
  switch (target) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(...removed);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(...removed);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(...removed);
      break;
  }
};

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
            void downloadExport({ should_strip_data: false });
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
