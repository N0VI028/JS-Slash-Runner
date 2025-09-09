import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { matchesNameByQuery } from '../../../common/SearchBar.vue';
import type {
  CreateFolderPayload,
  CreateScriptPayload,
  SearchFilters,
  SortOptions,
  UpdateScriptPayload,
} from '../schemas/payloads.schema';
import type { Repository, Script } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

export function createScriptStore(type: 'global' | 'character' | 'preset', id: string) {
  return defineStore(id, () => {
    // ===== State =====
    const repository = ref<Repository>([]);
    const expandedFolders = ref<Set<string>>(new Set());
    const filters = ref<SearchFilters>({});
    const sortOptions = ref<SortOptions>({ field: 'name', order: 'asc' });
    const isLoading = ref(false);
    const error = ref<string | null>(null);
    const enabled = ref(false);

    // ===== Getters =====
    const allScripts = computed((): Script[] => {
      return repositoryService.getAllScripts(repository.value);
    });

    const allFolders = computed(() => {
      return repositoryService.getAllFolders(repository.value);
    });

    const rootScripts = computed(() => {
      return repositoryService.getRootScripts(repository.value);
    });

    const filteredScripts = computed(() => {
      let list = allScripts.value;

      if (filters.value.keyword) {
        const keyword = String(filters.value.keyword);
        list = list.filter(script => matchesNameByQuery(script.name, keyword));
      }

      if (filters.value.enabled !== undefined) {
        list = list.filter(script => script.enabled === filters.value.enabled);
      }

      if (filters.value.folderId !== undefined) {
        if (filters.value.folderId === null) {
          list = list.filter(script => rootScripts.value.includes(script));
        } else {
          const folderScripts = repositoryService.getFolderScripts(repository.value, filters.value.folderId);
          list = list.filter(script => folderScripts.includes(script));
        }
      }

      return list;
    });

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

    const enabledScriptsCount = computed(() => allScripts.value.filter(s => s.enabled).length);
    const totalScriptsCount = computed(() => allScripts.value.length);
    const totalFoldersCount = computed(() => allFolders.value.length);
    const hasSearchResults = computed(() => filteredScripts.value.length > 0);

    // ===== Actions =====
    async function loadRepository(): Promise<void> {
      try {
        isLoading.value = true;
        error.value = null;
        const data = await repositoryService.loadRepositoryByType(type);
        repository.value = data;
      } catch (err) {
        error.value = err instanceof Error ? err.message : '加载仓库数据失败';
        throw err;
      } finally {
        isLoading.value = false;
      }
    }

    async function saveRepository(): Promise<void> {
      try {
        await repositoryService.saveRepositoryByType(type, repository.value);
      } catch (err) {
        error.value = err instanceof Error ? err.message : '保存仓库数据失败';
        throw err;
      }
    }

    async function createScript(payload: CreateScriptPayload): Promise<string> {
      try {
        error.value = null;
        const scriptId = await repositoryService.createScriptInType(type, payload);
        await loadRepository();
        return scriptId;
      } catch (err) {
        error.value = err instanceof Error ? err.message : '创建脚本失败';
        throw err;
      }
    }

    async function updateScript(scriptId: string, payload: UpdateScriptPayload): Promise<void> {
      try {
        error.value = null;
        await repositoryService.updateScriptInType(type, scriptId, payload);
        await loadRepository();
      } catch (err) {
        error.value = err instanceof Error ? err.message : '更新脚本失败';
        throw err;
      }
    }

    async function deleteScript(scriptId: string): Promise<void> {
      try {
        error.value = null;
        await repositoryService.deleteScriptInType(type, scriptId);
        await loadRepository();
      } catch (err) {
        error.value = err instanceof Error ? err.message : '删除脚本失败';
        throw err;
      }
    }

    function getScript(scriptId: string): Script | null {
      return allScripts.value.find(script => script.id === scriptId) || null;
    }

    async function createFolder(payload: CreateFolderPayload): Promise<string> {
      try {
        error.value = null;
        const folderId = await repositoryService.createFolderInType(type, payload);
        await loadRepository();
        return folderId;
      } catch (err) {
        error.value = err instanceof Error ? err.message : '创建文件夹失败';
        throw err;
      }
    }

    async function deleteFolder(folderId: string): Promise<void> {
      try {
        error.value = null;
        await repositoryService.deleteFolderInType(type, folderId);
        await loadRepository();
      } catch (err) {
        error.value = err instanceof Error ? err.message : '删除文件夹失败';
        throw err;
      }
    }

    async function moveScript(scriptId: string, targetFolderId: string | null): Promise<void> {
      try {
        error.value = null;
        await repositoryService.moveScriptWithinType(type, scriptId, targetFolderId);
        await loadRepository();
      } catch (err) {
        error.value = err instanceof Error ? err.message : '移动脚本失败';
        throw err;
      }
    }

    function toggleFolderExpand(folderId: string): void {
      if (expandedFolders.value.has(folderId)) {
        expandedFolders.value.delete(folderId);
      } else {
        expandedFolders.value.add(folderId);
      }
    }

    function isFolderExpanded(folderId: string): boolean {
      return expandedFolders.value.has(folderId);
    }

    function setFilters(newFilters: Partial<SearchFilters>): void {
      filters.value = { ...filters.value, ...newFilters };
    }

    function clearFilters(): void {
      filters.value = {};
    }

    function setSortOptions(newSortOptions: Partial<SortOptions>): void {
      sortOptions.value = { ...sortOptions.value, ...newSortOptions } as SortOptions;
    }

    async function setEnabled(isEnabled: boolean): Promise<void> {
      enabled.value = isEnabled;
      if (type === 'preset') {
        try {
          await repositoryService.setPresetEnabled(isEnabled);
        } catch (err) {
          // 静默失败：不阻断UI
          console.warn('保存预设开关失败:', err);
        }
      }
    }

    function clearError(): void {
      error.value = null;
    }

    function getFolderScripts(folderId: string): Script[] {
      return repositoryService.getFolderScripts(repository.value, folderId);
    }

    async function init(): Promise<void> {
      await loadRepository();
      if (type === 'preset') {
        try {
          enabled.value = await repositoryService.getPresetEnabled();
        } catch (_e) {
          enabled.value = false;
        }
      }
    }

    async function toggleScriptEnabled(scriptId: string): Promise<void> {
      const script = getScript(scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }
      await updateScript(scriptId, { enabled: !script.enabled });
    }

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
}
