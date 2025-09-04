<template>
  <div class="repository-page flex flexFlowColumn height100p gap10px">
    <!-- 工具栏区域 -->
    <div class="repository-toolbar flexShrink">
      <div class="flex-container flex gap5px flexWrap">
        <button
          @click="commands.createScript({ name: '新脚本', folderId: null, enabled: false })"
          class="menu_button menu_button_icon interactable"
          :disabled="!selectors.canPerformActions.value"
        >
          <i class="fa-solid fa-scroll"></i>
          <small>+ 脚本</small>
        </button>

        <button
          @click="commands.createFolder({ name: '新文件夹', parentId: null })"
          class="menu_button menu_button_icon interactable"
          :disabled="!selectors.canPerformActions.value"
        >
          <i class="fa-solid fa-folder-plus"></i>
          <small>+ 文件夹</small>
        </button>

        <button
          @click="handleImportClick"
          class="menu_button menu_button_icon interactable"
          :disabled="!selectors.canPerformActions.value"
        >
          <i class="fa-solid fa-file-import"></i>
          <small>导入</small>
        </button>
        <input ref="importFileInput" multiple accept="*.json,*.zip" hidden type="file" @change="handleFileImport" />

        <button
          @click="commands.refreshRepository()"
          class="menu_button menu_button_icon interactable"
          :disabled="selectors.isLoading.value"
        >
          <i class="fa-solid fa-refresh" :class="{ 'fa-spin': selectors.isLoading }"></i>
          <small>刷新</small>
        </button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="script-search-container flex flexShrink">
      <input v-model="searchKeyword" @input="handleSearch" type="text" placeholder="搜索脚本..." class="text_pole" />
      <button
        v-if="selectors.isSearching"
        @click="handleClearSearch"
        class="clear-search-btn no-border padding5 margin0"
        title="清除搜索"
      >
        <i class="fa-solid fa-times"></i>
      </button>
    </div>
    <i class="fa-solid fa-search script-search-icon"></i>
    <!-- 主要内容区域 -->
    <div class="repository-content flex1 flex flexFlowColumn overflowHidden">
      <!-- 统计信息 -->
      <div v-if="!selectors.isLoading" class="repository-stats flex gap10h5v paddingTopBot5 marginBot10 fontsize90p">
        <span class="stats-item padding5"> 脚本总数: {{ scriptStats.total }} </span>
        <span class="stats-item padding5"> 已启用: {{ scriptStats.enabled }} </span>
        <span v-if="selectors.isSearching" class="stats-item search-stats padding5">
          搜索结果: {{ searchResultCount }}
        </span>
      </div>

      <!-- 视图切换 -->
      <div class="view-toggle flex gap5px padding5 alignItemsCenter">
        <button
          :class="[
            'view-btn flex alignItemsCenter gap5px padding10 no-border fontsize80p',
            { active: currentView === 'list' },
          ]"
          @click="currentView = 'list'"
          title="列表视图"
        >
          <i class="fa-solid fa-list"></i>
          列表
        </button>
        <button
          :class="[
            'view-btn flex alignItemsCenter gap5px padding10 no-border fontsize80p',
            { active: currentView === 'tree' },
          ]"
          @click="currentView = 'tree'"
          title="树形视图"
        >
          <i class="fa-solid fa-sitemap"></i>
          文件夹
        </button>
      </div>

      <!-- 内容区域 -->
      <div class="content-area flex1 flex flexFlowColumn overflowHidden">
        <!-- 主分割面板 -->
        <div class="main-panel flex1 flex overflowHidden">
          <!-- 左侧：列表/树形视图 -->
          <div class="left-panel flex1 flex flexFlowColumn overflowHidden">
            <!-- 列表视图 -->
            <script-list
              v-if="currentView === 'list'"
              :scripts="displayScripts"
              :selected-script-id="selectedScriptId"
              :is-searching="selectors.isSearching.value"
              @clear-search="handleClearSearch"
              @create-script="handleCreateScript"
              @select-script="handleSelectScript"
              @toggle-script="handleToggleScript"
              @run-script="handleRunScript"
              @script-menu="handleScriptMenu"
            />

            <!-- 树形视图 -->
            <div v-else-if="currentView === 'tree'" class="tree-view flex1 overflowYAuto padding10">
              <folder-tree
                :folder-tree="selectors.folderTree.value"
                :root-scripts="selectors.rootScripts.value"
                :expanded-folders="selectors.expandedFolders.value"
                :selected-script-id="selectedScriptId"
                :get-scripts-in-folder="selectors.getScriptsInFolder"
                @expand-folder="handleExpandFolder"
                @select-script="handleSelectScript"
                @toggle-script="handleToggleScript"
                @folder-menu="handleFolderMenu"
                @script-menu="handleTreeScriptMenu"
              />
            </div>
          </div>

          <!-- 分割线 -->
          <div class="panel-divider" @mousedown="startResize"></div>

          <!-- 右侧：编辑器面板 -->
          <div class="right-panel flex flexFlowColumn overflowHidden" :style="{ width: rightPanelWidth + 'px' }">
            <script-editor />
          </div>
        </div>
      </div>
    </div>

    <!-- Toast 通知 -->
    <toast-container />

    <!-- 对话框 -->
    <dialog-container />
  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRepositorySelectors } from '../composables/useRepositorySelectors';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import type { Folder, Script } from '../schemas/script.schema';
