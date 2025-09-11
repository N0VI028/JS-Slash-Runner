import type { Script, ScriptType } from '@/component/script_repository/schemas/script.schema';
import { repositoryService } from '@/component/script_repository/services/repository.service';
import { getStoreByType } from '@/component/script_repository/stores/factory';
import { computed } from 'vue';

/**
 * 批量操作
 * @param repoType 脚本类型
 * @returns 批量操作
 */
export function useBatchActions(repoType: ScriptType) {
  const storeByType = getStoreByType();
  const currentStore = computed(() => storeByType[repoType]);

  /**
   * 切换批量模式
   */
  function toggleBatchMode(): void {
    currentStore.value.toggleBatchMode();
  }

  /**
   * 进入批量模式
   */
  function enterBatchMode(): void {
    currentStore.value.enterBatchMode();
  }

  /**
   * 退出批量模式
   */
  function exitBatchMode(): void {
    currentStore.value.exitBatchMode();
  }

  /**
   * 选择脚本
   */
  function onSelectScript(id: string, selected: boolean): void {
    currentStore.value.selectScript(id, selected);
  }

  /**
   * 选择文件夹
   */
  function onSelectFolder(id: string, selected: boolean): void {
    currentStore.value.selectFolder(id, selected);
  }

  /**
   * 获取选中的ID
   */
  function getSelectedIds(): { scriptIds: string[]; folderIds: string[] } {
    return {
      scriptIds: Array.from(currentStore.value.selectedScriptIds),
      folderIds: Array.from(currentStore.value.selectedFolderIds),
    };
  }

  /**
   * 执行批量删除
   */
  async function performBatchDelete(): Promise<void> {
    const { scriptIds, folderIds } = getSelectedIds();
    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.error('请先选择要删除的脚本或文件夹');
      return;
    }

    const popups = (await import('@/component/script_repository/composables/usePopups')).usePopups();
    const confirmed = await popups.confirmDelete(
      `确定要删除选中的 ${scriptIds.length + folderIds.length} 个项目吗？此操作不可撤销。`,
    );
    if (!confirmed) return;

    try {
      await Promise.all(scriptIds.map(id => repositoryService.deleteScriptInType(repoType, id)));
      await Promise.all(folderIds.map(id => repositoryService.deleteFolderInType(repoType, id)));

      toastr.success('删除成功');
      exitBatchMode();
    } catch (error) {
      console.error('批量删除失败:', error);
      toastr.error('批量删除失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 执行批量导出
   */
  async function performBatchExport(): Promise<void> {
    const { scriptIds, folderIds } = getSelectedIds();
    if (scriptIds.length === 0 && folderIds.length === 0) {
      toastr.error('请先选择要导出的脚本或文件夹');
      return;
    }

    try {
      const folderScriptIds: string[] = [];
      for (const folderId of folderIds) {
        const folderScripts = currentStore.value.getFolderScripts(folderId);
        folderScriptIds.push(...folderScripts.map((s: Script) => s.id));
      }

      const allScriptIds = Array.from(new Set([...scriptIds, ...folderScriptIds]));

      await repositoryService.exportScripts(allScriptIds, repoType, 'batch');
      toastr.success('导出成功');
    } catch (error) {
      console.error('批量导出失败:', error);
      toastr.error('批量导出失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  /**
   * 执行批量移动
   */
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
      const repo = repositoryService.loadRepositoryByType(repoType);
      const folders = repo.filter((item: any) => item.type === 'folder');
      if (folders.length === 0) {
        toastr.error('没有可用的文件夹，请先创建一个文件夹');
        return;
      }

      const folderOptions = folders.map((folder: any) => ({
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

      const targetName = targetFolderId
        ? folders.find((f: any) => f.id === targetFolderId)?.name || '未知文件夹'
        : '根目录';

      toastr.success(`成功将 ${scriptIds.length} 个脚本移动到"${targetName}"`);
      exitBatchMode();
    } catch (error) {
      console.error('批量移动失败:', error);
      toastr.error('批量移动失败', error instanceof Error ? error.message : '未知错误');
    }
  }

  return {
    isBatchMode: computed(() => currentStore.value.batchMode),
    selectedScripts: computed(() => currentStore.value.selectedScriptIds),
    selectedFolders: computed(() => currentStore.value.selectedFolderIds),

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
