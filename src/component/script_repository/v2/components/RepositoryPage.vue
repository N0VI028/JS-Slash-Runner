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
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">全局脚本库</div>
            <div id="global-batch-manager" class="batch-manager-btn" title="批量管理" @click="toggleBatchModeGlobal">
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
      <BatchControls
        repo-type="global"
        v-show="batchModeGlobal"
        @batch-delete="performBatchDeleteGlobal"
        @batch-export="performBatchExportGlobal"
        @batch-move="performBatchMoveGlobal"
        @batch-cancel="exitBatchModeGlobal"
      />
      <ScriptList
        :repository="globalScriptStore.repository"
        :expanded-folders="expandedGlobalFolders"
        :is-searching="isSearching"
        repo-type="global"
        :search-keyword="searchQuery"
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
        @select-script="(id, selected) => onSelectScriptGlobal(id, selected)"
        @select-folder="(id, selected) => onSelectFolderGlobal(id, selected)"
      />

      <div class="divider marginTop10 marginBot10"></div>
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">角色脚本库</div>
            <div
              id="character-batch-manager"
              class="batch-manager-btn"
              title="批量管理"
              @click="toggleBatchModeCharacter"
            >
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
      <BatchControls
        repo-type="character"
        v-show="batchModeCharacter"
        @batch-delete="performBatchDeleteCharacter"
        @batch-export="performBatchExportCharacter"
        @batch-move="performBatchMoveCharacter"
        @batch-cancel="exitBatchModeCharacter"
      />
      <ScriptList
        :repository="characterScriptStore.repository"
        :expanded-folders="expandedCharacterFolders"
        :is-searching="isSearching"
        repo-type="character"
        :search-keyword="searchQuery"
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
        @select-script="(id, selected) => onSelectScriptCharacter(id, selected)"
        @select-folder="(id, selected) => onSelectFolderCharacter(id, selected)"
      />

      <!-- 预设脚本区（放在角色脚本库下方） -->
      <div class="divider marginTop10 marginBot10"></div>
      <div class="extension-content-item">
        <div class="flex flexFlowColumn">
          <div class="flex alignItemsCenter">
            <div class="settings-title-text">预设脚本库</div>
            <div id="preset-batch-manager" class="batch-manager-btn" title="批量管理" @click="toggleBatchModePreset">
              <i class="fa-solid fa-cog"></i>
            </div>
          </div>
          <div class="settings-title-description">预设脚本配置管理</div>
        </div>
        <div class="toggle-switch marginLeft5">
          <input
            type="checkbox"
            id="preset-script-enable-toggle"
            class="toggle-input"
            :checked="presetEnabled"
            @change="onToggleType('preset', $event)"
          />
          <label for="preset-script-enable-toggle" class="toggle-label">
            <span class="toggle-handle"></span>
          </label>
        </div>
      </div>
      <BatchControls
        repo-type="preset"
        v-show="batchModePreset"
        @batch-delete="performBatchDeletePreset"
        @batch-export="performBatchExportPreset"
        @batch-move="performBatchMovePreset"
        @batch-cancel="exitBatchModePreset"
      />
      <ScriptList
        :repository="presetRepository"
        :expanded-folders="new Set()"
        :is-searching="isSearching"
        repo-type="preset"
        :search-keyword="searchQuery"
        :batch-mode="batchModePreset"
        :selected-script-ids="selectedPresetScripts"
        :selected-folder-ids="selectedPresetFolders"
        @toggle-folder-expand="() => {}"
        @toggle-folder-scripts="id => onTogglePresetFolderScripts(id)"
        @edit-folder="() => {}"
        @export-folder="() => {}"
        @move-folder="id => onMoveFolderType('preset', id)"
        @toggle-script="id => onTogglePresetScript(id)"
        @show-info="id => onShowPresetScriptInfo(id)"
        @edit-script="id => commands.editScript('preset', id)"
        @move-script="id => onMovePresetWithinFolder(id)"
        @export-script="id => onExportPresetSingle(id)"
        @delete-script="id => onDeletePresetScript(id)"
        @move-script-type="id => onMovePresetType(id)"
        @select-script="(id, selected) => onSelectScriptPreset(id, selected)"
        @select-folder="(id, selected) => onSelectFolderPreset(id, selected)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { uuidv4 } from '@sillytavern/scripts/utils';
