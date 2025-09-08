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
      <input
        multiple
        accept="*.json,*.zip"
        hidden
        id="import-script-file"
        type="file"
        ref="fileInput"
        @change="handleFileImport"
      />
      <div id="default-script" class="menu_button menu_button_icon interactable" @click="handleBuiltinLibraryClick">
        <i class="fa-solid fa-archive"></i>
        <small>内置库</small>
      </div>
    </div>

    <div class="script-search-container" style="width: 100%; position: relative; margin: 5px 0">
      <input
        type="text"
        id="script-search-input"
        placeholder="搜索脚本..."
        class="text_pole"
        v-model="searchQuery"
        @input="handleSearch"
      />
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
          <input
            type="checkbox"
            id="global-script-enable-toggle"
            class="toggle-input"
            :checked="globalEnabled"
            @change="onToggleType('global', $event)"
          />
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
        :repository="globalScriptStore.repository"
        :expanded-folders="expandedGlobalFolders"
        :is-searching="isSearching"
        repo-type="global"
        @toggle-folder-expand="toggleGlobalFolderExpand"
        @toggle-folder-scripts="id => onToggleFolderScripts('global', id)"
        @toggle-script="id => commands.toggleScriptEnabled('global', id)"
        @show-info="id => commands.showScriptInfo('global', id)"
        @edit-script="id => commands.editScript('global', id)"
        @move-script="id => onMoveWithinFolder('global', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript('global', id)"
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
          <input
            type="checkbox"
            id="character-script-enable-toggle"
            class="toggle-input"
            :checked="characterEnabled"
            @change="onToggleType('character', $event)"
          />
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
        :repository="characterScriptStore.repository"
        :expanded-folders="expandedCharacterFolders"
        :is-searching="isSearching"
        repo-type="character"
        @toggle-folder-expand="toggleCharacterFolderExpand"
        @toggle-folder-scripts="id => onToggleFolderScripts('character', id)"
        @toggle-script="id => commands.toggleScriptEnabled('character', id)"
        @show-info="id => commands.showScriptInfo('character', id)"
        @edit-script="id => commands.editScript('character', id)"
        @move-script="id => onMoveWithinFolder('character', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript('character', id)"
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
import ScriptList from './ScriptList.vue';

const commands = useScriptRepoCommands();
const globalScriptStore = useGlobalScriptStore();
const characterScriptStore = useCharacterScriptStore();

const searchQuery = ref('');
const fileInput = ref<HTMLInputElement>();

// 使用分离的 store 数据
const expandedGlobalFolders = ref<Set<string>>(new Set());
const expandedCharacterFolders = ref<Set<string>>(new Set());

// 从各自的 store 获取数据
const globalEnabled = computed(() => globalScriptStore.enabled);
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
        const tgt = result.data.target as 'global' | 'character';
        if (tgt === 'global') {
          await repositoryService.importScriptsToGlobal({
            scripts: importedScripts,
            folderId: null,
            overwrite: false,
          });
        } else if (tgt === 'character') {
          await repositoryService.importScriptsToCharacter({
            scripts: importedScripts,
            folderId: null,
            overwrite: false,
          });
        } else {
          toastr.error('导入失败', '仅支持导入到全局或角色脚本库');
          return;
        }
        await commands.initRepository();
        toastr.success('导入成功', `已导入 ${importedScripts.length} 个脚本`);
      }
    }
  } catch (error) {
    console.error('导入失败:', error);
    toastr.error('导入失败', error instanceof Error ? error.message : '未知错误');
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
  await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);

  // 也初始化命令层（保持兼容）
  try {
    await commands.initRepository();
  } catch (err) {
    console.warn('初始化命令层失败:', err);
  }
});

async function onToggleType(type: 'global' | 'character', event: Event): Promise<void> {
  const checked = (event.target as HTMLInputElement).checked;

  // 先更新本地开关状态
  if (type === 'global') {
    globalScriptStore.setEnabled(checked);
  } else {
    characterScriptStore.setEnabled(checked);
  }

  // 使用V2专用的运行时管理器批量切换
  try {
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();
    await runtime.toggleScriptsByType(type, checked);
  } catch (err) {
    console.warn('切换脚本类型运行态失败:', err);
  }
}

async function onMoveType(source: 'global' | 'character', scriptId: string): Promise<void> {
  try {
    await repositoryService.moveScriptToOtherType(scriptId, source);
    // 重新初始化 stores 以刷新数据
    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success('移动成功', '脚本已移动到另一脚本库');
  } catch (error) {
    console.error('移动失败:', error);
    toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
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
    // 使用分离的移动方法
    if (source === 'global') {
      await repositoryService.moveGlobalScript(scriptId, folderId);
    } else {
      await repositoryService.moveCharacterScript(scriptId, folderId);
    }

    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    toastr.success('已移动', folderId ? '脚本已移动到目标文件夹' : '脚本已移动到根目录');
  } catch (error) {
    console.error('移动失败:', error);
    toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onToggleFolderScripts(type: 'global' | 'character', folderId: string): Promise<void> {
  try {
    const store = type === 'global' ? globalScriptStore : characterScriptStore;
    const folderScripts = store.getFolderScripts(folderId);

    if (folderScripts.length === 0) {
      return;
    }

    // 判断当前状态：如果所有脚本都启用，则禁用；否则启用
    const allEnabled = folderScripts.every(script => script.enabled);
    const targetEnabled = !allEnabled;

    // 使用V2专用的运行时管理器
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();
    await runtime.toggleFolderScripts(folderId, type, targetEnabled);

    toastr.success(
      `${targetEnabled ? '启用' : '禁用'}成功`,
      `已${targetEnabled ? '启用' : '禁用'}文件夹内${folderScripts.length}个脚本`,
    );
  } catch (error) {
    console.error('批量切换文件夹脚本失败:', error);
    toastr.error('操作失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onExportSingle(scriptId: string): Promise<void> {
  try {
    // 先确定脚本在哪个类型中
    const globalScript = globalScriptStore.getScript(scriptId);
    const type = globalScript ? 'global' : 'character';

    const scripts =
      type === 'global'
        ? await repositoryService.exportGlobalScripts([scriptId])
        : await repositoryService.exportCharacterScripts([scriptId]);
    if (scripts.length === 0) {
      toastr.error('导出失败', '找不到指定脚本');
      return;
    }

    const blob = new Blob([JSON.stringify(scripts[0], null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `script-${scriptId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastr.success('导出成功', '脚本已导出');
  } catch (error) {
    console.error('导出失败:', error);
    toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
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
