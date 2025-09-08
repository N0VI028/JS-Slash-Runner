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
            <div id="global-batch-manager" class="batch-manager-btn" title="批量管理" @click="toggleBatchMode('global')">
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
      <div id="global-batch-controls" class="batch-controls" v-show="batchModeGlobal">
        <button id="global-batch-delete" class="TavernHelper-button batch-action-btn" @click="performBatchDelete('global')">
          <i class="fa-solid fa-trash margin-r5"></i>删除
        </button>
        <button id="global-batch-export" class="TavernHelper-button batch-action-btn" @click="performBatchExport('global')">
          <i class="fa-solid fa-file-export margin-r5"></i>导出
        </button>
        <button id="global-batch-move" class="TavernHelper-button batch-action-btn" @click="performBatchMove('global')">
          <i class="fa-solid fa-folder-open margin-r5"></i>移动到文件夹
        </button>
        <button id="global-batch-cancel" class="TavernHelper-button batch-action-btn" @click="exitBatchMode('global')">
          <i class="fa-solid fa-times margin-r5"></i>退出
        </button>
      </div>
      <ScriptList
        :repository="globalScriptStore.repository"
        :expanded-folders="expandedGlobalFolders"
        :is-searching="isSearching"
        repo-type="global"
        :batch-mode="batchModeGlobal"
        :selected-script-ids="selectedGlobalScripts"
        :selected-folder-ids="selectedGlobalFolders"
        @toggle-folder-expand="toggleGlobalFolderExpand"
        @toggle-folder-scripts="id => onToggleFolderScripts('global', id)"
        @edit-folder="id => onEditFolder('global', id)"
        @export-folder="id => onExportFolder('global', id)"
        @move-folder="id => onMoveFolderType('global', id)"
        @toggle-script="id => commands.toggleScriptEnabled('global', id)"
        @show-info="id => commands.showScriptInfo('global', id)"
        @edit-script="id => commands.editScript('global', id)"
        @move-script="id => onMoveWithinFolder('global', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript('global', id)"
        @delete-folder="id => onDeleteFolder('global', id)"
        @move-script-type="id => onMoveType('global', id)"
        @select-script="(id, selected) => onSelectScript('global', id, selected)"
        @select-folder="(id, selected) => onSelectFolder('global', id, selected)"
      />

      <div class="divider marginTop10 marginBot10"></div>
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">角色脚本库</div>
            <div id="character-batch-manager" class="batch-manager-btn" title="批量管理" @click="toggleBatchMode('character')">
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
      <div id="character-batch-controls" class="batch-controls" v-show="batchModeCharacter">
        <button id="character-batch-delete" class="TavernHelper-button batch-action-btn" @click="performBatchDelete('character')">
          <i class="fa-solid fa-trash margin-r5"></i>删除
        </button>
        <button id="character-batch-export" class="TavernHelper-button batch-action-btn" @click="performBatchExport('character')">
          <i class="fa-solid fa-file-export margin-r5"></i>导出
        </button>
        <button id="character-batch-move" class="TavernHelper-button batch-action-btn" @click="performBatchMove('character')">
          <i class="fa-solid fa-folder-open margin-r5"></i>移动到文件夹
        </button>
        <button id="character-batch-cancel" class="TavernHelper-button batch-action-btn" @click="exitBatchMode('character')">
          <i class="fa-solid fa-times margin-r5"></i>退出
        </button>
      </div>
      <ScriptList
        :repository="characterScriptStore.repository"
        :expanded-folders="expandedCharacterFolders"
        :is-searching="isSearching"
        repo-type="character"
        :batch-mode="batchModeCharacter"
        :selected-script-ids="selectedCharacterScripts"
        :selected-folder-ids="selectedCharacterFolders"
        @toggle-folder-expand="toggleCharacterFolderExpand"
        @toggle-folder-scripts="id => onToggleFolderScripts('character', id)"
        @edit-folder="id => onEditFolder('character', id)"
        @export-folder="id => onExportFolder('character', id)"
        @move-folder="id => onMoveFolderType('character', id)"
        @toggle-script="id => commands.toggleScriptEnabled('character', id)"
        @show-info="id => commands.showScriptInfo('character', id)"
        @edit-script="id => commands.editScript('character', id)"
        @move-script="id => onMoveWithinFolder('character', id)"
        @export-script="id => onExportSingle(id)"
        @delete-script="id => commands.confirmDeleteScript('character', id)"
        @delete-folder="id => onDeleteFolder('character', id)"
        @move-script-type="id => onMoveType('character', id)"
        @select-script="(id, selected) => onSelectScript('character', id, selected)"
        @select-folder="(id, selected) => onSelectFolder('character', id, selected)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { uuidv4 } from '@sillytavern/scripts/utils';
