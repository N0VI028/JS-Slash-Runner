<template>
  <div class="width100p height100p">
    <RepositoryToolbar
      :search="searchQuery"
      @create-script="handleCreateScript"
      @create-folder="handleCreateFolder"
      @import="handleImportClick"
      @open-builtin="handleBuiltinLibraryClick"
      @update-search="onToolbarSearch"
    />
    <input
      multiple
      accept="*.json,*.zip"
      hidden
      id="import-script-file"
      type="file"
      ref="fileInput"
      @change="handleFileImport"
    />

    <div class="flex-container flexFlowColumn marginTop10">
      <template v-for="(repo, index) in repositories" :key="repo.type">
        <div v-if="index > 0" class="divider marginTop10 marginBot10"></div>

        <div class="extension-content-item">
          <div class="flex flexFlowColumn">
            <div class="flex alignItemsCenter">
              <div class="settings-title-text">{{ repo.title }}</div>
              <div class="batch-manager-btn" :title="repo.batchTitle" @click="repo.toggleBatchMode">
                <i class="fa-solid fa-cog"></i>
              </div>
            </div>
            <div class="settings-title-description">{{ repo.description }}</div>
          </div>
          <div class="toggle-switch marginLeft5">
            <input
              type="checkbox"
              :id="`${repo.type}-script-enable-toggle`"
              class="toggle-input"
              :checked="repo.enabled.value"
              @change="onToggleType(repo.type, $event)"
            />
            <label :for="`${repo.type}-script-enable-toggle`" class="toggle-label">
              <span class="toggle-handle"></span>
            </label>
          </div>
        </div>

        <BatchControls
          :repo-type="repo.type"
          v-show="repo.isBatchMode.value"
          @batch-delete="repo.performBatchDelete"
          @batch-export="repo.performBatchExport"
          @batch-move="repo.performBatchMove"
          @batch-cancel="repo.exitBatchMode"
        />

        <ScriptList
          :repository="repo.store.repository"
          :expanded-folders="repo.expandedFolders.value"
          :is-searching="isSearching"
          :repo-type="repo.type"
          :search-keyword="searchQuery"
          :batch-mode="repo.isBatchMode.value"
          :selected-script-ids="repo.selectedScripts.value"
          :selected-folder-ids="repo.selectedFolders.value"
          @toggle-folder-expand="repo.toggleFolderExpand"
          @toggle-folder-scripts="repo.onToggleFolderScripts"
          @edit-folder="repo.onEditFolder"
          @export-folder="repo.onExportFolder"
          @move-folder="repo.onMoveFolderType"
          @toggle-script="repo.onToggleScript"
          @show-info="repo.onShowInfo"
          @edit-script="repo.onEditScript"
          @move-script="repo.onMoveScript"
          @export-script="repo.onExportScript"
          @delete-script="repo.onDeleteScript"
          @delete-folder="repo.onDeleteFolder"
          @move-script-type="repo.onMoveScriptType"
          @select-script="repo.onSelectScript"
          @select-folder="repo.onSelectFolder"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import BatchControls from '@/component/script_repository/components/BatchControls.vue';
import RepositoryToolbar from '@/component/script_repository/components/RepositoryToolbar.vue';
import ScriptList from '@/component/script_repository/components/ScriptList.vue';
import { useBatchActions } from '@/component/script_repository/composables/useBatchActions';
import { createRepoActionsForType, useRepoActions } from '@/component/script_repository/composables/useRepoActions';
import type { ScriptType } from '@/component/script_repository/schemas/script.schema';
import {
  getStoreByType,
  useCharacterScriptStore,
  useGlobalScriptStore,
  usePresetScriptStore,
} from '@/component/script_repository/stores/factory';
import { debounce } from 'lodash';
import type { Ref } from 'vue';
import { computed, onMounted, ref } from 'vue';

const actions = useRepoActions();
const actionsByType = {
  global: createRepoActionsForType('global'),
  character: createRepoActionsForType('character'),
  preset: createRepoActionsForType('preset'),
} as const;
const globalScriptStore = useGlobalScriptStore();
const characterScriptStore = useCharacterScriptStore();
const presetScriptStore = usePresetScriptStore();
const storeByType = getStoreByType();

const metaByType: Record<ScriptType, { title: string; description: string; batchTitle: string }> = {
  global: {
    title: '全局脚本库',
    description: '应用于酒馆所有聊天',
    batchTitle: '批量管理全局脚本',
  },
  character: {
    title: '角色脚本库',
    description: '应用于当前角色卡',
    batchTitle: '批量管理角色脚本',
  },
  preset: {
    title: '预设脚本库',
    description: '预设脚本配置管理',
    batchTitle: '批量管理预设脚本',
  },
};

const searchQuery = ref('');
const fileInput = ref<HTMLInputElement>();

const expandedFoldersMap: Record<ScriptType, Ref<Set<string>>> = {
  global: ref<Set<string>>(new Set()),
  character: ref<Set<string>>(new Set()),
  preset: ref<Set<string>>(new Set()),
};

const isSearching = computed(() => searchQuery.value.trim().length > 0);

/**
 * 搜索关键字下放到各自的 store
 */
const handleSearch = debounce(() => {
  globalScriptStore.setFilters({ keyword: searchQuery.value });
  characterScriptStore.setFilters({ keyword: searchQuery.value });
  presetScriptStore.setFilters({ keyword: searchQuery.value });
}, 300);