import DialogContainer from './DialogContainer.vue';
import FolderTree from './FolderTree.vue';
import ScriptEditor from './ScriptEditor.vue';
import ScriptList from './ScriptList.vue';
import ToastContainer from './ToastContainer.vue';

// Composables
const commands = useScriptRepoCommands();
const selectors = useRepositorySelectors();

// 响应式状态
const searchKeyword = ref('');
const importFileInput = ref<HTMLInputElement>();
const currentView = ref<'list' | 'tree'>('list'); // 当前视图模式
const rightPanelWidth = ref(400); // 右侧面板宽度
const isResizing = ref(false); // 是否正在调整大小

// 本地计算属性（解决模板类型问题）
const scriptStats = computed(() => selectors.scriptStats.value);
const searchResultCount = computed(() => selectors.searchResultCount.value);
const displayScripts = computed(() => selectors.displayScripts.value);
const selectedScriptId = computed(() => selectors.selectedScriptId.value);

// 计算属性和事件处理

/**
 * 搜索处理（防抖）
 */
const handleSearch = debounce(() => {
  commands.search(searchKeyword.value);
}, 300);

/**
 * 清除搜索
 */
const handleClearSearch = () => {
  searchKeyword.value = '';
  commands.clearSearch();
};

/**
 * 导入点击处理
 */
const handleImportClick = () => {
  importFileInput.value?.click();
};

/**
 * 文件导入处理
 */
const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;

  if (!files || files.length === 0) {
    return;
  }

  try {
    for (const file of Array.from(files)) {
      const content = await readFileAsText(file);
      const data = JSON.parse(content);

      // TODO: 验证导入数据格式
      if (data.scripts && Array.isArray(data.scripts)) {
        await commands.importScripts({
          scripts: data.scripts,
          folderId: null,
          overwrite: false,
        });
      }
    }
  } catch (error) {
    console.error('导入文件失败:', error);
  }

  // 清空文件输入
  target.value = '';
};

/**
 * 读取文件为文本
 */
const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

/**
 * 脚本菜单处理 (用于 ScriptList)
 */
const handleScriptMenu = (payload: { script: Script; event: Event }) => {
  const { script, event } = payload;
  handleScriptMenuAction(script, event);
};

/**
 * 树形脚本菜单处理 (用于 FolderTree)
 */
const handleTreeScriptMenu = (script: Script, event: Event) => {
  handleScriptMenuAction(script, event);
};

/**
 * 统一的脚本菜单处理逻辑
 */
