import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';
import { ref } from 'vue';
import { repositoryService } from '../services/repository.service';
import { useCharacterScriptStore, useGlobalScriptStore, usePresetScriptStore } from '../stores/factory';

export function useBatchActions(repoType: ScriptType) {
  const isBatchMode = ref(false);
  const selectedScripts = ref<Set<string>>(new Set());
  const selectedFolders = ref<Set<string>>(new Set());

  const globalScriptStore = useGlobalScriptStore();
  const characterScriptStore = useCharacterScriptStore();
  const presetScriptStore = usePresetScriptStore();

  // keep for potential future enhancements

  function toggleBatchMode(): void {
    isBatchMode.value = !isBatchMode.value;
    if (!isBatchMode.value) clearSelections();
  }

  function enterBatchMode(): void {
    isBatchMode.value = true;
  }

  function exitBatchMode(): void {
    isBatchMode.value = false;
    clearSelections();
  }

  function clearSelections(): void {
    selectedScripts.value.clear();
    selectedFolders.value.clear();
  }

  function onSelectScript(id: string, selected: boolean): void {
    if (selected) selectedScripts.value.add(id);
    else selectedScripts.value.delete(id);
  }

  function onSelectFolder(id: string, selected: boolean): void {
    if (selected) selectedFolders.value.add(id);
    else selectedFolders.value.delete(id);
  }

  function getSelectedIds(): { scriptIds: string[]; folderIds: string[] } {
    return {
      scriptIds: Array.from(selectedScripts.value),
      folderIds: Array.from(selectedFolders.value),
    };
  }

  async function performBatchDelete(): Promise<void> {
    const { scriptIds, folderIds } = getSelectedIds();
    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.error('请先选择要删除的脚本或文件夹');
      return;
    }

    const popups = (await import('./usePopups')).usePopups();
    const confirmed = await popups.confirmDelete(
      `确定要删除选中的 ${scriptIds.length + folderIds.length} 个项目吗？此操作不可撤销。`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(scriptIds.map(id => repositoryService.deleteScriptInType(repoType, id)));
      await Promise.all(folderIds.map(id => repositoryService.deleteFolderInType(repoType, id)));

      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      const { useScriptRepoCommands } = await import('./useScriptRepoCommands');
      const commands = useScriptRepoCommands();
      await commands.initRepository();
      toastr.success('删除成功');
      exitBatchMode();
    } catch (error) {
      console.error('批量删除失败:', error);
      toastr.error('批量删除失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function performBatchExport(): Promise<void> {
    const { scriptIds, folderIds } = getSelectedIds();
    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.error('请先选择要导出的脚本或文件夹');
      return;
    }

    try {
      const repo = repositoryService.loadRepositoryByType(repoType);
      const folderScriptIds: string[] = [];
      for (const folderId of folderIds) {
        const folderScripts = repositoryService.getFolderScripts(repo, folderId);
        folderScriptIds.push(...folderScripts.map(s => s.id));
      }

      const allScriptIds = Array.from(new Set([...scriptIds, ...folderScriptIds]));

      // 使用统一的导出方法，自动处理文件生成和下载
      await repositoryService.exportScripts(allScriptIds, repoType, 'batch');
      toastr.success('导出成功');
    } catch (error) {
      console.error('批量导出失败:', error);
      toastr.error('批量导出失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  async function performBatchMove(): Promise<void> {
    const { scriptIds, folderIds } = getSelectedIds();
    if (folderIds.length > 0) {
      toastr.error('不能移动文件夹，请只选择脚本进行移动操作');
      return;
    }
    if (scriptIds.length === 0) {
      toastr.error('请至少选择一个脚本进行移动');
      return;
    }

    try {
      const repo = await repositoryService.loadRepositoryByType(repoType);
      const folders = repositoryService.getAllFolders(repo);
      if (folders.length === 0) {
        toastr.error('没有可用的文件夹，请先创建一个文件夹');
        return;
      }

      const folderOptions = folders.map(folder => ({
        id: folder.id || '',
        name: folder.name || '未命名文件夹',
      }));

      const popups = (await import('./usePopups')).usePopups();
      const result = await popups.selectFolder({
        title: '选择要移动到的文件夹：',
        folders: folderOptions,
        allowRoot: true,
      });
      if (!result.confirmed) return;

      const targetFolderId = result.data ?? null;
      for (const scriptId of scriptIds) {
        await repositoryService.moveScriptWithinType(repoType, scriptId, targetFolderId);
      }

      const targetName = targetFolderId ? folders.find(f => f.id === targetFolderId)?.name || '未知文件夹' : '根目录';

      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      const { useScriptRepoCommands } = await import('./useScriptRepoCommands');
      const commands = useScriptRepoCommands();
      await commands.initRepository();
      toastr.success(`成功将 ${scriptIds.length} 个脚本移动到"${targetName}"`);
      exitBatchMode();
    } catch (error) {
      console.error('批量移动失败:', error);
      toastr.error('批量移动失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  return {
    // state
    isBatchMode,
    selectedScripts,
    selectedFolders,

    // actions
    toggleBatchMode,
    enterBatchMode,
    exitBatchMode,
    onSelectScript,
    onSelectFolder,
    performBatchDelete,
    performBatchExport,
    performBatchMove,
  };
}
