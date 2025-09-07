import type {
  CreateFolderPayload,
  CreateScriptPayload,
  ExportScriptPayload,
  ImportScriptPayload,
  MoveScriptPayload,
  RenameFolderPayload,
  SearchFilters,
  SortOptions,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';
import { repositoryService } from '../services/repository.service';
import { useScriptRepoStore } from '../stores/scriptRepo.store';
import { useUiStore } from '../stores/ui.store';
import { usePopups } from './usePopups';

/**
 * 脚本仓库命令层
 *
 * 这个 composable 提供统一的命令接口，封装了 store 操作和 service 调用，
 * 避免组件直接依赖多个 store 和 service
 */
export function useScriptRepoCommands() {
  const scriptRepoStore = useScriptRepoStore();
  const uiStore = useUiStore();
  const popups = usePopups();

  // ===== 脚本操作命令 =====

  /**
   * 创建脚本命令
   */
  const createScript = async (payload: CreateScriptPayload): Promise<string> => {
    try {
      const scriptId = await scriptRepoStore.createScript(payload);
      uiStore.showSuccess('创建成功', `脚本 "${payload.name}" 已创建`);
      return scriptId;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建脚本失败';
      uiStore.showError('创建失败', message);
      throw error;
    }
  };

  /**
   * 更新脚本命令
   */
  const updateScript = async (payload: UpdateScriptPayload): Promise<void> => {
    try {
      await scriptRepoStore.updateScript(payload);
      uiStore.showSuccess('保存成功', '脚本已保存');
    } catch (error) {
      const message = error instanceof Error ? error.message : '保存脚本失败';
      uiStore.showError('保存失败', message);
      throw error;
    }
  };

  /**
   * 删除脚本命令
   */
  const deleteScript = async (id: string, _scriptName?: string): Promise<void> => {
    const loadingId = `delete-script-${Date.now()}`;
    uiStore.beginLoading(loadingId, '正在删除脚本...');

    try {
      await scriptRepoStore.deleteScript(id);
      uiStore.showSuccess('删除成功', '脚本已删除');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除脚本失败';
      uiStore.showError('删除失败', message);
      throw error;
    } finally {
      uiStore.endLoading(loadingId);
    }
  };

  /**
   * 移动脚本命令
   */
  const moveScript = async (payload: MoveScriptPayload): Promise<void> => {
    try {
      await scriptRepoStore.moveScript(payload);
      uiStore.showSuccess('移动成功', '脚本已移动');
    } catch (error) {
      const message = error instanceof Error ? error.message : '移动脚本失败';
      uiStore.showError('移动失败', message);
      throw error;
    }
  };

  /**
   * 切换脚本启用状态命令
   */
  const toggleScriptEnabled = async (id: string): Promise<void> => {
    try {
      await scriptRepoStore.toggleScriptEnabled(id);
    } catch (error) {
      const message = error instanceof Error ? error.message : '切换脚本状态失败';
      uiStore.showError('操作失败', message);
      throw error;
    }
  };

  /**
   * 运行脚本命令
   */
  const runScript = async (id: string): Promise<void> => {
    const loadingId = `run-script-${id}`;
    uiStore.beginLoading(loadingId, '正在运行脚本...');

    try {
      await repositoryService.runScript(id);
      uiStore.showSuccess('运行成功', '脚本执行完成');
    } catch (error) {
      const message = error instanceof Error ? error.message : '运行脚本失败';
      uiStore.showError('运行失败', message);
      throw error;
    } finally {
      uiStore.endLoading(loadingId);
    }
  };

  /**
   * 停止脚本命令
   */
  const stopScript = async (id: string): Promise<void> => {
    try {
      await repositoryService.stopScript(id);
      uiStore.showInfo('已停止', '脚本执行已停止');
    } catch (error) {
      const message = error instanceof Error ? error.message : '停止脚本失败';
      uiStore.showError('停止失败', message);
      throw error;
    }
  };

  // ===== 文件夹操作命令 =====

  /**
   * 创建文件夹命令
   */
  const createFolder = async (payload: CreateFolderPayload): Promise<string> => {
    try {
      const folderId = await scriptRepoStore.createFolder(payload);
      uiStore.showSuccess('创建成功', `文件夹 "${payload.name}" 已创建`);
      return folderId;
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建文件夹失败';
      uiStore.showError('创建失败', message);
      throw error;
    }
  };

  /**
   * 重命名文件夹命令
   */
  const renameFolder = async (payload: RenameFolderPayload): Promise<void> => {
    try {
      await scriptRepoStore.renameFolder(payload);
      uiStore.showSuccess('重命名成功', `文件夹已重命名为 "${payload.name}"`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '重命名文件夹失败';
      uiStore.showError('重命名失败', message);
      throw error;
    }
  };

  /**
   * 删除文件夹命令
   */
  const deleteFolder = async (id: string, _folderName?: string): Promise<void> => {
    try {
      await scriptRepoStore.deleteFolder(id);
      uiStore.showSuccess('删除成功', '文件夹已删除');
    } catch (error) {
      const message = error instanceof Error ? error.message : '删除文件夹失败';
      uiStore.showError('删除失败', message);
      throw error;
    }
  };

  // ===== 搜索和过滤命令 =====

  /**
   * 搜索命令
   */
  const search = (keyword: string): void => {
    scriptRepoStore.setFilters({ keyword });
  };

  /**
   * 设置过滤条件命令
   */
  const setFilters = (filters: Partial<SearchFilters>): void => {
    scriptRepoStore.setFilters(filters);
  };

  /**
   * 清空搜索命令
   */
  const clearSearch = (): void => {
    scriptRepoStore.setFilters({ keyword: '' });
  };

  /**
   * 设置排序命令
   */
  const setSortOptions = (options: SortOptions): void => {
    scriptRepoStore.setSortOptions(options);
  };

  // ===== 选择和导航命令 =====


  /**
   * 切换文件夹展开状态命令
   */
  const toggleFolderExpand = (id: string): void => {
    scriptRepoStore.toggleFolderExpand(id);
  };

  // ===== 批量操作命令 =====

  /**
   * 导入脚本命令
   */
  const importScripts = async (payload: ImportScriptPayload): Promise<string[]> => {
    const loadingId = `import-scripts-${Date.now()}`;
    uiStore.beginLoading(loadingId, '正在导入脚本...');

    try {
      const scriptIds = await repositoryService.importScripts(payload);
      uiStore.showSuccess('导入成功', `成功导入 ${scriptIds.length} 个脚本`);

      // 刷新仓库数据
      await scriptRepoStore.init();

      return scriptIds;
    } catch (error) {
      const message = error instanceof Error ? error.message : '导入脚本失败';
      uiStore.showError('导入失败', message);
      throw error;
    } finally {
      uiStore.endLoading(loadingId);
    }
  };

  /**
   * 导出脚本命令
   */
  const exportScripts = async (payload: ExportScriptPayload): Promise<void> => {
    const loadingId = `export-scripts-${Date.now()}`;
    uiStore.beginLoading(loadingId, '正在导出脚本...');

    try {
      const blob = await repositoryService.exportScripts(payload);

      // 下载文件
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `scripts-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      uiStore.showSuccess('导出成功', `成功导出 ${payload.scriptIds.length} 个脚本`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '导出脚本失败';
      uiStore.showError('导出失败', message);
      throw error;
    } finally {
      uiStore.endLoading(loadingId);
    }
  };

  // ===== 系统命令 =====

  /**
   * 初始化仓库命令
   */
  const initRepository = async (): Promise<void> => {
    await scriptRepoStore.init();
  };

  /**
   * 打开内置库命令
   */
  const openBuiltinLibrary = async (): Promise<void> => {
    try {
      const result = await popups.showBuiltinLibrary();
      
      if (result.confirmed && result.data) {
        // 处理选择的脚本
        for (const scriptId of result.data) {
          try {
            await createScript({
              name: `内置脚本-${scriptId}`,
              folderId: null,
              enabled: false,
            });
          } catch (error) {
            console.error('添加内置脚本失败:', error);
          }
        }
        
        if (result.data.length > 0) {
          uiStore.showSuccess('成功', `已添加 ${result.data.length} 个脚本到仓库`);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '打开内置库失败';
      uiStore.showError('打开失败', message);
      throw error;
    }
  };


  // ===== UI 命令 =====

  /**
   * 显示脚本信息
   */
  const showScriptInfo = async (scriptId: string): Promise<void> => {
    const script = scriptRepoStore.scripts.get(scriptId);
    if (script) {
      await popups.showScriptInfo(script);
    } else {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
    }
  };

  /**
   * 编辑脚本
   */
  const editScript = async (scriptId: string): Promise<void> => {
    const script = scriptRepoStore.scripts.get(scriptId);
    const result = await popups.openScriptEditor(script);
    
    if (result.confirmed && result.data) {
      try {
        if (script) {
          // 更新现有脚本
          await updateScript({
            id: scriptId,
            ...result.data,
          });
        } else {
          // 创建新脚本
          await createScript({
            ...result.data,
            folderId: null, // 新脚本默认放在根目录
          });
        }
      } catch (error) {
        console.error('保存脚本失败:', error);
      }
    }
  };

  /**
   * 创建新脚本（带UI）
   */
  const createScriptWithUI = async (): Promise<void> => {
    await editScript(''); // 空ID表示新建
  };

  /**
   * 创建文件夹（带UI）
   */
  const createFolderWithUI = async (parentId?: string): Promise<void> => {
    const result = await popups.createFolder(parentId);
    
    if (result.confirmed && result.data) {
      try {
        await createFolder({
          name: result.data.name,
          parentId: result.data.parentId || null,
          icon: result.data.icon,
          color: result.data.color,
        });
      } catch (error) {
        console.error('创建文件夹失败:', error);
      }
    }
  };

  /**
   * 确认删除脚本
   */
  const confirmDeleteScript = async (scriptId: string): Promise<void> => {
    const script = scriptRepoStore.scripts.get(scriptId);
    if (!script) {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
      return;
    }

    const confirmed = await popups.confirmDelete(`确定要删除脚本 "${script.name}" 吗？此操作不可撤销。`);
    
    if (confirmed) {
      await deleteScript(scriptId);
    }
  };

  /**
   * 确认删除文件夹
   */
  const confirmDeleteFolder = async (folderId: string): Promise<void> => {
    const folder = scriptRepoStore.folders.get(folderId);
    if (!folder) {
      uiStore.showError('文件夹不存在', '找不到指定的文件夹');
      return;
    }

    const confirmed = await popups.confirmDelete(`确定要删除文件夹 "${folder.name}" 及其中的所有内容吗？此操作不可撤销。`);
    
    if (confirmed) {
      await deleteFolder(folderId);
    }
  };

  return {
    // 脚本操作
    createScript,
    updateScript,
    deleteScript,
    moveScript,
    toggleScriptEnabled,
    runScript,
    stopScript,

    // 文件夹操作
    createFolder,
    renameFolder,
    deleteFolder,

    // 搜索和过滤
    search,
    setFilters,
    clearSearch,
    setSortOptions,

    // 选择和导航
    toggleFolderExpand,

    // 批量操作
    importScripts,
    exportScripts,

    // 系统操作
    initRepository,
    openBuiltinLibrary,

    // UI 命令
    showScriptInfo,
    editScript,
    createScriptWithUI,
    createFolderWithUI,
    confirmDeleteScript,
    confirmDeleteFolder,
  };
}
