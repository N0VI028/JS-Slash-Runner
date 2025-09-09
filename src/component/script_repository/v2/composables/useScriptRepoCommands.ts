import { useScriptRuntime } from '@/component/script_repository/v2/composables/useScriptRuntime';
import { createDefaultScript } from '../../builtin_scripts';
import type { SearchFilters } from '../schemas/payloads.schema';
import type { Script } from '../schemas/script.schema';
import { useCharacterScriptStore } from '../stores/characterScript.store';
import { useGlobalScriptStore } from '../stores/globalScript.store';
import { usePresetScriptStore } from '../stores/presetScript.store';
import { usePopups } from './usePopups';

/**
 * 简化的脚本仓库命令层
 * 只保留核心功能，专注于内置库和基本操作
 */
export function useScriptRepoCommands() {
  const globalScriptStore = useGlobalScriptStore();
  const characterScriptStore = useCharacterScriptStore();
  const presetScriptStore = usePresetScriptStore();

  // ===== 核心命令 =====

  /**
   * 初始化仓库命令
   */
  const initRepository = async (): Promise<void> => {
    await Promise.all([globalScriptStore.init(), characterScriptStore.init(), presetScriptStore.init()]);
  };

  /**
   * 打开内置库命令
   */
  const openBuiltinLibrary = async (): Promise<void> => {
    try {
      // 定义添加脚本的回调函数
      const handleAddScript = async (scriptId: string, target: 'global' | 'character' | 'preset'): Promise<void> => {
        const builtinScript = await createDefaultScript(scriptId);
        if (builtinScript) {
          // 使用分离的 store 创建脚本，这会自动触发响应式更新
          const targetStore =
            target === 'global' ? globalScriptStore : target === 'character' ? characterScriptStore : presetScriptStore;
          await targetStore.createScript({
            name: builtinScript.name,
            content: builtinScript.content,
            info: builtinScript.info,
            folderId: null,
            enabled: false,
            buttons: builtinScript.buttons || [],
            data: builtinScript.data || {},
          });
        }
      };

      // V1风格的内置库，传递添加脚本的回调
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
  const showScriptInfo = async (target: 'global' | 'character', scriptId: string): Promise<void> => {
    let script: Script | null;
    switch (target) {
      case 'global':
        script = globalScriptStore.getScript(scriptId);
        break;
      case 'character':
        script = characterScriptStore.getScript(scriptId);
        break;
    }
    if (script) {
      await usePopups().showScriptInfo(script);
    }
  };

  /**
   * 切换脚本启用状态
   */
  const toggleScriptEnabled = async (target: 'global' | 'character', id: string): Promise<void> => {
    const store = target === 'global' ? globalScriptStore : characterScriptStore;
    const current = store.getScript(id);
    if (!current) return;

    const nextEnabled = !current.enabled;

    // 先持久化 enabled 变更
    await store.updateScript(id, { enabled: nextEnabled });

    // 使用V2专用的运行时管理器
    const runtime = useScriptRuntime();
    if (nextEnabled) {
      await runtime.startScript(id, target);
    } else {
      await runtime.stopScript(id, target);
    }
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
  const editScript = async (target: 'global' | 'character', scriptId: string): Promise<void> => {
    let script: Script | null;
    switch (target) {
      case 'global':
        script = globalScriptStore.getScript(scriptId);
        break;
      case 'character':
        script = characterScriptStore.getScript(scriptId);
        break;
    }
    if (script) {
      usePopups().openScriptEditor(script);
    }
  };

  /**
   * 确认删除脚本
   */
  const confirmDeleteScript = async (target: 'global' | 'character', scriptId: string): Promise<void> => {
    let script: Script | null;
    switch (target) {
      case 'global':
        script = globalScriptStore.getScript(scriptId);
        break;
      case 'character':
        script = characterScriptStore.getScript(scriptId);
        break;
    }
    if (script) {
      // 使用 popup 确认对话框
      const confirmed = await usePopups().confirmDelete(`确定要删除脚本 "${script.name}" 吗？`);
      if (confirmed) {
        try {
          const store = target === 'global' ? globalScriptStore : characterScriptStore;
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
