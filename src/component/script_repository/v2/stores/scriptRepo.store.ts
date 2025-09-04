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

export const useScriptRepoStore = defineStore('scriptRepo', () => {
  // ===== State =====

  /**
   * 所有脚本的集合
   */
  const scripts = ref<Map<string, Script>>(new Map());

  /**
   * 所有文件夹的集合
   */
  const folders = ref<Map<string, Folder>>(new Map());

  /**
   * 根级别的项目ID列表（脚本和文件夹）
   */
  const rootItems = ref<string[]>([]);

  /**
   * 当前选中的脚本ID
   */
  const selectedScriptId = ref<string | null>(null);

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
   * 获取当前选中的脚本
   */
  const selectedScript = computed(() => (selectedScriptId.value ? scripts.value.get(selectedScriptId.value) : null));

  /**
   * 根据过滤条件获取筛选后的脚本列表
   */
  const filteredScripts = computed(() => {
    let result = allScripts.value;

    // 关键词过滤
    if (filters.value.keyword) {
      const keyword = filters.value.keyword.toLowerCase();
      result = result.filter(
        script =>
          script.name.toLowerCase().includes(keyword) ||
          script.content.toLowerCase().includes(keyword) ||
          script.info.toLowerCase().includes(keyword),
      );
    }

    // 启用状态过滤
    if (filters.value.enabled !== undefined) {
      result = result.filter(script => script.enabled === filters.value.enabled);
    }

    // 文件夹过滤
    if (filters.value.folderId !== undefined) {
      if (filters.value.folderId === null) {
        // 显示根目录的脚本
        result = result.filter(script => rootItems.value.includes(script.id));
      } else {
        // 显示特定文件夹的脚本
        const folder = folders.value.get(filters.value.folderId);
        if (folder) {
          result = result.filter(script => folder.scripts.includes(script.id));
        }
      }
    }

    return result;
  });

  /**
   * 根据排序选项获取排序后的脚本列表
   */
  const sortedScripts = computed(() => {
    const list = [...filteredScripts.value];
    const { field, order } = sortOptions.value;

    list.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'enabled':
          aValue = a.enabled;
          bValue = b.enabled;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (aValue < bValue) return order === 'asc' ? -1 : 1;
      if (aValue > bValue) return order === 'asc' ? 1 : -1;
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
   * 初始化仓库数据
   */
  async function init(): Promise<void> {
    isLoading.value = true;
    error.value = null;

    try {
      // 调用 repository.service 加载数据
      const repository = await repositoryService.loadRepository();

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

      console.log(`[ScriptRepoStore] 加载完成: ${repository.scripts.length} 脚本, ${repository.folders.length} 文件夹`);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载失败';
      console.error('[ScriptRepoStore] 初始化失败:', err);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 创建脚本
   */
  async function createScript(payload: CreateScriptPayload): Promise<string> {
    try {
      // TODO: 调用 repository.service 保存
      const scriptId = crypto.randomUUID();
      const script: Script = {
        id: scriptId,
        name: payload.name,
        content: payload.content || '',
        info: payload.info || '',
        enabled: payload.enabled,
        buttons: [],
        data: {},
      };

      scripts.value.set(scriptId, script);

      // 添加到指定文件夹或根目录
      if (payload.folderId) {
        const folder = folders.value.get(payload.folderId);
        if (folder) {
          folder.scripts.push(scriptId);
        }
      } else {
        rootItems.value.push(scriptId);
      }

      // 选中新创建的脚本
      selectedScriptId.value = scriptId;

      return scriptId;
    } catch (err) {
      error.value = err instanceof Error ? err.message : '创建失败';
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
      // TODO: 调用 repository.service 保存
      Object.assign(script, payload);

      // 触发响应式更新
      scripts.value.set(payload.id, { ...script });
    } catch (err) {
      error.value = err instanceof Error ? err.message : '更新失败';
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
      // TODO: 调用 repository.service 删除
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

      // 如果删除的是当前选中的脚本，清除选择
      if (selectedScriptId.value === id) {
        selectedScriptId.value = null;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除失败';
      throw err;
    }
  }

  /**
   * 移动脚本
   */
  async function moveScript(payload: MoveScriptPayload): Promise<void> {
    const script = scripts.value.get(payload.id);
    if (!script) {
      throw new Error(`脚本不存在: ${payload.id}`);
    }

    try {
      // TODO: 调用 repository.service 保存

      // 从原位置移除
      const rootIndex = rootItems.value.indexOf(payload.id);
      if (rootIndex !== -1) {
        rootItems.value.splice(rootIndex, 1);
      } else {
        // 从文件夹中移除
        allFolders.value.forEach(folder => {
          const index = folder.scripts.indexOf(payload.id);
          if (index !== -1) {
            folder.scripts.splice(index, 1);
          }
        });
      }

      // 添加到新位置
      if (payload.toFolderId) {
        const folder = folders.value.get(payload.toFolderId);
        if (folder) {
          folder.scripts.push(payload.id);
        }
      } else {
        rootItems.value.push(payload.id);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '移动失败';
      throw err;
    }
  }

  /**
   * 选择脚本
   */
  function selectScript(id: string | null): void {
    selectedScriptId.value = id;
  }

  /**
   * 切换脚本启用状态
   */
  async function toggleScriptEnabled(id: string): Promise<void> {
    const script = scripts.value.get(id);
    if (!script) {
      throw new Error(`脚本不存在: ${id}`);
    }

    await updateScript({
      id,
      enabled: !script.enabled,
    });
  }

  /**
   * 设置搜索过滤条件
   */
  function setFilters(newFilters: Partial<SearchFilters>): void {
    filters.value = { ...filters.value, ...newFilters };
  }

  /**
   * 设置排序选项
   */
  function setSortOptions(options: SortOptions): void {
    sortOptions.value = options;
  }

  /**
   * 切换文件夹展开状态
   */
  function toggleFolderExpand(id: string): void {
    if (expandedFolders.value.has(id)) {
      expandedFolders.value.delete(id);
    } else {
      expandedFolders.value.add(id);
    }
  }

  // ===== 文件夹操作 =====

  /**
   * 创建文件夹
   */
  async function createFolder(payload: CreateFolderPayload): Promise<string> {
    try {
      const folderId = crypto.randomUUID();
      const folder: Folder = {
        id: folderId,
        name: payload.name,
        parentId: payload.parentId,
        icon: payload.icon,
        color: payload.color,
        expanded: false,
        scripts: [],
      };

      folders.value.set(folderId, folder);

      if (!payload.parentId) {
        rootItems.value.push(folderId);
      }

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
    const folder = folders.value.get(payload.id);
    if (!folder) {
      throw new Error(`文件夹不存在: ${payload.id}`);
    }

    try {
      folder.name = payload.name;
      folders.value.set(payload.id, { ...folder });
    } catch (err) {
      error.value = err instanceof Error ? err.message : '重命名失败';
      throw err;
    }
  }

  /**
   * 删除文件夹
   */
  async function deleteFolder(id: string): Promise<void> {
    const folder = folders.value.get(id);
    if (!folder) {
      throw new Error(`文件夹不存在: ${id}`);
    }

    try {
      // TODO: 处理文件夹内的脚本（移动到根目录或删除）
      folders.value.delete(id);

      const rootIndex = rootItems.value.indexOf(id);
      if (rootIndex !== -1) {
        rootItems.value.splice(rootIndex, 1);
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : '删除文件夹失败';
      throw err;
    }
  }

  return {
    // State
    scripts: scripts.value,
    folders: folders.value,
    rootItems: rootItems.value,
    selectedScriptId,
    expandedFolders,
    filters,
    sortOptions,
    isLoading,
    error,

    // Getters
    allScripts,
    allFolders,
    selectedScript,
    filteredScripts,
    sortedScripts,
    folderTree,

    // Actions
    init,
    createScript,
    updateScript,
    deleteScript,
    moveScript,
    selectScript,
    toggleScriptEnabled,
    setFilters,
    setSortOptions,
    toggleFolderExpand,
    createFolder,
    renameFolder,
    deleteFolder,
  };
});
