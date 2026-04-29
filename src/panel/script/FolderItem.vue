<template>
  <div
    v-show="is_visible"
    ref="folder_item"
    class="w-full rounded-[10px] border bg-(--grey5020a)"
    :class="[is_sorting_target ? 'border-solid! border-(--SmartThemeQuoteColor)' : 'border-(--SmartThemeBorderColor)']"
    data-type="folder"
    data-folder
    :data-folder-id="script_folder.id"
  >
    <div class="flex w-full cursor-pointer items-center justify-between p-[5px]" @click="is_expanded = !is_expanded">
      <span class="TH-handle cursor-grab select-none active:cursor-grabbing" aria-hidden="true" @click.stop>☰</span>

      <i
        class="fa-solid ml-0.5"
        :class="[script_folder.icon || 'fa-folder', { 'opacity-50': !actually_enabled }]"
        :style="{ color: script_folder.color || 'var(--SmartThemeQuoteColor)' }"
      />
      <span class="ml-0.5 w-0 grow overflow-hidden" :class="{ 'opacity-50': !actually_enabled }">
        <Highlighter :query="search_input" :text-to-highlight="script_folder.name" />
      </span>
      <div class="flex shrink-0 flex-wrap items-center">
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
          <div class="flex cursor-pointer items-center justify-center p-[6px] leading-none">
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
          @move="handleScriptMove"
          @copy="handleScriptCopy"
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
import { getScriptsStoreByType } from '@/store/scripts';
import { ScriptFolder } from '@/type/scripts';
import { download, getSanitizedFilename, uuidv4 } from '@sillytavern/scripts/utils';
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

/**
 * 文件夹导出时可选择是否保留变量与按钮配置。
 */
type ScriptExportOptions = {
  scripts: Record<string, { include_data: boolean; include_button: boolean }>;
};

type ScriptFolderExportPayload = {
  filename: string;
  data: string;
};

/**
 * 根据导出选项构建文件夹导出内容。
 */
const createExportPayload = async (option: ScriptExportOptions): Promise<ScriptFolderExportPayload> => {
  const to_export = klona(script_folder.value);
  to_export.scripts.forEach(script => {
    const script_option = option.scripts[script.id];
    if (!script_option) {
      return;
    }
    _.set(script, 'export_with.data', script_option.include_data);
    _.set(script, 'export_with.button', script_option.include_button);
    if (!script_option.include_data) {
      _.set(script, 'data', {});
    }
    if (!script_option.include_button) {
      _.set(script, 'button.buttons', []);
    }
  });
  const filename = await getSanitizedFilename(t`酒馆助手脚本文件夹-${to_export.name}.json`);
  const data = JSON.stringify(to_export, null, 2);
  return { filename, data };
};

/**
 * 执行文件夹导出下载。
 */
const downloadExport = async (options: ScriptExportOptions) => {
  const { filename, data } = await createExportPayload(options);
  download(data, filename, 'application/json');
};

/**
 * 打开导出确认弹窗，按文件夹内脚本实际内容显示复选框。
 */
const exportFolder = async () => {
  const exportable_scripts = script_folder.value.scripts.filter(script => {
    return !_.isEmpty(script.data) || script.button.buttons.length > 0;
  });
  if (exportable_scripts.length === 0) {
    void downloadExport({ scripts: {} });
    return;
  }

  const selections = reactive<Record<string, { include_data: boolean; include_button: boolean }>>({});
  exportable_scripts.forEach(script => {
    selections[script.id] = {
      include_data: !_.isEmpty(script.data),
      include_button: script.button.buttons.length > 0,
    };
  });

  useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`确认`,
          shouldEmphasize: true,
          onClick: close => {
            void downloadExport({ scripts: { ...selections } });
            close();
          },
        },
        { name: t`取消`, onClick: close => close() },
      ],
      width: 'normal',
    },
    slots: {
      default: () =>
        h('div', { class: 'flex w-full max-w-[92vw] flex-col gap-1 p-1.5 text-left' }, [
          h('div', `'${script_folder.value.name}' ${t`文件夹导出的脚本将包含以下内容，请确认是否保留：`}`),
          h('div', { class: 'max-h-[45vh] overflow-y-auto overflow-x-hidden pr-1' }, [
            ...exportable_scripts.flatMap(script => {
              const has_data = !_.isEmpty(script.data);
              const has_button = script.button.buttons.length > 0;
              return [
                h('div', { class: 'mb-1 border border-(--SmartThemeBorderColor) p-1' }, [
                  h('div', { class: 'mb-0.5 break-all text-sm font-bold' }, script.name),
                  h('div', { class: 'flex flex-row flex-wrap gap-4' }, [
                    ...(has_data
                      ? [
                          h('label', { class: 'flex cursor-pointer items-center gap-0.5' }, [
                            h('input', {
                              type: 'checkbox',
                              checked: selections[script.id].include_data,
                              onInput: (event: Event) => {
                                selections[script.id].include_data = (event.target as HTMLInputElement).checked;
                              },
                            }),
                            h('span', t`脚本变量`),
                          ]),
                        ]
                      : []),
                    ...(has_button
                      ? [
                          h('label', { class: 'flex cursor-pointer items-center gap-0.5' }, [
                            h('input', {
                              type: 'checkbox',
                              checked: selections[script.id].include_button,
                              onInput: (event: Event) => {
                                selections[script.id].include_button = (event.target as HTMLInputElement).checked;
                              },
                            }),
                            h('span', t`按钮`),
                          ]),
                        ]
                      : []),
                  ]),
                ]),
              ];
            }),
          ]),
        ]),
    },
  }).open();
};

const handleScriptDelete = (id: string) => {
  _.remove(script_folder.value.scripts, script => script.id === id);
};

// TODO: 这里的和 Container 的明显重复, 应该合并
const handleScriptMove = (id: string, target: 'global' | 'character' | 'preset') => {
  const removed = _.remove(script_folder.value.scripts, script => script.id === id);
  getScriptsStoreByType(target).script_trees.push(...removed);
};

// TODO: 这里的和 Container 的明显重复, 应该合并
const handleScriptCopy = (id: string, target: 'global' | 'character' | 'preset') => {
  const script = _.find(script_folder.value.scripts, script => script.id === id);
  if (!script) {
    return;
  }
  const copied_script = klona(script);
  copied_script.id = uuidv4();
  copied_script.enabled = false;
  getScriptsStoreByType(target).script_trees.push(copied_script);
};
</script>
