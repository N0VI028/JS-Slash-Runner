import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
  CreateFolderPayload,
  CreateScriptPayload,
  SearchFilters,
  SortOptions,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';
import type { Repository, Script } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

/**
 * 角色脚本 Store - 基于V1数据结构
 * 直接管理V1格式的Repository数据
 */
export const useCharacterScriptStore = defineStore('characterScript', () => {
  // ===== State =====

  /**
   * 角色仓库数据（V1格式）
   */
  const repository = ref<Repository>([]);

  /**
   * 当前展开的文件夹ID集合
   */
  const expandedFolders = ref<Set<string>>(new Set());

  /**
   * 搜索和过滤条件
   */
  const filters = ref<SearchFilters>({});

  /**
   * 排序选项
   */
  const sortOptions = ref<SortOptions>({
    field: 'name',
    order: 'asc',
  });

  /**
   * 加载状态
   */
  const isLoading = ref(false);

  /**
   * 错误信息
   */
  const error = ref<string | null>(null);

  /**
   * 启用状态
   */
  const enabled = ref(false);

  // ===== Getters =====

  /**
   * 获取所有角色脚本（扁平化）
   */
  const allScripts = computed((): Script[] => {
    return repositoryService.getAllScripts(repository.value);
  });

  /**
   * 获取所有文件夹
   */
  const allFolders = computed(() => {
    return repositoryService.getAllFolders(repository.value);
  });

  /**
   * 获取根级别的脚本
   */
  const rootScripts = computed(() => {
    return repositoryService.getRootScripts(repository.value);
  });

  /**
   * 根据过滤条件获取筛选后的脚本列表
   */
  const filteredScripts = computed(() => {
    let list = allScripts.value;

    // 应用关键字过滤
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase();
      list = list.filter(
        script =>
          script.name.toLowerCase().includes(keyword) ||
          script.info.toLowerCase().includes(keyword) ||
          script.content.toLowerCase().includes(keyword),
      );
    }

    // 应用启用状态过滤
    if (filters.value.enabled !== undefined) {
      list = list.filter(script => script.enabled === filters.value.enabled);
    }

    // 应用文件夹过滤
    if (filters.value.folderId !== undefined) {
      if (filters.value.folderId === null) {
        // 只显示根级别的脚本
        list = list.filter(script => rootScripts.value.includes(script));
      } else {
        // 只显示特定文件夹中的脚本
        const folderScripts = repositoryService.getFolderScripts(repository.value, filters.value.folderId);
        list = list.filter(script => folderScripts.includes(script));
      }
    }

    return list;
  });

  /**
   * 根据排序选项获取排序后的脚本列表
   */
  const sortedScripts = computed(() => {
    const list = [...filteredScripts.value];

    list.sort((a, b) => {
      let comparison = 0;

      switch (sortOptions.value.field) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'enabled':
          comparison = Number(b.enabled) - Number(a.enabled);
          break;
        default:
          comparison = a.name.localeCompare(b.name);
      }

      return sortOptions.value.order === 'asc' ? comparison : -comparison;
    });

    return list;
  });

  /**
   * 获取启用的脚本数量
   */
  const enabledScriptsCount = computed(() => {
    return allScripts.value.filter(script => script.enabled).length;
  });

  /**
   * 获取脚本总数
   */
  const totalScriptsCount = computed(() => {
    return allScripts.value.length;
  });

  /**
   * 获取文件夹总数
   */
  const totalFoldersCount = computed(() => {
    return allFolders.value.length;
  });

  /**
   * 检查是否有搜索结果
   */
  const hasSearchResults = computed(() => {
    return filteredScripts.value.length > 0;
  });

  // ===== Actions =====

  /**
   * 加载仓库数据
   */
  async function loadRepository(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const data = await repositoryService.loadCharacterRepository();
      repository.value = data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载仓库数据失败';
      throw err;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 保存仓库数据
   */
  async function saveRepository(): Promise<void> {
    try {
      await repositoryService.saveCharacterRepository(repository.value);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存仓库数据失败';
      throw err;
    }
  }

  /**
   * 创建脚本
   */
  async function createScript(payload: CreateScriptPayload): Promise<string> {
    try {
      error.value = null;
      const scriptId = await repositoryService.createCharacterScript(payload);

      // 重新加载数据以保持同步
      await loadRepository();

      return scriptId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建脚本失败';
      throw err;
    }
  }

  /**
   * 更新脚本
   */
  async function updateScript(scriptId: string, payload: UpdateScriptPayload): Promise<void> {
    try {
      error.value = null;
      await repositoryService.updateCharacterScript(scriptId, payload);

      // 重新加载数据以保持同步
      await loadRepository();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新脚本失败';
      throw err;
    }
  }

  /**
   * 删除脚本
   */
  async function deleteScript(scriptId: string): Promise<void> {
    try {
      error.value = null;
      await repositoryService.deleteCharacterScript(scriptId);

      // 重新加载数据以保持同步
      await loadRepository();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除脚本失败';
      throw err;
    }
  }

  /**
   * 获取脚本
   */
  function getScript(scriptId: string): Script | null {
    return allScripts.value.find(script => script.id === scriptId) || null;
  }

  /**
   * 创建文件夹
   */
  async function createFolder(payload: CreateFolderPayload): Promise<string> {
    try {
      error.value = null;
      const folderId = await repositoryService.createCharacterFolder(payload);

      // 重新加载数据以保持同步
      await loadRepository();

      return folderId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建文件夹失败';
      throw err;
    }
  }

  /**
   * 删除文件夹
   */
  async function deleteFolder(folderId: string): Promise<void> {
    try {
      error.value = null;
      await repositoryService.deleteCharacterFolder(folderId);

      // 重新加载数据以保持同步
      await loadRepository();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除文件夹失败';
      throw err;
    }
  }

  /**
   * 移动脚本
   */
  async function moveScript(scriptId: string, targetFolderId: string | null): Promise<void> {
    try {
      error.value = null;
      await repositoryService.moveCharacterScript(scriptId, targetFolderId);

      // 重新加载数据以保持同步
      await loadRepository();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移动脚本失败';
      throw err;
    }
  }

  /**
   * 切换文件夹展开状态
   */
  function toggleFolderExpand(folderId: string): void {
    if (expandedFolders.value.has(folderId)) {
      expandedFolders.value.delete(folderId);
    } else {
      expandedFolders.value.add(folderId);
    }
  }

  /**
   * 检查文件夹是否展开
   */
  function isFolderExpanded(folderId: string): boolean {
    return expandedFolders.value.has(folderId);
  }

  /**
   * 设置搜索过滤器
   */
  function setFilters(newFilters: Partial<SearchFilters>): void {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * 清除搜索过滤器
   */
  function clearFilters(): void {
    filters.value = {};
  }

  /**
   * 设置排序选项
   */
  function setSortOptions(newSortOptions: Partial<SortOptions>): void {
    sortOptions.value = { ...sortOptions.value, ...newSortOptions };
  }

  /**
   * 设置启用状态
   */
  function setEnabled(isEnabled: boolean): void {
    enabled.value = isEnabled;
  }

  /**
   * 清除错误信息
   */
  function clearError(): void {
    error.value = null;
  }

  /**
   * 获取文件夹中的脚本
   */
  function getFolderScripts(folderId: string): Script[] {
    return repositoryService.getFolderScripts(repository.value, folderId);
  }

  /**
   * 初始化仓库（加载数据）
   */
  async function init(): Promise<void> {
    await loadRepository();
  }

  /**
   * 切换脚本启用状态
   */
  async function toggleScriptEnabled(scriptId: string): Promise<void> {
    const script = getScript(scriptId);
    if (!script) {
      throw new Error('脚本不存在');
    }

    await updateScript(scriptId, { enabled: !script.enabled });
  }

  /**
   * 重置store状态
   */
  function $reset(): void {
    repository.value = [];
    expandedFolders.value.clear();
    filters.value = {};
    sortOptions.value = { field: 'name', order: 'asc' };
    isLoading.value = false;
    error.value = null;
    enabled.value = false;
  }

  return {
    // State
    repository,
    expandedFolders,
    filters,
    sortOptions,
    isLoading,
    error,
    enabled,

    // Getters
    allScripts,
    allFolders,
    rootScripts,
    filteredScripts,
    sortedScripts,
    enabledScriptsCount,
    totalScriptsCount,
    totalFoldersCount,
    hasSearchResults,

    // Actions
    loadRepository,
    saveRepository,
    createScript,
    updateScript,
    deleteScript,
    getScript,
    createFolder,
    deleteFolder,
    moveScript,
    toggleFolderExpand,
    isFolderExpanded,
    setFilters,
    clearFilters,
    setSortOptions,
    setEnabled,
    clearError,
    getFolderScripts,
    init,
    toggleScriptEnabled,
    $reset,
  };
});
