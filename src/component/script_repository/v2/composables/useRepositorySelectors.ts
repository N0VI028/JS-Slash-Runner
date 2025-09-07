import { computed } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';
import { useEditorStore } from '../stores/editor.store';
import { useScriptRepoStore } from '../stores/scriptRepo.store';
import { useUiStore } from '../stores/ui.store';

/**
 * 仓库只读选择器
 *
 * 这个 composable 提供只读的派生状态选择器，
 * 组件可以通过这些选择器获取数据，而不直接依赖 store 的实现细节
 */
export function useRepositorySelectors() {
  const scriptRepoStore = useScriptRepoStore();
  const editorStore = useEditorStore();
  const uiStore = useUiStore();

  // ===== 脚本相关选择器 =====

  /**
   * 所有脚本列表
   */
  const allScripts = computed(() => scriptRepoStore.allScripts);

  /**
   * 筛选后的脚本列表
   */
  const filteredScripts = computed(() => scriptRepoStore.filteredScripts);

  /**
   * 排序后的脚本列表（最终显示用）
   */
  const displayScripts = computed(() => scriptRepoStore.sortedScripts);

  /**
   * 当前选中的脚本
   */

  /**
   * 选中的脚本ID
   */

  /**
   * 启用的脚本数量
   */
  const enabledScriptCount = computed(() => allScripts.value.filter((script: Script) => script.enabled).length);

  /**
   * 脚本总数
   */
  const totalScriptCount = computed(() => allScripts.value.length);

  /**
   * 脚本统计信息
   */
  const scriptStats = computed(() => ({
    total: totalScriptCount.value,
    enabled: enabledScriptCount.value,
    disabled: totalScriptCount.value - enabledScriptCount.value,
  }));

  // ===== 文件夹相关选择器 =====

  /**
   * 所有文件夹列表
   */
  const allFolders = computed(() => scriptRepoStore.allFolders);

  /**
   * 文件夹树结构
   */
  const folderTree = computed(() => scriptRepoStore.folderTree);

  /**
   * 展开的文件夹ID集合
   */
  const expandedFolders = computed(() => scriptRepoStore.expandedFolders);

  /**
   * 根目录项目ID列表
   */
  const rootItems = computed(() => scriptRepoStore.rootItems);

  /**
   * 获取指定文件夹的信息
   */
  const getFolderById = (id: string): Folder | undefined => {
    return allFolders.value.find((folder: Folder) => folder.id === id);
  };

  /**
   * 获取指定文件夹的脚本列表
   */
  const getScriptsInFolder = (folderId: string): Script[] => {
    const folder = getFolderById(folderId);
    if (!folder) return [];

    return allScripts.value.filter((script: Script) => folder.scripts.includes(script.id));
  };

  /**
   * 获取根目录的脚本列表
   */
  const rootScripts = computed(() => allScripts.value.filter((script: Script) => rootItems.value.includes(script.id)));

  // ===== 搜索和过滤相关选择器 =====

  /**
   * 当前搜索过滤条件
   */
  const currentFilters = computed(() => scriptRepoStore.filters);

  /**
   * 当前排序选项
   */
  const currentSortOptions = computed(() => scriptRepoStore.sortOptions);

  /**
   * 是否正在搜索
   */
  const isSearching = computed(() => !!(currentFilters.value.keyword && currentFilters.value.keyword.trim()));

  /**
   * 搜索结果数量
   */
  const searchResultCount = computed(() => filteredScripts.value.length);

  /**
   * 搜索关键词
   */
  const searchKeyword = computed(() => currentFilters.value.keyword || '');

  // ===== 编辑器相关选择器 =====

  /**
   * 当前编辑的脚本ID
   */
  const currentEditingScriptId = computed(() => editorStore.currentScriptId);

  /**
   * 是否有脚本正在编辑
   */
  const hasActiveEditor = computed(() => editorStore.hasActiveScript);

  /**
   * 编辑器是否有未保存的更改
   */
  const editorIsDirty = computed(() => editorStore.isDirty);

  /**
   * 编辑器是否正在保存
   */
  const editorIsSaving = computed(() => editorStore.isSaving);

  /**
   * 编辑器状态摘要
   */
  const editorStatus = computed(() => editorStore.editorStatus);

  /**
   * 当前编辑器内容
   */
  const editorContent = computed(() => editorStore.content);

  // ===== UI状态相关选择器 =====

  /**
   * 是否正在加载
   */
  const isLoading = computed(() => scriptRepoStore.isLoading || uiStore.isLoading);

  /**
   * 当前错误信息
   */
  const currentError = computed(() => scriptRepoStore.error);

  /**
   * 是否有Toast消息
   */
  const hasToasts = computed(() => uiStore.hasToasts);

  /**
   * 当前Toast消息列表
   */
  const toastMessages = computed(() => uiStore.toasts);


  // ===== 计算属性和派生状态 =====

  /**
   * 应用状态摘要
   */
  const appStatus = computed(() => ({
    loading: isLoading.value,
    error: currentError.value,
    scriptCount: totalScriptCount.value,
    enabledCount: enabledScriptCount.value,
    hasUnsavedChanges: editorIsDirty.value,
    isSearching: isSearching.value,
    searchResults: searchResultCount.value,
  }));

  /**
   * 是否可以执行操作（没有正在进行的关键操作）
   */
  const canPerformActions = computed(() => !isLoading.value && !editorIsSaving.value);

  /**
   * 获取脚本的显示名称（处理空名称的情况）
   */
  const getScriptDisplayName = (script: Script): string => {
    return script.name.trim() || '未命名脚本';
  };

  /**
   * 获取脚本的状态文本
   */
  const getScriptStatusText = (script: Script): string => {
    if (script.enabled) {
      return '已启用';
    }
    return '已禁用';
  };

  /**
   * 获取文件夹的显示名称
   */
  const getFolderDisplayName = (folder: Folder): string => {
    return folder.name.trim() || '未命名文件夹';
  };

  /**
   * 检查脚本是否匹配当前搜索条件
   */
  const isScriptMatchingSearch = (script: Script): boolean => {
    if (!isSearching.value) return true;

    const keyword = searchKeyword.value.toLowerCase();
    return (
      script.name.toLowerCase().includes(keyword) ||
      script.content.toLowerCase().includes(keyword) ||
      script.info.toLowerCase().includes(keyword)
    );
  };

  // ===== 便民方法 =====

  /**
   * 根据ID获取脚本
   */
  const getScriptById = (id: string): Script | undefined => {
    return allScripts.value.find((script: Script) => script.id === id);
  };

  /**
   * 检查脚本是否存在
   */
  const hasScript = (id: string): boolean => {
    return !!getScriptById(id);
  };

  /**
   * 检查文件夹是否存在
   */
  const hasFolder = (id: string): boolean => {
    return !!getFolderById(id);
  };

  /**
   * 检查文件夹是否展开
   */
  const isFolderExpanded = (id: string): boolean => {
    return expandedFolders.value.has(id);
  };

  return {
    // 脚本相关
    allScripts,
    filteredScripts,
    displayScripts,
    enabledScriptCount,
    totalScriptCount,
    scriptStats,

    // 文件夹相关
    allFolders,
    folderTree,
    expandedFolders,
    rootItems,
    rootScripts,

    // 搜索和过滤
    currentFilters,
    currentSortOptions,
    isSearching,
    searchResultCount,
    searchKeyword,

    // 编辑器相关
    currentEditingScriptId,
    hasActiveEditor,
    editorIsDirty,
    editorIsSaving,
    editorStatus,
    editorContent,

    // UI状态
    isLoading,
    currentError,
    hasToasts,
    toastMessages,

    // 计算属性
    appStatus,
    canPerformActions,

    // 便民方法
    getScriptById,
    getFolderById,
    getScriptsInFolder,
    hasScript,
    hasFolder,
    isFolderExpanded,
    getScriptDisplayName,
    getScriptStatusText,
    getFolderDisplayName,
    isScriptMatchingSearch,
  };
}
