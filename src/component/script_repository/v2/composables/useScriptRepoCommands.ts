import log from 'loglevel';
import type { Script, ScriptType, SearchFilters } from '../schemas/script.schema';
import { ScriptTypeSchema } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';
import {
  createScriptStore,
  useCharacterScriptStore,
  useGlobalScriptStore,
  usePresetScriptStore,
} from '../stores/factory';
import { createDefaultScript } from '../utils/builtin_scripts';
import { usePopups } from './usePopups';
import { useScriptRuntime } from './useScriptRuntime';

/**
 * 简化的脚本仓库命令层
 * 只保留核心功能，专注于内置库和基本操作
 */
export function useScriptRepoCommands() {
  // Pinia stores（用于 setFilters、编辑与切换等）
  const globalScriptStore = useGlobalScriptStore();
  const characterScriptStore = useCharacterScriptStore();
  const presetScriptStore = usePresetScriptStore();
  const storeByType: Record<ScriptType, any> = {
    global: globalScriptStore,
    character: characterScriptStore,
    preset: presetScriptStore,
  };

  /**
   * 初始化仓库
   */
  const initRepository = async (): Promise<void> => {
    const scriptTypes = Object.values(ScriptTypeSchema.enum) as ScriptType[];
    await Promise.all(scriptTypes.map(type => createScriptStore(type)().init()));
  };

  /**
   * 打开内置库命令
   */
  const openBuiltinLibrary = async (): Promise<void> => {
    try {
      const handleAddScript = async (scriptId: string, target: ScriptType): Promise<void> => {
        const builtinScript = await createDefaultScript(scriptId);
        if (builtinScript) {
          await repositoryService.createScriptInType(target, {
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
   * 设置过滤条件
   */
  function setFilters(filters: Partial<SearchFilters>): void {
    globalScriptStore.setFilters(filters);
    characterScriptStore.setFilters(filters);
  }

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

    // 文件夹操作
    createFolderWithUI,

    // 搜索和过滤
    setFilters,
  };
}
