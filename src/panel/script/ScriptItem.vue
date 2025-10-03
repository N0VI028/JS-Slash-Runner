<template>
  <!-- prettier-ignore-attribute -->
  <div
    v-show="is_visible"
    class="
      flex w-full flex-wrap items-center justify-between rounded-[10px] border border-(--SmartThemeBorderColor) p-[5px]
    "
    data-type="script"
  >
    <span class="TH-handle cursor-grab select-none active:cursor-grabbing">☰</span>
    <div
      class="ml-0.5 flex-grow overflow-hidden"
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
      <ToolButton name="查看作者备注" icon="fa-info-circle" @click="openScriptInfo" />
      <ToolButton name="编辑脚本" icon="fa-pencil" @click="openScriptEditor" />
      <ToolButton name="导出脚本" icon="fa-file-export" @click="exportScript" />
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
import { includesOrTest } from '@/util/search';
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate } from '@vueuse/core';
import { marked } from 'marked';
import { toRaw } from 'vue';

type ScriptExportOptions = {
  stripData?: boolean;
};

type ScriptExportPayload = {
  filename: string;
  data: string;
};

const [DefineToolButton, ToolButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

const script = defineModel<Script>({ required: true });

const props = withDefaults(
  defineProps<{
    searchInput?: string | RegExp;
  }>(),
  {
    searchInput: '',
  },
);

const emit = defineEmits<{
  delete: [id: string];
}>();

const is_visible = computed(() => {
  return includesOrTest(script.value.name, props.searchInput);
});

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

const openScriptInfo = () =>
  useModal({
    component: Popup,
    attrs: {
      buttons: [{ name: '关闭' }],
    },
    slots: {
      default: `<div>${script.value.info ? marked.parse(script.value.info) : '未填写作者备注'}</div>`,
    },
  }).open();

const { open: openDeleteConfirm } = useModal({
  component: Popup,
  attrs: {
    buttons: [
      {
        name: '确定',
        shouldEmphasize: true,
        onClick: close => {
          emit('delete', script.value.id);
          close();
        },
      },
      { name: '取消' },
    ],
  },
  slots: {
    default: `<div>确定要删除脚本吗？此操作无法撤销。</div>`,
  },
});

const createExportPayload = async ({ stripData = false }: ScriptExportOptions = {}): Promise<ScriptExportPayload> => {
  const exporting = _.cloneDeep(toRaw(script.value)) as Script;
  if (stripData) {
    exporting.data = {};
  }
  delete (exporting as any).type;
  delete (exporting as any).enabled;
  const filename = await getSanitizedFilename(`${exporting.name}.json`);
  const data = JSON.stringify(exporting, null, 2);
  return { filename, data };
};

const downloadExport = async (options?: ScriptExportOptions) => {
  const { filename, data } = await createExportPayload(options);
  download(data, filename, 'application/json');
};

defineExpose({ createExportPayload });

const exportScript = () => {
  const hasData = Object.keys(script.value.data || {}).length > 0;
  if (!hasData) {
    void downloadExport();
    return;
  }

  const modal = useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: '包含数据导出',
          onClick: close => {
            void downloadExport();
            close();
          },
        },
        {
          name: '清除数据导出',
          shouldEmphasize: true,
          onClick: close => {
            void downloadExport({ stripData: true });
            close();
          },
        },
        { name: '取消', onClick: close => close() },
      ],
    },
    slots: {
      default: `<div>脚本包含数据，导出时如何处理？如有API-KEY等敏感数据，注意清除</div>`,
    },
  });
  modal.open();
};
</script>
