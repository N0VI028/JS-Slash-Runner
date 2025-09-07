import { computed } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';
import { useEditorStore } from '../stores/editor.store';
import { useUiStore } from '../stores/ui.store';

/**
 * 仓库只读选择器（简化版本）
 * TODO: 重构后完善此文件
 */
export function useRepositorySelectors() {
  const editorStore = useEditorStore();
  const uiStore = useUiStore();

  // 暂时返回最小化实现
  return {
    // 编辑器相关
    currentEditingScriptId: computed(() => editorStore.currentScriptId),
    hasActiveEditor: computed(() => editorStore.hasActiveScript),
    editorIsDirty: computed(() => editorStore.isDirty),
    editorIsSaving: computed(() => editorStore.isSaving),
    editorStatus: computed(() => editorStore.editorStatus),
    editorContent: computed(() => editorStore.content),

    // UI状态
    isLoading: computed(() => uiStore.isLoading),
    hasToasts: computed(() => uiStore.hasToasts),
    toastMessages: computed(() => uiStore.toasts),

    // 便民方法（暂时返回空实现）
    getScriptById: (_id: string): Script | undefined => undefined,
    getFolderById: (_id: string): Folder | undefined => undefined,
    getScriptsInFolder: (_folderId: string): Script[] => [],
    hasScript: (_id: string): boolean => false,
    hasFolder: (_id: string): boolean => false,
    isFolderExpanded: (_id: string): boolean => false,
    getScriptDisplayName: (script: Script): string => script.name.trim() || '未命名脚本',
    getScriptStatusText: (script: Script): string => script.enabled ? '已启用' : '已禁用',
    getFolderDisplayName: (folder: Folder): string => folder.name.trim() || '未命名文件夹',
    isScriptMatchingSearch: (_script: Script): boolean => true,
  };
}