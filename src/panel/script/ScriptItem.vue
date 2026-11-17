<template>
  <!-- prettier-ignore-attribute -->
  <div
    v-show="is_visible"
    class="
      flex w-full items-center justify-between rounded-[10px] border border-(--SmartThemeBorderColor)
      bg-(--SmartThemeBlurTintColor) p-[5px]
    "
    data-type="script"
    :data-script-id="script.id"
  >
    <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>

    <div class="ml-0.5 w-0 grow overflow-hidden" :class="{ 'opacity-50': !actually_enabled }">
      <Highlighter :query="search_input">{{ script.name }}</Highlighter>
    </div>
    <div class="flex flex-nowrap items-center gap-[5px]">
      <!-- 脚本开关 -->
      <div class="cursor-pointer" :class="{ enabled: script.enabled }" @click="script.enabled = !script.enabled">
        <i class="fa-solid" :class="[script.enabled ? 'fa-toggle-on' : 'fa-toggle-off']" />
      </div>
      <DefineToolButton v-slot="{ name, icon }">
        <div class="menu_button interactable my-0! mr-0.5 p-[5px]!" :title="name">
          <i class="fa-solid" :class="icon"></i>
        </div>
      </DefineToolButton>
      <ToolButton :name="t`查看作者备注`" icon="fa-info-circle" @click="openScriptInfo" />
      <ToolButton :name="t`编辑脚本`" icon="fa-pencil" @click="openScriptEditor" />
      <ToolButton
        v-show="!showMoreActions"
        ref="moreActionsRef"
        :name="t`更多操作`"
        icon="fa-ellipsis-h"
        @click="showMoreActions = true"
      />
      <ToolButton v-show="showMoreActions" :name="t`复制脚本`" icon="fa-copy" @click="copyScript" />
      <ToolButton
        v-show="showMoreActions"
        :name="t`移动脚本`"
        icon="fa-arrow-right-arrow-left"
        @click="openMoveConfirm"
      />
      <ToolButton v-show="showMoreActions" :name="t`导出脚本`" icon="fa-file-export" @click="exportScript" />
      <ToolButton :name="t`删除脚本`" icon="fa-trash" @click="openDeleteConfirm" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import ScriptEditor from '@/panel/script/ScriptEditor.vue';
import ScriptExport from '@/panel/script/ScriptExport.vue';
import TargetSelector from '@/panel/script/TargetSelector.vue';
import { useWorldbookSelectionLock } from '@/panel/script/use_worldbook_selection_lock';
import { ScriptExportOptions, ScriptForm } from '@/panel/script/type';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes/script';
import { getWorldbookScriptRuntimeId, useWorldbookScriptsStore } from '@/store/worldbook_scripts';
import { Script } from '@/type/scripts';
import { renderMarkdown } from '@/util/tavern';
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate, onClickOutside } from '@vueuse/core';

const showMoreActions = ref(false);
const moreActionsRef = useTemplateRef<HTMLDivElement>('moreActionsRef');
onClickOutside(moreActionsRef, () => {
  showMoreActions.value = false;
});

