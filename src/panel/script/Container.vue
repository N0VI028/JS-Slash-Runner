<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">{{ props.title }}</div>
        <div class="ml-0.5 flex cursor-pointer items-center justify-center" @click="toggleBatchView()">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div class="mt-0.25 text-sm opacity-70">{{ props.description }}</div>
    </div>
    <Toggle v-show="!isBatchMode" :id="`${props.title}-script-enable-toggle`" v-model="store.enabled" />
  </div>

  <!-- 批量操作按钮区域 -->
  <DefineBatchViewTemplate v-slot="{ icon, name, buttonTitle, onClick, disabled, isEmphasized }">
    <button
      class="menu_button interactable my-0! w-[unset]! flex-wrap text-sm!"
      :class="{ 'bg-(--crimson70a)!': isEmphasized }"
      :title="buttonTitle"
      :disabled="disabled"
      @click="onClick"
    >
      <i class="fa-solid" :class="icon"></i>
      <span class="ml-0.25">{{ name }}</span>
    </button>
  </DefineBatchViewTemplate>
  <div v-show="isBatchMode" class="mt-0.5 flex items-center gap-0.5 border-b border-(--SmartThemeBorderColor) pb-0.5">
    <ReuseBatchViewTemplate
      :icon="'fa-trash'"
      :name="t`删除`"
      :button-title="t`删除`"
      :disabled="selectedItems.size === 0"
      :on-click="handleBatchDelete"
      :is-emphasized="true"
    />
    <ReuseBatchViewTemplate
      :icon="'fa-file-export'"
      :name="t`导出`"
      :button-title="t`导出`"
      :disabled="selectedItems.size === 0"
      :on-click="handleBatchExport"
    />
    <ReuseBatchViewTemplate
      :icon="'fa-folder'"
      :name="t`移动到文件夹`"
      :button-title="t`移动到文件夹`"
      :disabled="selectedItems.size === 0"
      :on-click="handleBatchMoveToFolder"
    />
    <ReuseBatchViewTemplate
      :icon="'fa-times'"
      :name="t`退出`"
      :button-title="t`退出批量操作`"
      :disabled="false"
      :on-click="exitBatchMode"
    />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <VueDraggable
      v-model="script_trees"
      group="scripts"
      handle=".TH-handle"
      class="flex flex-grow flex-col gap-[5px] overflow-y-auto py-0.5"
      :class="{ 'min-h-2': script_trees.length === 0 }"
      item-key="id"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      :data-container-type="props.storeType"
      direction="vertical"
      :disabled="searchInput !== null || isBatchMode"
      @start="onStart"
    >
      <div v-for="(script, index) in script_trees" :key="script.id">
        <ScriptItem
          v-if="isScript(script_trees[index])"
          v-model="script_trees[index]"
          :search-input="props.searchInput"
          :is-batch-mode="isBatchMode"
          :is-selected="selectedItems.has(script_trees[index].id)"
          @delete="handleDelete"
          @toggle-selection="toggleSelection"
        />
        <FolderItem
          v-else
          v-model="script_trees[index]"
          :search-input="props.searchInput"
          :is-batch-mode="isBatchMode"
          :is-selected="selectedItems.has(script_trees[index].id)"
          :is-expanded="folderExpandedStates.get(script_trees[index].id) ?? false"
          @delete="handleDelete"
          @toggle-selection="toggleSelection"
          @update:is-expanded="(expanded: boolean) => folderExpandedStates.set(script_trees[index].id, expanded)"
        />
      </div>
      <div v-if="script_trees.length === 0" class="text-center opacity-50">{{ t`暂无脚本` }}</div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import FolderItem from '@/panel/script/FolderItem.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { isScript, Script, ScriptFolder } from '@/type/scripts';
import { download, getSanitizedFilename } from '@sillytavern/scripts/utils';
import { createReusableTemplate } from '@vueuse/core';
import { VueDraggable } from 'vue-draggable-plus';

const store = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });

const props = defineProps<{
  title: string;
  description: string;
  searchInput: RegExp | null;
  storeType: 'global' | 'character' | 'preset';
}>();

const [DefineBatchViewTemplate, ReuseBatchViewTemplate] = createReusableTemplate();

const script_trees = toRef(store.value, 'script_trees');

const folderExpandedStates = ref<Map<string, boolean>>(new Map());

const handleDelete = (id: string) => {
  _.remove(store.value.script_trees, script => script.id === id);
  folderExpandedStates.value.delete(id);
};

// 批量模式相关状态
const isBatchMode = ref(false);
const selectedItems = ref<Set<string>>(new Set());

const toggleBatchView = () => {
  isBatchMode.value = !isBatchMode.value;
  if (!isBatchMode.value) {
    selectedItems.value.clear();
  }
};