import { debounce } from 'lodash';
import { computed, onMounted, ref } from 'vue';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import { createDefaultScript, ScriptSchema, type Script } from '../schemas/script.schema';
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
    // 先选择导入目标（全局/角色）
    const popups = (await import('../composables/usePopups')).usePopups();
    const result = await popups.selectTarget({ title: '导入到:' });
    if (!result.confirmed || !result.data) return;
    const tgt = result.data.target as 'global' | 'character';

    const jsonScripts: any[] = [];
    let totalImported = 0;

    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.zip')) {
        const count = await importZipIntoSingleFolder(file, tgt);
        totalImported += count;
      } else {
        const content = await readFileAsText(file);
        try {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item && item.name && 'content' in item) {
                jsonScripts.push(item);
              }
            }
          } else if (parsed && parsed.name && 'content' in parsed) {
            jsonScripts.push(parsed);
          } else {
            jsonScripts.push({
              name: file.name.replace(/\.[^/.]+$/, ''),
              content,
              info: `从文件 ${file.name} 导入`,
            });
          }
        } catch {
          jsonScripts.push({
            name: file.name.replace(/\.[^/.]+$/, ''),
            content,
            info: `从文件 ${file.name} 导入`,
          });
        }
      }
    }

    if (jsonScripts.length > 0) {
      totalImported += await importScriptsWithConflictHandling(tgt, jsonScripts, null);
    }

    await commands.initRepository();
    toastr.success('导入成功', `已导入 ${totalImported} 个脚本`);
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

async function importZipIntoSingleFolder(file: File, type: 'global' | 'character'): Promise<number> {
  //@ts-ignore
  if (!window.JSZip) {
    await import('@sillytavern/lib/jszip.min.js');
  }
  //@ts-ignore
  const zip = new JSZip();
  const zipContent = await zip.loadAsync(file);

  const topLevelFolders = new Set<string>();
  const scripts: any[] = [];

  for (const fileName in zipContent.files) {
    const entry = zipContent.files[fileName];
    if (entry.dir) continue;
    if (!fileName.toLowerCase().endsWith('.json')) continue;

    const parts = fileName.split('/');
    if (parts.length > 1) {
      topLevelFolders.add(parts[0]);
    }

    const text = await entry.async('string');
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.name && 'content' in item) {
            scripts.push(item);
          }
        }
      } else if (parsed && parsed.name && 'content' in parsed) {
        scripts.push(parsed);
      }
    } catch {
      // ignore invalid JSON
    }
  }

  if (scripts.length === 0) return 0;

  let folderName = '';
  if (topLevelFolders.size > 0) {
    const names = Array.from(topLevelFolders).map(sanitizeName);
    folderName = names.join('_');
  } else {
    const base = file.name.replace(/\.zip$/i, '');
    folderName = sanitizeName(base);
  }
  if (!folderName) folderName = 'imported';

  const folderId = await repositoryService.createFolderInType(type, { name: folderName, target: type });

  // 冲突处理逐条导入
  const importedCount = await importScriptsWithConflictHandling(type, scripts, folderId);
  return importedCount;
}

