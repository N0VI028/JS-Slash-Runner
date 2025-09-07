<template>
  <div class="width100p height100p">
    <div class="flex-container">
      <div id="create-script" class="menu_button menu_button_icon interactable" @click="handleCreateScript">
        <i class="fa-solid fa-scroll"></i>
        <small>+ 脚本</small>
      </div>
      <div id="create-folder" class="menu_button menu_button_icon interactable" @click="handleCreateFolder">
        <i class="fa-solid fa-folder-plus"></i>
        <small>+ 文件夹</small>
      </div>
      <div id="import-script" class="menu_button menu_button_icon interactable" @click="handleImportClick">
        <i class="fa-solid fa-file-import"></i>
        <small>导入</small>
      </div>
      <input multiple accept="*.json,*.zip" hidden id="import-script-file" type="file" ref="fileInput" @change="handleFileImport" />
      <div id="default-script" class="menu_button menu_button_icon interactable" @click="handleBuiltinLibraryClick">
        <i class="fa-solid fa-archive"></i>
        <small>内置库</small>
      </div>
    </div>

    <div class="script-search-container" style="width: 100%; position: relative; margin: 5px 0;">
      <input type="text" id="script-search-input" placeholder="搜索脚本..." class="text_pole" v-model="searchQuery" @input="handleSearch" />
      <i class="fa-solid fa-search script-search-icon"></i>
    </div>

    <div class="flex-container flexFlowColumn">
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">全局脚本库</div>
            <div id="global-batch-manager" class="batch-manager-btn" title="批量管理">
              <i class="fa-solid fa-cog"></i>
            </div>
          </div>
          <div class="settings-title-description">应用于酒馆所有聊天</div>
        </div>
        <div class="toggle-switch marginLeft5">
          <input type="checkbox" id="global-script-enable-toggle" class="toggle-input" :checked="globalEnabled" @change="onToggleType('global', $event)" />
          <label for="global-script-enable-toggle" class="toggle-label">
            <span class="toggle-handle"></span>
          </label>
        </div>
      </div>
      <div id="global-batch-controls" class="batch-controls" style="display: none">
        <button id="global-batch-delete" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-trash margin-r5"></i>删除
        </button>
        <button id="global-batch-export" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-file-export margin-r5"></i>导出
        </button>
        <button id="global-batch-move" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-folder-open margin-r5"></i>移动到文件夹
        </button>
        <button id="global-batch-cancel" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-times margin-r5"></i>退出
        </button>
      </div>
      <ScriptList
        :scripts="globalScripts"
        :folders="globalFolders"
        :expanded-folders="expandedGlobalFolders"
        :is-searching="isSearching"
        repo-type="global"
        @toggle-folder-expand="toggleGlobalFolderExpand"
        @toggle-script="id => commands.toggleScriptEnabled(id)"
        @show-info="id => commands.showScriptInfo(id)"
        @edit-script="id => commands.editScript(id)"
        @move-script="id => onMoveWithinFolder('global', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript(id)"
        @move-script-type="id => onMoveType('global', id)"
      />

      <div class="divider marginTop10 marginBot10"></div>
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">角色脚本库</div>
            <div id="character-batch-manager" class="batch-manager-btn" title="批量管理">
              <i class="fa-solid fa-cog"></i>
            </div>
          </div>
          <div class="settings-title-description">应用于当前角色卡</div>
        </div>
        <div class="toggle-switch marginLeft5">
          <input type="checkbox" id="character-script-enable-toggle" class="toggle-input" :checked="characterEnabled" @change="onToggleType('character', $event)" />
          <label for="character-script-enable-toggle" class="toggle-label">
            <span class="toggle-handle"></span>
          </label>
        </div>
      </div>
      <div id="character-batch-controls" class="batch-controls" style="display: none">
        <button id="character-batch-delete" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-trash margin-r5"></i>删除
        </button>
        <button id="character-batch-export" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-file-export margin-r5"></i>导出
        </button>
        <button id="character-batch-move" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-folder-open margin-r5"></i>移动到文件夹
        </button>
        <button id="character-batch-cancel" class="TavernHelper-button batch-action-btn">
          <i class="fa-solid fa-times margin-r5"></i>退出
        </button>
      </div>
      <ScriptList
        :scripts="characterScripts"
        :folders="characterFolders"
        :expanded-folders="expandedCharacterFolders"
        :is-searching="isSearching"
        repo-type="character"
        @toggle-folder-expand="toggleCharacterFolderExpand"
        @toggle-script="id => commands.toggleScriptEnabled(id)"
        @show-info="id => commands.showScriptInfo(id)"
        @edit-script="id => commands.editScript(id)"
        @move-script="id => onMoveWithinFolder('character', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript(id)"
        @move-script-type="id => onMoveType('character', id)"
      />
    </div>

  </div>
</template>

<script setup lang="ts">
import { debounce } from 'lodash';
import { computed, onMounted, ref } from 'vue';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import { repositoryService } from '../services/repository.service';
import { useCharacterScriptStore } from '../stores/characterScript.store';
import { useGlobalScriptStore } from '../stores/globalScript.store';
import { useUiStore } from '../stores/ui.store';
import ScriptList from './ScriptList.vue';

const commands = useScriptRepoCommands();
const globalScriptStore = useGlobalScriptStore();
const characterScriptStore = useCharacterScriptStore();
const uiStore = useUiStore();