const exitBatchMode = () => {
  isBatchMode.value = false;
  selectedItems.value.clear();
};

const toggleSelection = (id: string) => {
  if (selectedItems.value.has(id)) {
    selectedItems.value.delete(id);
  } else {
    selectedItems.value.add(id);
  }
};

/**
 * 拖拽移动时自动展开所有文件夹
 * @param _evt - 拖拽事件对象
 */
const onStart = (_evt: any) => {
  console.log('onStart'); // 展开所有文件夹
  script_trees.value.forEach(item => {
    console.log(item);
    if (!isScript(item)) {
      // 如果是文件夹，设置为展开状态
      folderExpandedStates.value.set(item.id, true);
    }
  });
};

// 获取选中的脚本和文件夹
const getSelectedItems = () => {
  const scripts: Script[] = [];
  const folders: ScriptFolder[] = [];

  for (const id of selectedItems.value) {
    const item = script_trees.value.find(item => item.id === id);
    if (item) {
      if (isScript(item)) {
        scripts.push(item);
      } else {
        folders.push(item);
      }
    }
  }

  return { scripts, folders };
};

// 批量删除
const handleBatchDelete = () => {
  const { scripts, folders } = getSelectedItems();
  const totalCount = scripts.length + folders.length;

  useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`确定`,
          shouldEmphasize: true,
          onClick: close => {
            for (const id of selectedItems.value) {
              _.remove(store.value.script_trees, item => item.id === id);
            }
            selectedItems.value.clear();
            close();
          },
        },
        { name: t`取消` },
      ],
    },
    slots: {
      default: t`<div>确定要删除选中的 ${totalCount} 个项目吗？此操作无法撤销</div>`,
    },
  }).open();
};

// 批量导出
const handleBatchExport = async () => {
  const { scripts, folders } = getSelectedItems();

  const exportData = {
    scripts,
    folders,
    exportDate: new Date().toISOString(),
  };

  const filename = await getSanitizedFilename(t`酒馆助手脚本-批量导出-${new Date().toLocaleDateString()}.json`);
  const data = JSON.stringify(exportData, null, 2);
  download(data, filename, 'application/json');
};

// 批量移动到文件夹
const handleBatchMoveToFolder = () => {
  const { scripts } = getSelectedItems();

  if (scripts.length === 0) {
    useModal({
      component: Popup,
      attrs: {
        buttons: [{ name: t`确定` }],
      },
      slots: {
        default: t`<div>只能移动脚本到文件夹，文件夹不能嵌套</div>`,
      },
    }).open();
    return;
  }

  // 获取所有文件夹选项
  const folders = script_trees.value.filter(item => !isScript(item)) as ScriptFolder[];

  if (folders.length === 0) {
    useModal({
      component: Popup,
      attrs: {
        buttons: [{ name: t`确定` }],
      },
      slots: {
        default: t`<div>没有可用的文件夹，请先创建文件夹</div>`,
      },
    }).open();
    return;
  }

  // 显示文件夹选择
  const selectedFolderId = ref<string | null>(null);

  const { open } = useModal({
    component: Popup,
    attrs: {
      buttons: [
        {
          name: t`确定`,
          shouldEmphasize: true,
          onClick: close => {
            if (!selectedFolderId.value) return;
            const targetFolder = folders.find(f => f.id === selectedFolderId.value);
            if (!targetFolder) return;

            // 移动脚本到目标文件夹
            scripts.forEach(script => {
              _.remove(store.value.script_trees, item => item.id === script.id);
              targetFolder.scripts.push(script);
            });

            selectedItems.value.clear();
            close();
          },
        },
        { name: t`取消` },
      ],
    },
    slots: {
      default: () =>
        h('div', [
          h('div', { class: 'mb-0.5' }, t`选择目标文件夹：`),
          h(
            'div',
            { class: 'max-h-12 overflow-y-auto flex flex-col gap-0.25' },
            folders.map(folder =>
              h(
                'div',
                {
                  class: [
                    'cursor-pointer p-0.5 rounded hover:bg-(--SmartThemeBlurTintColor)',
                    selectedFolderId.value === folder.id ? 'bg-(--SmartThemeBlurTintColor)' : '',
                  ],
                  onClick: () => {
                    selectedFolderId.value = folder.id;
                  },
                },
                [
                  h('i', {
                    class: ['fa-solid', folder.icon || 'fa-folder'],
                    style: { color: folder.color || 'var(--SmartThemeQuoteColor)', marginRight: '0.5rem' },
                  }),
                  h('span', folder.name),
                ],
              ),
            ),
          ),
        ]),
    },
  });

  open();
};
</script>