function sanitizeName(name: string): string {
  return String(name || '').replace(/[<>:"\\/\\|?*]/g, '_');
}

// 规范化导入脚本数据，保留传入ID，按zod补全默认值
function normalizeImportedScript(raw: any): Script {
  const script = createDefaultScript({
    id: raw?.id, // 可能为undefined，内部将生成
    name: String(raw?.name || ''),
    content: String(raw?.content || ''),
    info: String(raw?.info || ''),
    enabled: false,
    buttons: Array.isArray(raw?.buttons) ? raw.buttons : [],
    data: raw?.data && typeof raw.data === 'object' ? raw.data : {},
  });
  // 再次校验
  ScriptSchema.parse(script);
  return script;
}

// 查找与给定ID冲突的现有脚本（优先全局，其次角色，复刻V1）
function findIdConflict(
  globalScripts: Script[],
  characterScripts: Script[],
  id: string,
): { existing: Script; existingType: 'global' | 'character' } | null {
  const conflictInGlobal = globalScripts.find(s => s.id === id);
  if (conflictInGlobal) return { existing: conflictInGlobal, existingType: 'global' };
  const conflictInCharacter = characterScripts.find(s => s.id === id);
  if (conflictInCharacter) return { existing: conflictInCharacter, existingType: 'character' };
  return null;
}

// 带冲突处理的逐条导入
async function importScriptsWithConflictHandling(
  type: 'global' | 'character',
  rawScripts: any[],
  folderId: string | null,
): Promise<number> {
  // 预加载两边仓库并扁平化
  const [globalRepo, characterRepo] = await Promise.all([
    repositoryService.loadRepositoryByType('global'),
    repositoryService.loadRepositoryByType('character'),
  ]);
  const globalScripts = repositoryService.getAllScripts(globalRepo);
  const characterScripts = repositoryService.getAllScripts(characterRepo);
  const popups = (await import('../composables/usePopups')).usePopups();

  let imported = 0;
  for (const raw of rawScripts) {
    const script = normalizeImportedScript(raw);

    // 仅当导入对象包含ID时才检查冲突
    if (raw && typeof raw.id === 'string' && raw.id.trim()) {
      const conflict = findIdConflict(globalScripts, characterScripts, script.id);
      if (conflict) {
        const decision = await popups.resolveImportIdConflict({
          scriptName: script.name,
          existingScriptName: conflict.existing.name,
          existingType: conflict.existingType,
        });

        if (decision === 'cancel') {
          continue; // 跳过
        }
        if (decision === 'override') {
          await repositoryService.deleteScriptInType(conflict.existingType, conflict.existing.id);
          await repositoryService.insertExistingScriptInType(type, script, folderId);
          imported++;
          continue;
        }
        if (decision === 'new') {
          script.id = uuidv4();
          await repositoryService.insertExistingScriptInType(type, script, folderId);
          imported++;
          continue;
        }
      } else {
        await repositoryService.insertExistingScriptInType(type, script, folderId);
        imported++;
        continue;
      }
    }

    // 无ID（或未提供ID）的情况：直接插入（createDefaultScript已分配新ID）
    await repositoryService.insertExistingScriptInType(type, script, folderId);
    imported++;
  }

  return imported;
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

  // 默认折叠所有文件夹
});

// 文件夹默认折叠，无需初始化展开状态

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
    const target: 'global' | 'character' = source === 'global' ? 'character' : 'global';
    const popups = (await import('../composables/usePopups')).usePopups();
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();

    // 获取源脚本
    const script = await repositoryService.getScriptFromType(source, scriptId);
    if (!script) {
      toastr.error('移动失败', '脚本不存在');
      return;
    }

    // 加载目标仓库，检测是否存在同ID
    const targetRepo = await repositoryService.loadRepositoryByType(target);
    const targetScripts = repositoryService.getAllScripts(targetRepo);
    const conflict = targetScripts.find(s => s.id === script.id);

    if (conflict) {
      const decision = await popups.resolveMoveIdConflict({
        scriptName: script.name,
        existingScriptName: conflict.name,
        target,
      });

      if (decision === 'cancel') return;

      if (decision === 'override') {
        // 先删除目标中的冲突脚本
        await repositoryService.deleteScriptInType(target, conflict.id);
        // 从源删除，再以原ID插入到目标根目录
        await repositoryService.deleteScriptInType(source, scriptId);
        await repositoryService.insertExistingScriptInType(target, script, null);
      } else if (decision === 'new') {
        // 从源删除，换新ID插入目标
        await repositoryService.deleteScriptInType(source, scriptId);
        script.id = uuidv4();
        await repositoryService.insertExistingScriptInType(target, script, null);
      }
    } else {
      // 无冲突：从源删除，保留ID插入目标
      await repositoryService.deleteScriptInType(source, scriptId);
      await repositoryService.insertExistingScriptInType(target, script, null);
    }

    // 刷新 stores 和命令层
    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();

    // 若脚本启用且目标类型开关启用，则立即启动脚本（复刻V1行为）
    const targetEnabled = target === 'global' ? globalScriptStore.enabled : characterScriptStore.enabled;
    if (script.enabled && targetEnabled) {
      await runtime.startScript(script.id, target);
    }

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

async function onMoveFolderType(source: 'global' | 'character', folderId: string): Promise<void> {
  try {
    await repositoryService.moveFolderToOtherType(folderId, source);
    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success('移动成功', '文件夹已移动到另一脚本库');
  } catch (error) {
    console.error('移动失败:', error);
    toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onEditFolder(type: 'global' | 'character', folderId: string): Promise<void> {
  try {
    // 查找当前文件夹数据
    const repo = await repositoryService.loadRepositoryByType(type);
    const folder = repo.find(item => (item as any).type === 'folder' && (item as any).id === folderId) as any;
    if (!folder) {
      toastr.error('编辑失败', '找不到指定文件夹');
      return;
    }

    const popups = (await import('../composables/usePopups')).usePopups();
    const result = await popups.editFolder({
      name: String(folder.name || ''),
      icon: String(folder.icon || ''),
      color: String(folder.color || ''),
      target: type,
    } as any);

    if (!result.confirmed || !result.data) return;

    await repositoryService.updateFolderInType(type, folderId, {
      name: result.data.name,
      icon: result.data.icon,
      color: result.data.color,
    });

    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success('保存成功', '文件夹已更新');
  } catch (error) {
    console.error('编辑失败:', error);
    toastr.error('编辑失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onExportFolder(type: 'global' | 'character', folderId: string): Promise<void> {
  try {
    // 导出文件夹为ZIP，参考V1逻辑
    const repo = await repositoryService.loadRepositoryByType(type);
    const scripts = repositoryService.getFolderScripts(repo, folderId);

    const folderItem = repo.find(item => (item as any)?.type === 'folder' && (item as any)?.id === folderId) as any;
    const folderName = String(folderItem?.name || 'folder');
    const sanitizedFolderName = folderName.replace(/[<>:"/\\|?*]/g, '_');

    //@ts-ignore
    if (!window.JSZip) {
      await import('@sillytavern/lib/jszip.min.js');
    }
    //@ts-ignore
    const zip = new JSZip();

    if (Array.isArray(scripts) && scripts.length > 0) {
      for (const script of scripts) {
        const scriptData = {
          name: script.name,
          content: script.content,
          info: script.info,
          buttons: script.buttons,
          data: script.data,
        };
        const scriptFileName = `${String(script.name || 'script').replace(/[<>:"/\\|?*]/g, '_')}.json`;
        zip.file(`${sanitizedFolderName}/${scriptFileName}`, JSON.stringify(scriptData, null, 2));
      }
    } else {
      toastr.error('导出失败', '文件夹内没有脚本');
      return;
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const typeName = type === 'global' ? 'global' : 'character';
    const filename = `folder_${sanitizedFolderName}_${typeName}_${timestamp}.zip`;

    const url = URL.createObjectURL(zipBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastr.success('导出成功', `文件夹 "${folderName}" 已导出`);
  } catch (error) {
    console.error('导出失败:', error);
    toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onDeleteFolder(type: 'global' | 'character', folderId: string): Promise<void> {
  try {
    const popups = (await import('../composables/usePopups')).usePopups();
    const confirmed = await popups.confirmDelete('确定要删除该文件夹及其内的所有脚本吗？此操作不可撤销。');
    if (!confirmed) return;

    await repositoryService.deleteFolderInType(type, folderId);
    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success('删除成功', '文件夹已删除');
  } catch (error) {
    console.error('删除失败:', error);
    toastr.error('删除失败', error instanceof Error ? error.message : '未知错误');
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

// ===== 批量模式与选择 =====
const batchModeGlobal = ref(false);
const batchModeCharacter = ref(false);

const selectedGlobalScripts = ref<Set<string>>(new Set());
const selectedGlobalFolders = ref<Set<string>>(new Set());
const selectedCharacterScripts = ref<Set<string>>(new Set());
const selectedCharacterFolders = ref<Set<string>>(new Set());

function toggleBatchMode(type: 'global' | 'character'): void {
  if (type === 'global') {
    batchModeGlobal.value = !batchModeGlobal.value;
    if (!batchModeGlobal.value) clearSelections('global');
  } else {
    batchModeCharacter.value = !batchModeCharacter.value;
    if (!batchModeCharacter.value) clearSelections('character');
  }
}

function exitBatchMode(type: 'global' | 'character'): void {
  if (type === 'global') {
    batchModeGlobal.value = false;
  } else {
    batchModeCharacter.value = false;
  }
  clearSelections(type);
}

function clearSelections(type: 'global' | 'character'): void {
  if (type === 'global') {
    selectedGlobalScripts.value.clear();
    selectedGlobalFolders.value.clear();
  } else {
    selectedCharacterScripts.value.clear();
    selectedCharacterFolders.value.clear();
  }
}

function onSelectScript(type: 'global' | 'character', id: string, selected: boolean): void {
  const set = type === 'global' ? selectedGlobalScripts.value : selectedCharacterScripts.value;
  if (selected) set.add(id);
  else set.delete(id);
}

function onSelectFolder(type: 'global' | 'character', id: string, selected: boolean): void {
  const set = type === 'global' ? selectedGlobalFolders.value : selectedCharacterFolders.value;
  if (selected) set.add(id);
  else set.delete(id);
}

function getSelectedIds(type: 'global' | 'character'): { scriptIds: string[]; folderIds: string[] } {
  if (type === 'global') {
    return {
      scriptIds: Array.from(selectedGlobalScripts.value),
      folderIds: Array.from(selectedGlobalFolders.value),
    };
  }
  return {
    scriptIds: Array.from(selectedCharacterScripts.value),
    folderIds: Array.from(selectedCharacterFolders.value),
  };
}

async function performBatchDelete(type: 'global' | 'character'): Promise<void> {
  const { scriptIds, folderIds } = getSelectedIds(type);
  if (scriptIds.length === 0 && folderIds.length === 0) {
    toastr.error('请先选择要删除的脚本或文件夹');
    return;
  }

  const popups = (await import('../composables/usePopups')).usePopups();
  const confirmed = await popups.confirmDelete(`确定要删除选中的 ${scriptIds.length + folderIds.length} 个项目吗？此操作不可撤销。`);
  if (!confirmed) return;

  try {
    // 删除脚本
    await Promise.all(
      scriptIds.map(id => repositoryService.deleteScriptInType(type, id)),
    );

    // 删除文件夹
    await Promise.all(
      folderIds.map(id => repositoryService.deleteFolderInType(type, id)),
    );

    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success('删除成功');
    exitBatchMode(type);
  } catch (error) {
    console.error('批量删除失败:', error);
    toastr.error('批量删除失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function performBatchExport(type: 'global' | 'character'): Promise<void> {
  const { scriptIds, folderIds } = getSelectedIds(type);
  if (scriptIds.length === 0 && folderIds.length === 0) {
    toastr.error('请先选择要导出的脚本或文件夹');
    return;
  }

  try {
    // 展开文件夹内脚本
    const repo = await repositoryService.loadRepositoryByType(type);
    const folderScriptIds: string[] = [];
    for (const folderId of folderIds) {
      const folderScripts = repositoryService.getFolderScripts(repo, folderId);
      folderScriptIds.push(...folderScripts.map(s => s.id));
    }

    const allScriptIds = Array.from(new Set([...scriptIds, ...folderScriptIds]));
    const exported = await repositoryService.exportScripts(allScriptIds, type);

    if (exported.length === 0) {
      toastr.error('导出失败', '没有可导出的脚本');
      return;
    }

    const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'scripts-export.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toastr.success('导出成功');
  } catch (error) {
    console.error('批量导出失败:', error);
    toastr.error('批量导出失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function performBatchMove(type: 'global' | 'character'): Promise<void> {
  const { scriptIds, folderIds } = getSelectedIds(type);
  if (folderIds.length > 0) {
    toastr.error('不能移动文件夹，请只选择脚本进行移动操作');
    return;
  }
  if (scriptIds.length === 0) {
    toastr.error('请至少选择一个脚本进行移动');
    return;
  }

  try {
    // 获取当前类型的所有文件夹
    const repo = await repositoryService.loadRepositoryByType(type);
    const folders = repositoryService.getAllFolders(repo);
    
    if (folders.length === 0) {
      toastr.error('没有可用的文件夹，请先创建一个文件夹');
      return;
    }

    // 格式化文件夹数据
    const folderOptions = folders.map(folder => ({
      id: folder.id || '',
      name: folder.name || '未命名文件夹',
    }));

    const popups = (await import('../composables/usePopups')).usePopups();
    const result = await popups.selectFolder({
      title: '选择要移动到的文件夹：',
      folders: folderOptions,
      allowRoot: true,
    });

    if (!result.confirmed) return;

    const targetFolderId = result.data ?? null;

    // 批量移动脚本
    for (const scriptId of scriptIds) {
      await repositoryService.moveScriptWithinType(type, scriptId, targetFolderId);
    }

    const targetName = targetFolderId 
      ? folders.find(f => f.id === targetFolderId)?.name || '未知文件夹' 
      : '根目录';

    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    await commands.initRepository();
    toastr.success(`成功将 ${scriptIds.length} 个脚本移动到"${targetName}"`);
    exitBatchMode(type);
  } catch (error) {
    console.error('批量移动失败:', error);
    toastr.error('批量移动失败', error instanceof Error ? error.message : '未知错误');
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
