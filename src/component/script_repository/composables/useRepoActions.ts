import { uuidv4 } from '@sillytavern/scripts/utils';
import log from 'loglevel';
import type { Script, ScriptRepository, ScriptRepositoryItem, ScriptType, SearchFilters } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';
import {
  getStoreByType,
  loadAllRepositories,
} from '../stores/factory';
import { createDefaultScript } from '../utils/builtin_scripts';
import { usePopups } from './usePopups';
import { useScriptRuntime } from './useScriptRuntime';

/**
 * 统一的脚本仓库操作层
 * 合并了脚本命令和仓库操作功能
 */
export function useRepoActions() {
  // Pinia stores
  const storeByType = getStoreByType();
  const globalScriptStore = storeByType.global;
  const characterScriptStore = storeByType.character;
  const presetScriptStore = storeByType.preset;

  // ===========================================
  // 核心系统操作
  // ===========================================

  /**
   * 初始化仓库
   */
  const initRepository = async (): Promise<void> => {
    await loadAllRepositories();
  };

  /**
   * 打开内置库命令
   */
  const openBuiltinLibrary = async (): Promise<void> => {
    try {
      const handleAddScript = async (scriptId: string, target: ScriptType): Promise<void> => {
        const builtinScript = await createDefaultScript(scriptId);
        if (builtinScript) {
          const targetStore = storeByType[target];
          await targetStore.createScript({
            name: builtinScript.name,
            content: builtinScript.content,
            info: builtinScript.info,
            buttons: builtinScript.buttons,
            data: builtinScript.data,
          });
        }
      };

      await usePopups().showBuiltinLibrary(handleAddScript);
    } catch (error) {
      const message = error instanceof Error ? error.message : '打开内置库失败';
      toastr.error('打开失败', message);
      throw error;
    }
  };

  // ===========================================
  // 脚本操作
  // ===========================================

  /**
   * 显示脚本信息
   */
  const showScriptInfo = async (target: ScriptType, scriptId: string): Promise<void> => {
    const store = repositoryService.loadRepositoryByType(target);
    const script = repositoryService.findScriptById(store, scriptId) as Script | null;
    if (script) {
      await usePopups().showScriptInfo(script);
    }
  };

  /**
   * 切换脚本启用状态
   */
  const toggleScriptEnabled = async (target: ScriptType, id: string): Promise<void> => {
    const store = storeByType[target];
    const current = store.getScript(id) as Script | null;
    if (!current) return;
    const nextEnabled = !current.enabled;
    // 仅更新 enabled；运行时切换与数据补充由 orchestrator 订阅处理
    await store.updateScript(id, { enabled: nextEnabled });
  };

  /**
   * 创建脚本（UI版本）
   */
  const createScriptWithUI = async (): Promise<void> => {
    try {
      const result = await usePopups().openScriptEditor();
      if (result.confirmed && result.data) {
        // 默认创建到全局脚本库
        await globalScriptStore.createScript(result.data);
        toastr.success('创建成功', `脚本 "${result.data.name}" 已创建`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建脚本失败';
      toastr.error('创建失败', message);
    }
  };

  /**
   * 编辑脚本
   */
  const editScript = async (target: ScriptType, scriptId: string): Promise<void> => {
    const store = storeByType[target];
    const script = store.getScript(scriptId) as Script | null;
    if (script) {
      const result = await usePopups().openScriptEditor(script);
      if (result.confirmed && result.data) {
        // 先更新脚本数据
        await store.updateScript(scriptId, result.data);

        // 获取更新后的脚本数据来检查启用状态
        const updatedScript = store.getScript(scriptId);
        if (updatedScript && updatedScript.enabled) {
          try {
            const scriptRuntime = useScriptRuntime();
            log.info(`[ScriptEditor] 检测到脚本 "${updatedScript.name}" 已启用，正在重载...`);
            await scriptRuntime.stopScript(scriptId, target);
            await scriptRuntime.startScript(scriptId, target);
            log.info(`[ScriptEditor] 脚本 "${updatedScript.name}" 重载完成`);
          } catch (error) {
            log.error('[ScriptEditor] 脚本重载失败:', error);
            toastr.warning('脚本重载失败，请手动重启脚本');
          }
        }
      }
    }
  };

  /**
   * 确认删除脚本
   */
  const confirmDeleteScript = async (target: ScriptType, scriptId: string): Promise<void> => {
    const store = storeByType[target];
    const script = store.getScript(scriptId) as Script | null;
    if (script) {
      // 使用 popup 确认对话框
      const confirmed = await usePopups().confirmDelete(`确定要删除脚本 "${script.name}" 吗？`);
      if (confirmed) {
        try {
          await store.deleteScript(scriptId);
          toastr.success('删除成功', `脚本 "${script.name}" 已删除`);
        } catch (error) {
          const message = error instanceof Error ? error.message : '删除脚本失败';
          toastr.error('删除失败', message);
        }
      }
    } else {
      toastr.error('脚本不存在', '找不到指定的脚本');
    }
  };

  /**
   * 导出单个脚本
   */
  const exportSingle = async (type: ScriptType, scriptId: string): Promise<void> => {
    try {
      // 使用统一的导出方法，自动处理文件生成和下载
      await repositoryService.exportScripts([scriptId], type, 'single');
      toastr.success('导出成功', '脚本已导出');
    } catch (error) {
      console.error('导出失败:', error);
      toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 在文件夹内移动脚本
   */
  const moveWithinFolder = async (type: ScriptType, scriptId: string): Promise<void> => {
    try {
      const popups = usePopups();
      const input = await popups.promptText('输入目标文件夹ID（留空则移动到根）');
      if (!input.confirmed) return;
      const folderId = input.data?.trim() || null;
      await repositoryService.moveScriptWithinType(type, scriptId, folderId);
      await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
      toastr.success('已移动', folderId ? '脚本已移动到目标文件夹' : '脚本已移动到根目录');
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 跨类型移动脚本
   */
  const moveType = async (source: ScriptType, scriptId: string): Promise<void> => {
    try {
      const popups = usePopups();
      const runtime = useScriptRuntime();

      const script = await repositoryService.getScriptFromType(source as any, scriptId);
      if (!script) {
        toastr.error('移动失败', '脚本不存在');
        return;
      }

      const selection = await popups.selectTarget({ title: '移动到:', showPresetOption: true });
      if (!selection.confirmed || !selection.data) return;
      const targetSel = selection.data.target as 'global' | 'character' | 'preset';

      // 加载目标仓库检查冲突
      const targetRepo: ScriptRepository = await repositoryService.loadRepositoryByType(targetSel as any);
      const conflict = repositoryService.findScriptById(targetRepo, script.id);

      if (conflict) {
        const decision = await popups.resolveMoveIdConflict({
          scriptName: script.name,
          existingScriptName: conflict.name,
          target: targetSel === 'preset' ? (source === 'preset' ? 'global' : source) : targetSel,
        });
        if (decision === 'cancel') return;
        if (decision === 'override') {
          await repositoryService.deleteScriptInType((targetSel === 'preset' ? 'global' : targetSel) as any, conflict.id);
          await repositoryService.deleteScriptInType(source as any, scriptId);
          await repositoryService.createScriptInType(targetSel as any, script as Script);
        } else if (decision === 'new') {
          await repositoryService.deleteScriptInType(source as any, scriptId);
          script.id = uuidv4();
          await repositoryService.createScriptInType(targetSel as any, script as Script);
        }
      } else {
        await repositoryService.deleteScriptInType(source as any, scriptId);
        await repositoryService.createScriptInType(targetSel as any, script as Script);
      }

      await loadAllRepositories();

      if (script.enabled) {
        if (targetSel === 'global' && globalScriptStore.enabled) await runtime.startScript(script.id, 'global' as any);
        else if (targetSel === 'character' && characterScriptStore.enabled)
          await runtime.startScript(script.id, 'character' as any);
        else if (targetSel === 'preset' && presetScriptStore.enabled)
          await runtime.startScript(script.id, 'preset' as any);
      }

      toastr.success('移动成功', '脚本已移动到另一脚本库');
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  // ===========================================
  // 文件夹操作
  // ===========================================

  /**
   * 创建文件夹（UI版本）
   */
  const createFolderWithUI = async (): Promise<void> => {
    const result = await usePopups().createFolder();

    if (result.confirmed && result.data) {
      const target =
        result.data.target === 'global'
          ? globalScriptStore
          : result.data.target === 'character'
          ? characterScriptStore
          : presetScriptStore;
      await target.createFolder({
        name: result.data.name,
        icon: result.data.icon,
        color: result.data.color,
        target: result.data.target,
      });
      toastr.success('创建成功', `文件夹 "${result.data.name}" 已创建`);
    }
  };

  /**
   * 切换文件夹内所有脚本状态
   */
  const toggleFolderScripts = async (type: ScriptType, folderId: string): Promise<void> => {
    try {
      const store =
        type === 'global' ? globalScriptStore : type === 'character' ? characterScriptStore : presetScriptStore;
      const folderScripts = store.getFolderScripts(folderId);
      if (folderScripts.length === 0) return;
      const allEnabled = folderScripts.every(s => s.enabled);
      const target = !allEnabled;
      const runtime = useScriptRuntime();
      await runtime.toggleFolderScripts(folderId, type as any, target);
      toastr.success(
        `${target ? '启用' : '禁用'}成功`,
        `已${target ? '启用' : '禁用'}文件夹内${folderScripts.length}个脚本`,
      );
    } catch (error) {
      console.error('文件夹脚本切换失败:', error);
      toastr.error('操作失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 编辑文件夹
   */
  const editFolder = async (type: ScriptType, folderId: string): Promise<void> => {
    try {
      const repo = await repositoryService.loadRepositoryByType(type);
      const folder = repo.find(item => (item as any).type === 'folder' && (item as any).id === folderId) as any;
      if (!folder) {
        toastr.error('编辑失败', '找不到指定文件夹');
        return;
      }
      const result = await usePopups().editFolder({
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
      await loadAllRepositories();
      toastr.success('保存成功', '文件夹已更新');
    } catch (error) {
      console.error('编辑失败:', error);
      toastr.error('编辑失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 导出文件夹
   */
  const exportFolder = async (type: ScriptType, folderId: string): Promise<void> => {
    try {
      // 使用统一的导出方法，自动处理ZIP生成和下载
      await repositoryService.exportFolderToZip(type, folderId);
      toastr.success('导出成功', '文件夹已导出');
    } catch (error) {
      console.error('导出失败:', error);
      toastr.error('导出失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 删除文件夹
   */
  const deleteFolder = async (type: ScriptType, folderId: string): Promise<void> => {
    try {
      const confirmed = await usePopups().confirmDelete('确定要删除该文件夹及其内的所有脚本吗？此操作不可撤销。');
      if (!confirmed) return;
      await repositoryService.deleteFolderInType(type, folderId);
      await loadAllRepositories();
      toastr.success('删除成功', '文件夹已删除');
    } catch (error) {
      console.error('删除失败:', error);
      toastr.error('删除失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  /**
   * 跨类型移动文件夹
   */
  const moveFolderType = async (source: ScriptType, folderId: string): Promise<void> => {
    try {
      const popups = usePopups();
      const runtime = useScriptRuntime();

      const sourceRepo: ScriptRepository = await repositoryService.loadRepositoryByType(source as any);
      const folder = (sourceRepo as ScriptRepository).find(
        (item: Script | ScriptRepositoryItem) => (item as any)?.type === 'folder' && (item as any)?.id === folderId,
      ) as unknown as ScriptRepositoryItem | undefined;
      if (!folder) {
        toastr.error('移动失败', '文件夹不存在');
        return;
      }

      const selection = await popups.selectTarget({ title: '移动文件夹到:', showPresetOption: true });
      if (!selection.confirmed || !selection.data) return;
      const targetSel = selection.data.target as 'global' | 'character' | 'preset';
      if (targetSel === source) {
        toastr.info('移动取消', '目标库与源库相同');
        return;
      }

      const targetRepoBefore: ScriptRepository = await repositoryService.loadRepositoryByType(targetSel as any);
      const folderScripts: Script[] = Array.isArray((folder as any).value)
        ? ((folder as any).value as Script[])
        : [];

      for (const s of folderScripts) {
        const conflict = repositoryService.findScriptById(targetRepoBefore, s.id);
        if (!conflict) continue;
        const decision = await popups.resolveMoveIdConflict({
          scriptName: s.name,
          existingScriptName: (conflict as Script).name,
          target: targetSel,
        });
        if (decision === 'cancel') return;
        if (decision === 'override') {
          await repositoryService.deleteScriptInType(targetSel as any, (conflict as Script).id);
        } else if (decision === 'new') {
          s.id = uuidv4();
        }
      }

      // 从源仓库移除该文件夹并保存
      const sourceIndex = (sourceRepo as ScriptRepository).findIndex(
        (item: Script | ScriptRepositoryItem) => (item as any)?.type === 'folder' && (item as any)?.id === folderId,
      );
      if (sourceIndex >= 0) {
        (sourceRepo as ScriptRepository).splice(sourceIndex, 1);
        await repositoryService.saveRepositoryByType(source as any, sourceRepo);
      }

      // 将（可能已调整脚本ID的）文件夹插入目标仓库并保存
      const targetRepoInsert: ScriptRepository = await repositoryService.loadRepositoryByType(targetSel as any);
      (targetRepoInsert as ScriptRepository).unshift(folder as unknown as ScriptRepositoryItem);
      await repositoryService.saveRepositoryByType(targetSel as any, targetRepoInsert);

      await loadAllRepositories();

      const masterEnabled = (await import('@/util/extension_variables')).getSettingValue('enabled_extension');
      if (masterEnabled) {
        const targetEnabled =
          targetSel === 'global'
            ? globalScriptStore.enabled
            : targetSel === 'character'
            ? characterScriptStore.enabled
            : presetScriptStore.enabled;
        if (targetEnabled) {
          const targetRepoAfter: ScriptRepository = await repositoryService.loadRepositoryByType(targetSel as any);
          const folderInTarget = (targetRepoAfter as ScriptRepository).find(
            (item: Script | ScriptRepositoryItem) => (item as any)?.type === 'folder' && (item as any)?.id === folderId,
          ) as unknown as ScriptRepositoryItem | undefined;
          if (folderInTarget && Array.isArray((folderInTarget as any).value)) {
            const scripts = (folderInTarget as any).value
              .filter((i: any) => i?.type === 'script')
              .map((i: any) => i.value);
            for (const s of scripts) {
              if (s?.enabled) await runtime.startScript(s.id, targetSel as any);
            }
          }
        }
      }

      const targetName =
        targetSel === 'global' ? '全局脚本库' : targetSel === 'character' ? '角色脚本库' : '预设脚本库';
      toastr.success('移动成功', `文件夹"${folder.name}"已移动到${targetName}`);
    } catch (error) {
      console.error('移动失败:', error);
      toastr.error('移动失败', error instanceof Error ? error.message : '未知错误');
    }
  };

  // ===========================================
  // 搜索和过滤
  // ===========================================

  /**
   * 设置过滤条件
   */
  function setFilters(filters: Partial<SearchFilters>): void {
    globalScriptStore.setFilters(filters);
    characterScriptStore.setFilters(filters);
  }

  // 返回所有功能，按类别分组
  return {
    // 核心系统操作
    initRepository,
    openBuiltinLibrary,

    // 脚本操作
    showScriptInfo,
    editScript,
    toggleScriptEnabled,
    createScriptWithUI,
    confirmDeleteScript,
    exportSingle,
    moveWithinFolder,
    moveType,

    // 文件夹操作
    createFolderWithUI,
    toggleFolderScripts,
    editFolder,
    exportFolder,
    deleteFolder,
    moveFolderType,

    // 搜索和过滤
    setFilters,
  };
}

/**
 * 为特定类型创建操作函数
 */
export function createRepoActionsForType(type: ScriptType) {
  const actions = useRepoActions();
  return {
    // 脚本操作
    showScriptInfo: (id: string) => actions.showScriptInfo(type, id),
    editScript: (id: string) => actions.editScript(type, id),
    toggleScriptEnabled: (id: string) => actions.toggleScriptEnabled(type, id),
    confirmDeleteScript: (id: string) => actions.confirmDeleteScript(type, id),
    exportSingle: (id: string) => actions.exportSingle(type, id),
    moveWithinFolder: (id: string) => actions.moveWithinFolder(type, id),
    moveType: (id: string) => actions.moveType(type, id),

    // 文件夹操作
    toggleFolderScripts: (id: string) => actions.toggleFolderScripts(type, id),
    editFolder: (id: string) => actions.editFolder(type, id),
    exportFolder: (id: string) => actions.exportFolder(type, id),
    deleteFolder: (id: string) => actions.deleteFolder(type, id),
    moveFolderType: (id: string) => actions.moveFolderType(type, id),
  };
}