const handleScriptMenuAction = (script: Script, event: Event) => {
  // TODO: 显示上下文菜单
  console.log('显示脚本菜单:', script.name, event);

  // 使用UI store显示删除确认对话框
  const { useUiStore } = require('../stores/ui.store');
  const uiStore = useUiStore();

  uiStore.showConfirm(
    '确认删除',
    `确定要删除脚本 "${script.name}" 吗？此操作不可撤销。`,
    () => {
      commands.deleteScript(script.id, script.name);
    },
    () => {
      console.log('取消删除:', script.name);
    },
  );
};

/**
 * 处理新组件的事件
 */
const handleCreateScript = (payload: { name: string; folderId: string | null; enabled: boolean }) => {
  commands.createScript(payload);
};

const handleSelectScript = (id: string) => {
  commands.selectScript(id);
};

const handleToggleScript = (id: string) => {
  commands.toggleScriptEnabled(id);
};

const handleRunScript = (id: string) => {
  commands.runScript(id);
};

const handleExpandFolder = (folderId: string) => {
  commands.toggleFolderExpand(folderId);
};

const handleFolderMenu = (folder: Folder, event: Event) => {
  // TODO: 显示文件夹菜单
  console.log('显示文件夹菜单:', folder.name, event);
};

/**
 * 开始调整面板大小
 */
const startResize = (_e: MouseEvent) => {
  isResizing.value = true;

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.value) return;

    const containerRect = (e.target as HTMLElement).closest('.content-area')?.getBoundingClientRect();
    if (!containerRect) return;

    const newWidth = containerRect.right - e.clientX;
    rightPanelWidth.value = Math.max(300, Math.min(800, newWidth));
  };

  const handleMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

  document.addEventListener('mousemove', handleMouseMove);
  document.addEventListener('mouseup', handleMouseUp);
};

// 生命周期
onMounted(async () => {
  // 初始化仓库数据
  await commands.initRepository();
});

onUnmounted(() => {
  // 清理资源
});
</script>

<style scoped>
.script-search-container {
  position: relative;
}

.text_pole {
  padding-right: 50px;
}

.script-search-icon {
  position: absolute;
  right: 5px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--SmartThemeEmColor);
  pointer-events: none;
}

.clear-search-btn {
  position: absolute;
  right: 30px;
  top: 50%;
  transform: translateY(-50%);
  background-color: transparent;
  border: none;
  cursor: pointer;
  padding: 5px;
  margin: 0;
  color: var(--SmartThemeEmColor);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.clear-search-btn:hover {
  color: var(--SmartThemeQuoteColor);
  background: rgba(255, 255, 255, 0.1);
}

.repository-content {
  position: relative;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.loading-spinner {
  color: white;
}

.error-message {
  background: rgba(255, 0, 0, 0.1);
  border: 1px solid rgba(255, 0, 0, 0.3);
  border-radius: 4px;
  color: #ff6b6b;
}

.retry-btn {
  background: none;
  border: 1px solid currentColor;
  color: inherit;
  padding: 4px 8px;
  border-radius: 3px;
  cursor: pointer;
}

.retry-btn:hover {
  background: rgba(255, 107, 107, 0.1);
}

.repository-stats {
  color: var(--SmartThemeBodyColor);
  border-bottom: 1px solid var(--SmartThemeBorderColor);
}

.stats-item {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

.search-stats {
  color: var(--SmartThemeEmColor);
  font-weight: 500;
}

.view-toggle {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  margin-bottom: 12px;
}

.view-btn {
  border-radius: 4px;
  background: none;
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.view-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: var(--SmartThemeBorderColor);
}

.view-btn.active {
  background: var(--SmartThemeQuoteColor);
  color: var(--SmartThemeEmColor);
  border-color: var(--SmartThemeEmColor);
}

.left-panel {
  min-width: 300px;
}

.panel-divider {
  width: 4px;
  background: var(--SmartThemeBorderColor);
  cursor: col-resize;
  transition: background 0.2s ease;
  position: relative;
}

.panel-divider:hover {
  background: var(--SmartThemeEmColor);
}

.panel-divider::after {
  content: '';
  position: absolute;
  left: -2px;
  right: -2px;
  top: 0;
  bottom: 0;
}

.right-panel {
  min-width: 300px;
  max-width: 800px;
}
</style>