const searchQuery = ref('');
const fileInput = ref<HTMLInputElement>();

// 使用分离的 store 数据
const expandedGlobalFolders = ref<Set<string>>(new Set());
const expandedCharacterFolders = ref<Set<string>>(new Set());

// 从各自的 store 获取数据
const globalScripts = computed(() => globalScriptStore.allScripts);
const globalFolders = computed(() => globalScriptStore.allFolders);
const globalEnabled = computed(() => globalScriptStore.enabled);

const characterScripts = computed(() => characterScriptStore.allScripts);
const characterFolders = computed(() => characterScriptStore.allFolders);
const characterEnabled = computed(() => characterScriptStore.enabled);

const isSearching = computed(() => searchQuery.value.trim().length > 0);

const handleSearch = debounce(() => {
  commands.setFilters({ keyword: searchQuery.value });
}, 300);

const handleCreateScript = () => {
  commands.createScriptWithUI();
};

const handleCreateFolder = () => {
  commands.createFolderWithUI();
};

const handleBuiltinLibraryClick = () => {
  commands.openBuiltinLibrary();
};

const handleImportClick = () => {
  fileInput.value?.click();
};

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (!files?.length) return;

  try {
    const importedScripts: any[] = [];
    for (const file of Array.from(files)) {
      const content = await readFileAsText(file);
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          importedScripts.push(...parsed);
        } else if (parsed.name) {
          importedScripts.push(parsed);
        }
      } catch {
        importedScripts.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          content,
          info: `从文件 ${file.name} 导入`,
        });
      }
    }

    if (importedScripts.length > 0) {
      // 询问导入目标（复用 popups 选择器）
      const popups = (await import('../composables/usePopups')).usePopups();
      const result = await popups.selectTarget({ title: '导入到:' });
      if (result.confirmed && result.data) {
        const tgt = result.data.target;
        if (tgt === 'global' || tgt === 'character') {
          await repositoryService.importScriptsToType(tgt, {
            scripts: importedScripts,
            folderId: null,
            overwrite: false,
          });
          await commands.initRepository();
          uiStore.showSuccess('导入成功', `已导入 ${importedScripts.length} 个脚本`);
        } else {
          uiStore.showError('导入失败', '仅支持导入到全局或角色脚本库');
        }
      }
    }
  } catch (error) {
    console.error('导入失败:', error);
    uiStore.showError('导入失败', error instanceof Error ? error.message : '未知错误');
  } finally {
    target.value = '';
  }
};

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve((e.target?.result as string) || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function toggleGlobalFolderExpand(id: string): void {
  if (expandedGlobalFolders.value.has(id)) {
    expandedGlobalFolders.value.delete(id);
  } else {
    expandedGlobalFolders.value.add(id);
  }
}

function toggleCharacterFolderExpand(id: string): void {
  if (expandedCharacterFolders.value.has(id)) {
    expandedCharacterFolders.value.delete(id);
  } else {
    expandedCharacterFolders.value.add(id);
  }
}

onMounted(async () => {
  // 初始化分离的 stores
  await Promise.all([
    globalScriptStore.init(),
    characterScriptStore.init(),
  ]);
  
  // 也初始化命令层（保持兼容）
  try { await commands.initRepository(); } catch {}
});

function onToggleType(type: 'global' | 'character', event: Event): void {
  const checked = (event.target as HTMLInputElement).checked;
  
  if (type === 'global') {
    globalScriptStore.setEnabled(checked).catch(err => {
      console.error('切换全局脚本启用失败:', err);
    });
  } else {
    characterScriptStore.setEnabled(checked).catch(err => {
      console.error('切换角色脚本启用失败:', err);
    });
  }
}

async function onMoveType(source: 'global' | 'character', scriptId: string): Promise<void> {
  try {
    await repositoryService.moveScriptToOtherType(source, scriptId);
    // 重新初始化 stores 以刷新数据
    await Promise.all([
      globalScriptStore.init(),
      characterScriptStore.init(),
    ]);
    await commands.initRepository();
    uiStore.showSuccess('移动成功', '脚本已移动到另一脚本库');
  } catch (error) {
    console.error('移动失败:', error);
    uiStore.showError('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onMoveWithinFolder(source: 'global' | 'character', scriptId: string): Promise<void> {
  try {
    // 简化：使用文本输入作为临时选择器（V2 后续可替换为选择器弹窗）
    const { usePopups } = await import('../composables/usePopups');
    const popups = usePopups();
    const input = await popups.promptText('输入目标文件夹ID（留空则移动到根）');
    if (!input.confirmed) return;
    const folderId = input.data?.trim() || null;
    // 使用 v2 repositoryService 移动
    await repositoryService.moveScriptWithinType(source, scriptId, folderId);

    await Promise.all([
      globalScriptStore.init(),
      characterScriptStore.init(),
    ]);
    uiStore.showSuccess('已移动', folderId ? '脚本已移动到目标文件夹' : '脚本已移动到根目录');
  } catch (error) {
    console.error('移动失败:', error);
    uiStore.showError('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onExportSingle(scriptId: string): Promise<void> {
  try {
    const blob = await repositoryService.exportScripts({ scriptIds: [scriptId], format: 'json', includeData: true });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `script-${scriptId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('导出失败:', error);
    uiStore.showError('导出失败', error instanceof Error ? error.message : '未知错误');
  }
}
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