const [DefineToolButton, ToolButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script = defineModel<Script>({ required: true });
const props = withDefaults(
  defineProps<{
    target: 'global' | 'character' | 'preset' | 'worldbook';
    folderEnabled?: boolean;
  }>(),
  { folderEnabled: true },
);

const emit = defineEmits<{
  delete: [id: string];
  move: [id: string, target: 'global' | 'character' | 'preset' | 'worldbook'];
  copy: [id: string, target: 'global' | 'character' | 'preset' | 'worldbook'];
}>();

const worldbook_scripts = useWorldbookScriptsStore();
const runtime_id = computed(() =>
  props.target === 'worldbook'
    ? getWorldbookScriptRuntimeId(worldbook_scripts.selected_name, script.value.id)
    : script.value.id,
);
const { lock: lockWorldbookSelection, unlock: unlockWorldbookSelection } = useWorldbookSelectionLock();

const container_enabled = inject<Ref<boolean>>('container_enabled', ref(true));
const actually_enabled = computed(() => container_enabled.value && props.folderEnabled && script.value.enabled);

const search_input = inject<Ref<RegExp | null>>('search_input', ref(null));

const is_visible = computed(() => {
  return search_input.value === null || search_input.value.test(script.value.name);
});

const { open: openScriptEditorModal } = useModal({
  component: ScriptEditor,
  attrs: {
    script: script.value,
    target: props.target,
    onClosed: unlockWorldbookSelection,
    onSubmit: (result: ScriptForm) => {
      const should_reload =
        script.value.enabled &&
        (!_.isEqual(_.pick(script.value, 'content', 'data'), _.pick(result, 'content', 'data')) ||
          !_.isEqual(
            script.value.button.buttons.map(button => button.name).toSorted(),
            result.button.buttons.map(button => button.name).toSorted(),
          ));
      _.assign(script.value, result);
      if (should_reload) {
        useScriptIframeRuntimesStore().reload(runtime_id.value);
      }
    },
  },
});

function openScriptEditor() {
  lockWorldbookSelection();
  openScriptEditorModal();
}

const openScriptInfo = () =>
  useModal({
    component: Popup,
    attrs: {
      width: 'wide',
      buttons: [{ name: t`关闭` }],
    },
    slots: {
      default: `<div class='p-1.5 text-left'>${script.value.info ? renderMarkdown(script.value.info) : t`未填写作者备注`}</div>`,
    },
  }).open();

const { open: openDeleteConfirmModal } = useModal({
  component: Popup,
  attrs: {
    onClosed: unlockWorldbookSelection,
    buttons: [
      {
        name: t`确定`,
        shouldEmphasize: true,
        onClick: close => {
          emit('delete', script.value.id);
          close();
        },
      },
      { name: t`取消` },
    ],
  },
  slots: {
    default: t`<div>确定要删除脚本吗? 此操作无法撤销</div>`,
  },
});

function openDeleteConfirm() {
  lockWorldbookSelection();
  openDeleteConfirmModal();
}

const { open: openMoveConfirmModal } = useModal({
  component: TargetSelector,
  attrs: {
    target: props.target,
    onClosed: unlockWorldbookSelection,
    onSubmit: (target: 'global' | 'character' | 'preset' | 'worldbook') => {
      if (props.target === target) {
        return;
      }
      emit('move', script.value.id, target);
    },
  },
});

function openMoveConfirm() {
  lockWorldbookSelection();
  openMoveConfirmModal();
}

type ScriptExportPayload = {
  filename: string;
  data: string;
};

const createExportPayload = async (option: ScriptExportOptions): Promise<ScriptExportPayload> => {
  const to_export = klona(script.value);

  to_export.export_with.data = option.include_data;
  if (!to_export.export_with.data) {
    _.set(to_export, 'data', {});
  }

  to_export.export_with.button = option.include_button;
  if (!to_export.export_with.button) {
    _.set(to_export, 'button.buttons', []);
  }

  const filename = await getSanitizedFilename(t`酒馆助手脚本-${to_export.name}.json`);
  const data = JSON.stringify(to_export, null, 2);
  return { filename, data };
};

const downloadExport = async (options: ScriptExportOptions) => {
  const { filename, data } = await createExportPayload(options);
  download(data, filename, 'application/json');
};

const exportScript = () => {
  const has_data = !_.isEmpty(script.value.data);
  const has_button = script.value.button.buttons.length > 0;
  if (!has_data && !has_button) {
    downloadExport({ include_data: true, include_button: true });
    return;
  }

  useModal({
    component: ScriptExport,
    attrs: {
      scriptName: script.value.name,
      hasData: has_data,
      hasButton: has_button,
      includeData: has_data,
      includeButton: has_button,
      onSubmit: (result: { include_data: boolean; include_button: boolean }) => {
        downloadExport({
          include_data: has_data ? result.include_data : true,
          include_button: has_button ? result.include_button : true,
        });
      },
    },
  }).open();
};

const copyScript = () => {
  lockWorldbookSelection();
  useModal({
    component: TargetSelector,
    attrs: {
      onClosed: unlockWorldbookSelection,
      onSubmit: (target: 'global' | 'character' | 'preset' | 'worldbook') => {
        emit('copy', script.value.id, target);
      },
    },
  }).open();
};
</script>