function onToolbarSearch(value: string): void {
  searchQuery.value = value;
  handleSearch();
}

const handleCreateScript = () => {
  actions.createScriptWithUI();
};

const handleCreateFolder = () => {
  actions.createFolderWithUI();
};

const handleBuiltinLibraryClick = () => {
  actions.openBuiltinLibrary();
};

const handleImportClick = () => {
  fileInput.value?.click();
};

/**
 * 处理文件导入
 * @param event 事件
 */
const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files?.length) return;
  
  try {
    const popups = (await import('@/component/script_repository/composables/usePopups')).usePopups();
    const result = await popups.selectTarget({ title: '导入到:' });
    if (!result.confirmed || !result.data) return;
    
    const targetType = result.data.target as ScriptType;
    const { repositoryService } = await import('@/component/script_repository/services/repository.service');

    const imported = await repositoryService.importScripts(
      files,
      targetType,
    );
    
    toastr.success(`成功导入 ${imported} 个脚本`);
  } catch (error) {
    console.error('导入失败:', error);
    toastr.error('导入失败', error instanceof Error ? error.message : '未知错误');
  }
  
  target.value = '';
};

/**
 * 切换文件夹展开状态
 * @param expandedFolders 展开的文件夹
 * @param id 文件夹ID
 */
function toggleFolderExpand(expandedFolders: Ref<Set<string>>, id: string): void {
  if (expandedFolders.value.has(id)) {
    expandedFolders.value.delete(id);
  } else {
    expandedFolders.value.add(id);
  }
}

onMounted(async () => {});


/**
 * 切换脚本类型启用状态
 * @param type 脚本类型
 * @param event 事件
 */
function onToggleType(type: ScriptType, event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;

  switch (type) {
    case 'global':
      globalScriptStore.setEnabled(checked);
      break;
    case 'character':
      characterScriptStore.setEnabled(checked);
      break;
    case 'preset':
      presetScriptStore.setEnabled(checked);
      break;
  }
}


const batchByType: Record<ScriptType, ReturnType<typeof useBatchActions>> = {
  global: useBatchActions('global'),
  character: useBatchActions('character'),
  preset: useBatchActions('preset'),
};

function buildRepositoryConfig(type: ScriptType) {
  const store = storeByType[type];
  const ops = actionsByType[type];
  const batch = batchByType[type];
  const expandedFolders = expandedFoldersMap[type];
  const meta = metaByType[type];

  const config = {
    type,
    title: meta.title,
    description: meta.description,
    batchTitle: meta.batchTitle,
    store,
    enabled: computed(() => store.enabled),
    expandedFolders,
    toggleFolderExpand: (id: string) => toggleFolderExpand(expandedFolders, id),

    // 批量
    isBatchMode: batch.isBatchMode,
    selectedScripts: batch.selectedScripts,
    selectedFolders: batch.selectedFolders,
    toggleBatchMode: batch.toggleBatchMode,
    exitBatchMode: batch.exitBatchMode,
    onSelectScript: batch.onSelectScript,
    onSelectFolder: batch.onSelectFolder,
    performBatchDelete: batch.performBatchDelete,
    performBatchExport: batch.performBatchExport,
    performBatchMove: batch.performBatchMove,

    // 事件
    onToggleFolderScripts: (id: string) => ops.toggleFolderScripts(id),
    onEditFolder: (id: string) => ops.editFolder(id),
    onExportFolder: (id: string) => ops.exportFolder(id),
    onMoveFolderType: (id: string) => ops.moveFolderType(id),

    onToggleScript: (id: string) => actions.toggleScriptEnabled(type, id),
    onShowInfo: (id: string) => actions.showScriptInfo(type, id),
    onEditScript: (id: string) => actions.editScript(type, id),
    onMoveScript: (id: string) => ops.moveWithinFolder(id),
    onExportScript: (id: string) => ops.exportSingle(id),
    onDeleteScript: (id: string) => actions.confirmDeleteScript(type, id),
    onMoveScriptType: (id: string) => ops.moveType(id),
    onDeleteFolder: (id: string) => ops.deleteFolder(id),
  };

  return config;
}

// 统一仓库配置，驱动模板渲染
const repositories = computed(() =>
  (['global', 'character', 'preset'] as ScriptType[]).map(t => buildRepositoryConfig(t)),
);
</script>

<style scoped>
.repository-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--SmartThemeBlurTintColor);
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-bottom: 1px solid var(--SmartThemeBorderColor);
  background-color: var(--SmartThemeQuoteColor);
}

.search-container {
  position: relative;
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: 8px 12px;
  padding-right: 30px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 20px;
  background-color: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  font-size: 14px;
}

.search-input:focus {
  outline: none;
  border-color: var(--SmartThemeBodyColor);
}

.clear-search {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  cursor: pointer;
  color: var(--SmartThemeBodyColor);
  opacity: 0.6;
}

.clear-search:hover {
  opacity: 1;
}

.toolbar-actions {
  display: flex;
  gap: 5px;
  margin-left: 15px;
}

.toolbar-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 8px;
  background-color: var(--SmartThemeBlurTintColor);
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  transition: background-color 0.2s;
}

.toolbar-button:hover {
  background-color: var(--SmartThemeQuoteColor);
}

.content-area {
  flex: 1;
  overflow: hidden;
}

/* 批量操作样式 */
.batch-manager-btn {
  margin-left: 5px;
  cursor: pointer;
}
</style>
