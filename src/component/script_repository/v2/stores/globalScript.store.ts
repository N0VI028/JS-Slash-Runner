import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type {
    CreateFolderPayload,
    CreateScriptPayload,
    MoveScriptPayload,
    RenameFolderPayload,
    SearchFilters,
    SortOptions,
    UpdateScriptPayload,
} from '../schemas/payloads.schema';
import type { Folder, Script } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

/**
 * 全局脚本 Store
 * 专门管理全局脚本和文件夹
 */
export const useGlobalScriptStore = defineStore('globalScript', () => {
  // ===== State =====

  /**
   * 全局脚本的集合
   */
  const scripts = ref<Map<string, Script>>(new Map());

  /**
   * 全局文件夹的集合
   */
  const folders = ref<Map<string, Folder>>(new Map());

  /**
   * 根级别的项目ID列表（脚本和文件夹）
   */
  const rootItems = ref<string[]>([]);

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
   * 获取所有脚本数组
   */
  const allScripts = computed(() => Array.from(scripts.value.values()));

  /**
   * 获取所有文件夹数组
   */
  const allFolders = computed(() => Array.from(folders.value.values()));

  /**
   * 根据过滤条件获取筛选后的脚本列表
   */
  const filteredScripts = computed(() => {
    let list = allScripts.value;

    // 应用关键字过滤
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase();
      list = list.filter(script => 
        script.name.toLowerCase().includes(keyword) ||
        script.info.toLowerCase().includes(keyword) ||
        script.content.toLowerCase().includes(keyword)
      );
    }

    // 应用启用状态过滤
    if (filters.value.enabled !== undefined) {
      list = list.filter(script => script.enabled === filters.value.enabled);
    }

    // 应用文件夹过滤
    if (filters.value.folderId !== undefined) {
      list = list.filter(script => script.folderId === filters.value.folderId);
    }

    return list;
  });

  /**
   * 排序后的脚本列表
   */
  const sortedScripts = computed(() => {
    const list = [...filteredScripts.value];
    const { field, order } = sortOptions.value;

    list.sort((a, b) => {
      let aVal: any = a[field as keyof Script];
      let bVal: any = b[field as keyof Script];

      // 处理不同类型的排序
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  });

  /**
   * 构建文件夹树结构
   */
  const folderTree = computed(() => {
    const buildTree = (parentId: string | null): Folder[] => {
      return allFolders.value
        .filter(folder => folder.parentId === parentId)
        .sort((a, b) => a.name.localeCompare(b.name));
    };

    return buildTree(null);
  });

  // ===== Actions =====

  /**
   * 初始化全局脚本仓库数据
   */
  async function init(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // 加载全局脚本仓库
      const repository = await repositoryService.loadRepositoryByType('global');

      // 清空现有数据
      scripts.value.clear();
      folders.value.clear();
      rootItems.value = [];

      // 加载脚本数据
      repository.scripts.forEach(script => {
        scripts.value.set(script.id, script);
      });

      // 加载文件夹数据
      repository.folders.forEach(folder => {
        folders.value.set(folder.id, folder);
      });

      // 设置根目录项目
      rootItems.value = repository.rootItems;

      // 加载启用状态
      enabled.value = await repositoryService.getTypeEnabled('global');

      console.log(`[GlobalScriptStore] 加载完成: ${repository.scripts.length} 脚本, ${repository.folders.length} 文件夹`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载全局脚本失败';
      console.error('[GlobalScriptStore] 初始化失败:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 创建脚本
   */
  async function createScript(payload: CreateScriptPayload): Promise<string> {
    try {
      const scriptId = await repositoryService.createScriptInType('global', payload);
      
      // 重新加载数据以确保同步
      await init();

      return scriptId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建脚本失败';
      throw err;
    }
  }

  /**
   * 更新脚本
   */
  async function updateScript(payload: UpdateScriptPayload): Promise<void> {
    const script = scripts.value.get(payload.id);
    if (!script) {
      throw new Error(`脚本不存在: ${payload.id}`);
    }

    try {
      // 调用 repository service 保存
      await repositoryService.updateScript(payload);

      // 更新本地状态
      const updatedScript = { ...script, ...payload };
      scripts.value.set(payload.id, updatedScript);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新脚本失败';
      throw err;
    }
  }

  /**
   * 删除脚本
   */
  async function deleteScript(id: string): Promise<void> {
    const script = scripts.value.get(id);
    if (!script) {
      throw new Error(`脚本不存在: ${id}`);
    }

    try {
      await repositoryService.deleteScript(id);

      // 从本地状态中移除
      scripts.value.delete(id);

      // 从根目录或文件夹中移除
      const rootIndex = rootItems.value.indexOf(id);
      if (rootIndex !== -1) {
        rootItems.value.splice(rootIndex, 1);
      } else {
        // 从文件夹中移除
        allFolders.value.forEach(folder => {
          const index = folder.scripts.indexOf(id);
          if (index !== -1) {
            folder.scripts.splice(index, 1);
          }
        });
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除脚本失败';
      throw err;
    }
  }

  /**
   * 移动脚本
   */
  async function moveScript(payload: MoveScriptPayload): Promise<void> {
    try {
      await repositoryService.moveScriptWithinType('global', payload.id, payload.toFolderId);
      
      // 重新加载数据以确保同步
      await init();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移动脚本失败';
      throw err;
    }
  }

  /**
   * 切换脚本启用状态
   */
  async function toggleScriptEnabled(id: string): Promise<void> {
    const script = scripts.value.get(id);
    if (!script) {
      throw new Error(`脚本不存在: ${id}`);
    }

    try {
      const newEnabled = !script.enabled;
      await updateScript({ id, enabled: newEnabled });
    } catch (err) {
      error.value = err instanceof Error ? err.message : '切换脚本状态失败';
      throw err;
    }
  }

  /**
   * 设置过滤条件
   */
  function setFilters(newFilters: Partial<SearchFilters>): void {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * 设置排序选项
   */
  function setSortOptions(newOptions: Partial<SortOptions>): void {
    sortOptions.value = { ...sortOptions.value, ...newOptions };
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
   * 创建文件夹
   */
  async function createFolder(payload: CreateFolderPayload): Promise<string> {
    try {
      const folderId = await repositoryService.createFolderInType('global', payload);
      
      // 重新加载数据以确保同步
      await init();

      return folderId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建文件夹失败';
      throw err;
    }
  }

  /**
   * 重命名文件夹
   */
  async function renameFolder(payload: RenameFolderPayload): Promise<void> {
    try {
      // TODO: 实现重命名文件夹的 repository service 方法
      // 暂时重新加载数据
      await init();
      
      // 更新本地状态
      const folder = folders.value.get(payload.id);
      if (folder) {
        folder.name = payload.name;
        folders.value.set(payload.id, { ...folder });
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重命名文件夹失败';
      throw err;
    }
  }

  /**
   * 删除文件夹
   */
  async function deleteFolder(id: string): Promise<void> {
    try {
      await repositoryService.deleteFolder(id);
      
      // 重新加载数据以确保同步
      await init();
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除文件夹失败';
      throw err;
    }
  }

  /**
   * 设置启用状态
   */
  async function setEnabled(enable: boolean): Promise<void> {
    try {
      await repositoryService.setTypeEnabled('global', enable);
      enabled.value = enable;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '设置启用状态失败';
      throw err;
    }
  }

  return {
    // State
    scripts,
    folders,
    rootItems,
    expandedFolders,
    filters,
    sortOptions,
    isLoading,
    error,
    enabled,

    // Getters
    allScripts,
    allFolders,
    filteredScripts,
    sortedScripts,
    folderTree,

    // Actions
    init,
    createScript,
    updateScript,
    deleteScript,
    moveScript,
    toggleScriptEnabled,
    setFilters,
    setSortOptions,
    toggleFolderExpand,
    createFolder,
    renameFolder,
    deleteFolder,
    setEnabled,
  };
});
