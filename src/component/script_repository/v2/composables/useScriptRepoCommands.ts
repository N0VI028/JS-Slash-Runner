import { createDefaultScript } from '../../builtin_scripts';
import type {
  SearchFilters,
} from '../schemas/payloads.schema';
import { useCharacterScriptStore } from '../stores/characterScript.store';
import { useGlobalScriptStore } from '../stores/globalScript.store';
import { useUiStore } from '../stores/ui.store';
import { usePopups } from './usePopups';

/**
 * 简化的脚本仓库命令层
 * 只保留核心功能，专注于内置库和基本操作
 */
export function useScriptRepoCommands() {
  const globalScriptStore = useGlobalScriptStore();
  const characterScriptStore = useCharacterScriptStore();
  const uiStore = useUiStore();
  const popups = usePopups();

  // ===== 辅助函数 =====

  /**
   * 查找脚本在哪个store中
   */
  const findScriptStore = (scriptId: string) => {
    let script = globalScriptStore.scripts.get(scriptId);
    if (script) {
      return { store: globalScriptStore, script };
    }
    
    script = characterScriptStore.scripts.get(scriptId);
    if (script) {
      return { store: characterScriptStore, script };
    }
    
    return null;
  };

  // ===== 核心命令 =====

  /**
   * 初始化仓库命令
   */
  const initRepository = async (): Promise<void> => {
    await Promise.all([
      globalScriptStore.init(),
      characterScriptStore.init(),
    ]);
  };

  /**
   * 打开内置库命令
   */
  const openBuiltinLibrary = async (): Promise<void> => {
    try {
      // 定义添加脚本的回调函数
      const handleAddScript = async (scriptId: string, target: 'global' | 'character'): Promise<void> => {
        const builtinScript = await createDefaultScript(scriptId);
        if (builtinScript) {
          // 使用分离的 store 创建脚本，这会自动触发响应式更新
          const targetStore = target === 'global' ? globalScriptStore : characterScriptStore;
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
      await popups.showBuiltinLibrary(handleAddScript);
    } catch (error) {
      const message = error instanceof Error ? error.message : '打开内置库失败';
      uiStore.showError('打开失败', message);
      throw error;
    }
  };

  /**
   * 显示脚本信息
   */
  const showScriptInfo = async (scriptId: string): Promise<void> => {
    const found = findScriptStore(scriptId);
    if (found) {
      await popups.showScriptInfo(found.script);
    } else {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
    }
  };

  /**
   * 切换脚本启用状态
   */
  const toggleScriptEnabled = async (id: string): Promise<void> => {
    const found = findScriptStore(id);
    if (found) {
      await found.store.toggleScriptEnabled(id);
    } else {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
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
      const result = await popups.openScriptEditor();
      if (result.confirmed && result.data) {
        // 默认创建到全局脚本库
        await globalScriptStore.createScript(result.data);
        uiStore.showSuccess('创建成功', `脚本 "${result.data.name}" 已创建`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建脚本失败';
      uiStore.showError('创建失败', message);
    }
  };

  /**
   * 创建文件夹（UI版本）
   */
  const createFolderWithUI = async (): Promise<void> => {
    // TODO: 实现文件夹编辑器
    uiStore.showError('功能暂未实现', '文件夹创建功能正在开发中');
  };

  /**
   * 编辑脚本
   */
  const editScript = async (scriptId: string): Promise<void> => {
    const found = findScriptStore(scriptId);
    if (found) {
      try {
        const result = await popups.openScriptEditor(found.script);
        if (result.confirmed && result.data) {
          await found.store.updateScript({ id: scriptId, ...result.data });
          uiStore.showSuccess('更新成功', '脚本已更新');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '编辑脚本失败';
        uiStore.showError('编辑失败', message);
      }
    } else {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
    }
  };

  /**
   * 确认删除脚本
   */
  const confirmDeleteScript = async (scriptId: string): Promise<void> => {
    const found = findScriptStore(scriptId);
    if (found) {
      // 使用简单的确认对话框
      const confirmed = confirm(`确定要删除脚本 "${found.script.name}" 吗？`);
      if (confirmed) {
        try {
          await found.store.deleteScript(scriptId);
          uiStore.showSuccess('删除成功', `脚本 "${found.script.name}" 已删除`);
        } catch (error) {
          const message = error instanceof Error ? error.message : '删除脚本失败';
          uiStore.showError('删除失败', message);
        }
      }
    } else {
      uiStore.showError('脚本不存在', '找不到指定的脚本');
    }
  };

  // 暂时注释掉不常用的方法，专注于核心功能
  /*
  const updateScript = async (payload: UpdateScriptPayload): Promise<void> => {
    // TODO: 实现
  };

  const deleteScript = async (id: string): Promise<void> => {
    // TODO: 实现
  };

  const moveScript = async (payload: MoveScriptPayload): Promise<void> => {
    // TODO: 实现
  };

  const createFolder = async (payload: CreateFolderPayload): Promise<string> => {
    // TODO: 实现
    return '';
  };

  const renameFolder = async (payload: RenameFolderPayload): Promise<void> => {
    // TODO: 实现
  };

  const deleteFolder = async (id: string): Promise<void> => {
    // TODO: 实现
  };
  */

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
