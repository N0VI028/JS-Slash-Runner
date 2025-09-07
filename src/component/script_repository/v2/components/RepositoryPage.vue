<template>
  <div class="repository-page">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <!-- 搜索框 -->
      <div class="search-container">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索脚本..."
          class="search-input"
          @input="handleSearch"
        />
        <i v-if="searchQuery" class="fa-solid fa-times clear-search" @click="handleClearSearch"></i>
      </div>

      <!-- 操作按钮 -->
      <div class="toolbar-actions">
        <!-- 创建脚本 -->
        <button class="toolbar-button" @click="handleCreateScript" title="创建新脚本">
          <i class="fa-solid fa-plus"></i>
        </button>

        <!-- 导入 -->
        <button class="toolbar-button" @click="handleImportClick" title="导入脚本">
          <i class="fa-solid fa-file-import"></i>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".json,.js,.txt"
          multiple
          style="display: none"
          @change="handleFileImport"
        />

        <!-- 内置脚本库 -->
        <button class="toolbar-button" @click="handleBuiltinLibraryClick" title="内置脚本库">
          <i class="fa-solid fa-book"></i>
        </button>
      </div>
    </div>

    <!-- 脚本列表区域 -->
    <div class="content-area">
      <script-list
        :scripts="displayScripts"
        :folders="selectors.allFolders.value"
        :expanded-folders="selectors.expandedFolders.value"
        :is-searching="selectors.isSearching.value"
        @clear-search="handleClearSearch"
        @create-script="handleCreateScript"
        @toggle-script="handleToggleScript"
        @show-info="handleShowScriptInfo"
        @edit-script="handleEditScript"
        @move-script="handleMoveScript"
        @export-script="handleExportScript"
        @delete-script="handleDeleteScript"
        @toggle-folder-expand="handleToggleFolderExpand"
        @toggle-folder-scripts="handleToggleFolderScripts"
        @edit-folder="handleEditFolder"
        @export-folder="handleExportFolder"
        @move-folder="handleMoveFolder"
        @delete-folder="handleDeleteFolder"
      />
    </div>

    <!-- Toast 通知 -->
    <toast-container />
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash';
import { computed, ref } from 'vue';
import { useRepositorySelectors } from '../composables/useRepositorySelectors';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import { useUiStore } from '../stores/ui.store';
import ScriptList from './ScriptList.vue';
import ToastContainer from './ToastContainer.vue';

// Composables
const selectors = useRepositorySelectors();
const commands = useScriptRepoCommands();
const uiStore = useUiStore();

// 本地状态
const searchQuery = ref('');
const fileInput = ref<HTMLInputElement>();

// 本地计算属性
const displayScripts = computed(() => selectors.displayScripts.value);

/**
 * 搜索处理（防抖）
 */
const handleSearch = debounce(() => {
  commands.setFilters({ keyword: searchQuery.value });
}, 300);

const handleClearSearch = () => {
  searchQuery.value = '';
  commands.clearSearch();
};

/**
 * 导入处理
 */
const handleImportClick = () => {
  fileInput.value?.click();
};

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  
  if (!files?.length) return;

  try {
    const importedScripts = [];
    
    for (const file of Array.from(files)) {
      const content = await readFileAsText(file);
      
      try {
        // 尝试解析JSON格式
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          importedScripts.push(...parsed);
        } else if (parsed.name) {
          importedScripts.push(parsed);
        }
      } catch {
        // 如果不是JSON，作为纯文本脚本处理
        importedScripts.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          content: content,
          info: `从文件 ${file.name} 导入`
        });
      }
    }

    if (importedScripts.length > 0) {
      await commands.importScripts({
        scripts: importedScripts,
        folderId: null,
        overwrite: false
      });
      
      uiStore.showSuccess('导入成功', `已导入 ${importedScripts.length} 个脚本`);
    }
  } catch (error) {
    console.error('导入失败:', error);
    uiStore.showError('导入失败', error instanceof Error ? error.message : '未知错误');
  }
  
  // 清空文件输入
  target.value = '';
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * 内置脚本库
 */
const handleBuiltinLibraryClick = () => {
  commands.openBuiltinLibrary();
};

/**
 * 脚本操作处理
 */
const handleCreateScript = () => {
  commands.createScriptWithUI();
};

const handleToggleScript = (id: string) => {
  commands.toggleScriptEnabled(id);
};

const handleShowScriptInfo = (id: string) => {
  commands.showScriptInfo(id);
};

const handleEditScript = (id: string) => {
  commands.editScript(id);
};

const handleMoveScript = (id: string) => {
  commands.moveScript({ id, toFolderId: null });
};

const handleExportScript = (id: string) => {
  commands.exportScripts({ scriptIds: [id], format: 'json', includeData: true });
};

const handleDeleteScript = (id: string) => {
  commands.confirmDeleteScript(id);
};

/**
 * 文件夹操作处理
 */
const handleToggleFolderExpand = (id: string) => {
  commands.toggleFolderExpand(id);
};

const handleToggleFolderScripts = (id: string) => {
  // TODO: 实现批量切换文件夹内所有脚本的启用状态
  console.log('批量切换文件夹脚本:', id);
};

const handleEditFolder = (id: string) => {
  // TODO: 实现编辑文件夹
  console.log('编辑文件夹:', id);
};

const handleExportFolder = (id: string) => {
  // TODO: 实现导出文件夹
  console.log('导出文件夹:', id);
};

const handleMoveFolder = (id: string) => {
  // TODO: 实现移动文件夹
  console.log('移动文件夹:', id);
};

const handleDeleteFolder = (id: string) => {
  commands.confirmDeleteFolder(id);
};
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
</style>