import { debounce } from 'lodash';
import { computed, onMounted, ref } from 'vue';
import { useBatchActions } from '../composables/useBatchActions';
import { useImporter } from '../composables/useImporter';
import { useScriptRepoCommands } from '../composables/useScriptRepoCommands';
import { repositoryService } from '../services/repository.service';
import { useCharacterScriptStore } from '../stores/characterScript.store';
import { useGlobalScriptStore } from '../stores/globalScript.store';
import { usePresetScriptStore } from '../stores/presetScript.store';
import BatchControls from './BatchControls.vue';
import RepositoryToolbar from './RepositoryToolbar.vue';
import ScriptList from './ScriptList.vue';

const commands = useScriptRepoCommands();
const globalScriptStore = useGlobalScriptStore();
const characterScriptStore = useCharacterScriptStore();
const presetScriptStore = usePresetScriptStore();

const searchQuery = ref('');
const fileInput = ref<HTMLInputElement>();
const { importFiles } = useImporter();

// 使用分离的 store 数据
const expandedGlobalFolders = ref<Set<string>>(new Set());
const expandedCharacterFolders = ref<Set<string>>(new Set());

// 从各自的 store 获取数据
const globalEnabled = computed(() => globalScriptStore.enabled);
const characterEnabled = computed(() => characterScriptStore.enabled);
const presetEnabled = computed(() => presetScriptStore.enabled);

const isSearching = computed(() => searchQuery.value.trim().length > 0);

// 预设区数据
const presetRepository = computed(() => presetScriptStore.repository);

const handleSearch = debounce(() => {
  // 将搜索关键字下放到各自的 store
  globalScriptStore.setFilters({ keyword: searchQuery.value });
  characterScriptStore.setFilters({ keyword: searchQuery.value });
}, 300);

function onToolbarSearch(value: string): void {
  searchQuery.value = value;
  handleSearch();
}

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
  await importFiles(files);
  target.value = '';
};

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

async function onToggleType(type: 'global' | 'character' | 'preset', event: Event): Promise<void> {
  const checked = (event.target as HTMLInputElement).checked;

  // 先更新本地开关状态
  if (type === 'global') {
    globalScriptStore.setEnabled(checked);
  } else {
    if (type === 'character') {
      characterScriptStore.setEnabled(checked);
    } else {
      presetScriptStore.setEnabled(checked);
    }
  }

  // 使用V2专用的运行时管理器批量切换
  try {
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();
    await runtime.toggleScriptsByType(type as any, checked);
  } catch (err) {
    console.warn('切换脚本类型运行态失败:', err);
  }
}

// ===== 预设脚本行为与角色一致 =====
async function onTogglePresetScript(scriptId: string): Promise<void> {
  try {
    const script = presetScriptStore.getScript(scriptId);
    if (!script) return;
    const next = !script.enabled;
    await presetScriptStore.updateScript(scriptId, { enabled: next });
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();
    if (next) {
      await runtime.startScript(scriptId, 'preset' as any);
    } else {
      await runtime.stopScript(scriptId, 'preset' as any);
    }
  } catch (err) {
    console.warn('切换预设脚本失败:', err);
  }
}

async function onShowPresetScriptInfo(scriptId: string): Promise<void> {
  const script = presetScriptStore.getScript(scriptId);
  if (script) {
    const { usePopups } = await import('../composables/usePopups');
    await usePopups().showScriptInfo(script);
  }
}

// 删除单独的onEditPresetScript函数，现在使用统一的editScript

async function onMovePresetWithinFolder(scriptId: string): Promise<void> {
  const { usePopups } = await import('../composables/usePopups');
  const input = await usePopups().promptText('输入目标文件夹ID（留空则移动到根）');
  if (!input.confirmed) return;
  const folderId = input.data?.trim() || null;
  await presetScriptStore.moveScript(scriptId, folderId);
}

async function onExportPresetSingle(scriptId: string): Promise<void> {
  const scripts = await repositoryService.exportScripts([scriptId], 'preset' as any);
  if (scripts.length === 0) {
    toastr.error('导出失败', '找不到指定脚本');
    return;
  }
  const blob = new Blob([JSON.stringify(scripts[0], null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `preset-script-${scriptId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  toastr.success('导出成功', '脚本已导出');
}

async function onDeletePresetScript(scriptId: string): Promise<void> {
  const { usePopups } = await import('../composables/usePopups');
  const confirmed = await usePopups().confirmDelete('确定要删除该脚本吗？此操作不可撤销。');
  if (!confirmed) return;
  await presetScriptStore.deleteScript(scriptId);
  toastr.success('删除成功', '脚本已删除');
}

async function onMovePresetType(scriptId: string): Promise<void> {
  try {
    const popups = (await import('../composables/usePopups')).usePopups();
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();

    // 获取源脚本
    const script = await repositoryService.getScriptFromType('preset' as any, scriptId);
    if (!script) {
      toastr.error('移动失败', '脚本不存在');
      return;
    }

    // 选择目标类型（不包含预设）
    const selection = await popups.selectTarget({ title: '移动到:', showPresetOption: false });
    if (!selection.confirmed || !selection.data) return;
    const target = selection.data.target as 'global' | 'character';
    if (target !== 'global' && target !== 'character') return;

    // 检测冲突
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
        await repositoryService.deleteScriptInType(target, conflict.id);
        await repositoryService.deleteScriptInType('preset' as any, scriptId);
        await repositoryService.insertExistingScriptInType(target, script, null);
      } else if (decision === 'new') {
        await repositoryService.deleteScriptInType('preset' as any, scriptId);
        script.id = uuidv4();
        await repositoryService.insertExistingScriptInType(target, script, null);
      }
    } else {
      await repositoryService.deleteScriptInType('preset' as any, scriptId);
      await repositoryService.insertExistingScriptInType(target, script, null);
    }

    await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
    await commands.initRepository();

    if (script.enabled) {
      const targetEnabled = target === 'global' ? globalScriptStore.enabled : characterScriptStore.enabled;
      if (targetEnabled) {
        await runtime.startScript(script.id, target);
      }
    }

    toastr.success('移动成功', '脚本已移动到另一脚本库');
  } catch (error) {
    console.error('移动失败:', error);
    toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onTogglePresetFolderScripts(folderId: string): Promise<void> {
  try {
    const folderScripts = presetScriptStore.getFolderScripts(folderId);
    if (folderScripts.length === 0) return;
    const allEnabled = folderScripts.every(s => s.enabled);
    const target = !allEnabled;
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();
    await runtime.toggleFolderScripts(folderId, 'preset' as any, target);
    toastr.success(
      `${target ? '启用' : '禁用'}成功`,
      `已${target ? '启用' : '禁用'}文件夹内${folderScripts.length}个脚本`,
    );
  } catch (error) {
    console.error('预设文件夹脚本切换失败:', error);
    toastr.error('操作失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onMoveType(source: 'global' | 'character', scriptId: string): Promise<void> {
  try {
    const popups = (await import('../composables/usePopups')).usePopups();
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();

    // 获取源脚本
    const script = await repositoryService.getScriptFromType(source, scriptId);
    if (!script) {
      toastr.error('移动失败', '脚本不存在');
      return;
    }

    // 选择目标类型（包含预设脚本库）
    const selection = await popups.selectTarget({ title: '移动到:', showPresetOption: true });
    if (!selection.confirmed || !selection.data) return;
    const targetSel = selection.data.target as 'global' | 'character' | 'preset';

    // 加载目标仓库，检测是否存在同ID
    const targetRepo = await repositoryService.loadRepositoryByType(targetSel as any);
    const targetScripts = repositoryService.getAllScripts(targetRepo);
    const conflict = targetScripts.find(s => s.id === script.id);

    if (conflict) {
      const decision = await popups.resolveMoveIdConflict({
        scriptName: script.name,
        existingScriptName: conflict.name,
        target: targetSel === 'preset' ? 'global' : (targetSel as 'global' | 'character'),
      });

      if (decision === 'cancel') return;

      if (decision === 'override') {
        // 先删除目标中的冲突脚本
        await repositoryService.deleteScriptInType((targetSel === 'preset' ? 'global' : targetSel) as any, conflict.id);
        // 从源删除，再以原ID插入到目标根目录
        await repositoryService.deleteScriptInType(source, scriptId);
        await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
      } else if (decision === 'new') {
        // 从源删除，换新ID插入目标
        await repositoryService.deleteScriptInType(source, scriptId);
        script.id = uuidv4();
        await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
      }
    } else {
      // 无冲突：从源删除，保留ID插入目标
      await repositoryService.deleteScriptInType(source, scriptId);
      await repositoryService.insertExistingScriptInType(targetSel as any, script, null);
    }

    // 刷新 stores 和命令层
    await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
    await commands.initRepository();

    // 若脚本启用且目标类型开关启用，则立即启动脚本
    if (script.enabled) {
      if (targetSel === 'global' && globalScriptStore.enabled) {
        await runtime.startScript(script.id, 'global' as any);
      } else if (targetSel === 'character' && characterScriptStore.enabled) {
        await runtime.startScript(script.id, 'character' as any);
      } else if (targetSel === 'preset' && presetScriptStore.enabled) {
        await runtime.startScript(script.id, 'preset' as any);
      }
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
    // 使用统一的 InType 方法
    await repositoryService.moveScriptWithinType(source, scriptId, folderId);

    await Promise.all([globalScriptStore.init(), characterScriptStore.init()]);
    toastr.success('已移动', folderId ? '脚本已移动到目标文件夹' : '脚本已移动到根目录');
  } catch (error) {
    console.error('移动失败:', error);
    toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
  }
}

async function onMoveFolderType(source: 'global' | 'character' | 'preset', folderId: string): Promise<void> {
  try {
    const popups = (await import('../composables/usePopups')).usePopups();
    const { useScriptRuntime } = await import('../composables/useScriptRuntime');
    const runtime = useScriptRuntime();

    // 获取源文件夹
    const sourceRepo = await repositoryService.loadRepositoryByType(source);
    const folder = repositoryService.getAllFolders(sourceRepo).find(f => f.id === folderId);
    if (!folder) {
      toastr.error('移动失败', '文件夹不存在');
      return;
    }

    // 选择目标类型（包含预设）
    const selection = await popups.selectTarget({ title: '移动文件夹到:', showPresetOption: true });
    if (!selection.confirmed || !selection.data) return;
    const targetSel = selection.data.target as 'global' | 'character' | 'preset';

    // 仅允许 -> global/character/preset
    if (targetSel !== 'global' && targetSel !== 'character' && targetSel !== 'preset') return;

    // 如果目标与源相同，不进行移动
    if (targetSel === source) {
      toastr.info('移动取消', '目标库与源库相同');
      return;
    }

    // 冲突检查：仅与目标仓库比对（全库唯一需求，按你要求只检查目标仓库即可）
    const targetRepoBefore = await repositoryService.loadRepositoryByType(targetSel as any);
    const targetAllScripts = repositoryService.getAllScripts(targetRepoBefore);

    // 获取该文件夹内的脚本
    const folderScripts = repositoryService.getFolderScripts(sourceRepo, folderId);

    // 逐个脚本在目标仓库检查ID冲突，按V1脚本移动的弹窗逻辑处理
    for (const script of folderScripts) {
      const conflict = targetAllScripts.find(s => s.id === script.id);
      if (!conflict) continue;

      const decision = await popups.resolveMoveIdConflict({
        scriptName: script.name,
        existingScriptName: conflict.name,
        target: targetSel,
      });

      if (decision === 'cancel') {
        toastr.info('已取消移动', `脚本 "${script.name}" 与目标冲突，用户取消`);
        return;
      }

      if (decision === 'override') {
        // 删除目标中的冲突脚本
        await repositoryService.deleteScriptInType(targetSel as any, conflict.id);
      } else if (decision === 'new') {
        // 换新ID插入目标
        script.id = uuidv4();
      }
    }

    // 执行移动（支持移动到 preset）
    await repositoryService.moveFolderBetweenTypes(
      folderId,
      source as any,
      targetSel as any,
      async ({ script, conflict, target }) => {
        const decision = await popups.resolveMoveIdConflict({
          scriptName: script.name,
          existingScriptName: conflict.name,
          target,
        });
        return decision;
      },
    );

    // 刷新仓库
    await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
    await commands.initRepository();

    // 移动后启动：总开关与目标类型开关必须开启，且脚本本身为enabled
    const masterEnabled = (await import('@/util/extension_variables')).getSettingValue('enabled_extension');
    if (masterEnabled) {
      const targetEnabled =
        targetSel === 'global'
          ? globalScriptStore.enabled
          : targetSel === 'character'
          ? characterScriptStore.enabled
          : presetScriptStore.enabled;

      if (targetEnabled) {
        const targetRepoAfter = await repositoryService.loadRepositoryByType(targetSel as any);
        const folderInTarget = repositoryService.getAllFolders(targetRepoAfter).find(f => f.id === folderId);
        if (folderInTarget && Array.isArray((folderInTarget as any).value)) {
          const scripts = (folderInTarget as any).value.filter((i: any) => i?.type === 'script').map((i: any) => i.value);
          for (const s of scripts) {
            if (s?.enabled) {
              await runtime.startScript(s.id, targetSel as any);
            }
          }
        }
      }
    }

    const targetName = targetSel === 'global' ? '全局脚本库' : targetSel === 'character' ? '角色脚本库' : '预设脚本库';
    toastr.success('移动成功', `文件夹"${folder.name}"已移动到${targetName}`);
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
    const { blob, filename, folderName } = await repositoryService.exportFolderToZip(type, folderId);
    const url = URL.createObjectURL(blob);
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

    const scripts = await repositoryService.exportScripts([scriptId], type);
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

// ===== 批量模式与选择（抽离到 composables） =====
const {
  isBatchMode: batchModeGlobal,
  selectedScripts: selectedGlobalScripts,
  selectedFolders: selectedGlobalFolders,
  toggleBatchMode: toggleBatchModeGlobal,
  exitBatchMode: exitBatchModeGlobal,
  onSelectScript: onSelectScriptGlobal,
  onSelectFolder: onSelectFolderGlobal,
  performBatchDelete: performBatchDeleteGlobal,
  performBatchExport: performBatchExportGlobal,
  performBatchMove: performBatchMoveGlobal,
} = useBatchActions('global');

const {
  isBatchMode: batchModeCharacter,
  selectedScripts: selectedCharacterScripts,
  selectedFolders: selectedCharacterFolders,
  toggleBatchMode: toggleBatchModeCharacter,
  exitBatchMode: exitBatchModeCharacter,
  onSelectScript: onSelectScriptCharacter,
  onSelectFolder: onSelectFolderCharacter,
  performBatchDelete: performBatchDeleteCharacter,
  performBatchExport: performBatchExportCharacter,
  performBatchMove: performBatchMoveCharacter,
} = useBatchActions('character');

const {
  isBatchMode: batchModePreset,
  selectedScripts: selectedPresetScripts,
  selectedFolders: selectedPresetFolders,
  toggleBatchMode: toggleBatchModePreset,
  exitBatchMode: exitBatchModePreset,
  onSelectScript: onSelectScriptPreset,
  onSelectFolder: onSelectFolderPreset,
  performBatchDelete: performBatchDeletePreset,
  performBatchExport: performBatchExportPreset,
  performBatchMove: performBatchMovePreset,
} = useBatchActions('preset');
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
