import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { matchesNameByQuery } from '../../../common/SearchBar.vue';
import type { Script, ScriptRepository, SearchFilters } from '../schemas/script.schema';
import { repositoryService } from '../services/repository.service';

export function createScriptStore(type: ScriptType) {
  const storeId = `${type}-Script`;
  return defineStore(storeId, () => {
    const repository = ref<ScriptRepository>([]);
    const expandedFolders = ref<Set<string>>(new Set());
    const filters = ref<SearchFilters>({});
    const enabled = ref(false);

    // ===== Getters =====
    const allScripts = computed((): Script[] => {
      const result: Script[] = [];
      for (const item of repository.value as any[]) {
        const anyItem: any = item as any;
        if (anyItem && anyItem.type === 'script' && anyItem.value) {
          result.push(anyItem.value as Script);
        } else if (anyItem && anyItem.type === 'folder' && Array.isArray(anyItem.value)) {
          result.push(...(anyItem.value as Script[]));
        } else if ((item as any)?.id && (item as any)?.content !== undefined) {
          // 顶层纯 Script 兼容
          result.push(item as unknown as Script);
        }
      }
      return result;
    });

    const allFolders = computed(() => {
      const folders: any[] = [];
      for (const item of repository.value as any[]) {
        const anyItem: any = item as any;
        if (anyItem && anyItem.type === 'folder') folders.push(anyItem);
      }
      return folders;
    });

    const rootScripts = computed(() => {
      const roots: Script[] = [];
      for (const item of repository.value as any[]) {
        const anyItem: any = item as any;
        if (anyItem && anyItem.type === 'script' && anyItem.value) {
          roots.push(anyItem.value as Script);
        } else if ((item as any)?.id && (item as any)?.content !== undefined) {
          roots.push(item as unknown as Script);
        }
      }
      return roots;
    });

    const filteredScripts = computed(() => {
      let list = allScripts.value;

      if (filters.value.keyword) {
        const keyword = String(filters.value.keyword);
        list = list.filter(script => matchesNameByQuery(script.name, keyword));
      }

      if (filters.value.folderId !== undefined) {
        if (filters.value.folderId === null) {
          list = list.filter(script => rootScripts.value.includes(script));
        } else {
          const folderScripts = getFolderScripts(filters.value.folderId);
          list = list.filter(script => folderScripts.includes(script));
        }
      }

      return list;
    });

    const enabledScriptsCount = computed(() => allScripts.value.filter(s => s.enabled).length);
    const totalScriptsCount = computed(() => allScripts.value.length);
    const totalFoldersCount = computed(() => allFolders.value.length);
    const hasSearchResults = computed(() => filteredScripts.value.length > 0);
    /**
     * 加载仓库
     */
    async function loadRepository(): Promise<void> {
      try {
        const data = await repositoryService.loadRepositoryByType(type);
        repository.value = data;
      } catch (err) {
        throw err;
      }
    }

    async function saveRepository(): Promise<void> {
      try {
        await repositoryService.saveRepositoryByType(type, repository.value);
      } catch (err) {
        throw err;
      }
    }

    async function createScript(schema: Partial<Script>): Promise<string> {
      try {
        const scriptId = await repositoryService.createScriptInType(type, schema);
        await loadRepository();
        return scriptId;
      } catch (err) {
        throw err;
      }
    }

    async function updateScript(scriptId: string, payload: Partial<Script>): Promise<void> {
      try {
        const current = getScript(scriptId);
        if (!current) throw new Error('脚本不存在');
        const next: Script = { ...current, ...payload } as Script;
        await repositoryService.updateScriptInType(type, next);
        await loadRepository();
      } catch (err) {
        throw err;
      }
    }

    async function deleteScript(scriptId: string): Promise<void> {
      try {
        await repositoryService.deleteScriptInType(type, scriptId);
        await loadRepository();
      } catch (err) {
        throw err;
      }
    }

    function getScript(scriptId: string): Script | null {
      return allScripts.value.find(script => script.id === scriptId) || null;
    }

    async function createFolder(payload: any): Promise<string> {
      try {
        const folderId = await repositoryService.createFolderInType(type, payload);
        await loadRepository();
        return folderId;
      } catch (err) {
        throw err;
      }
    }

    async function deleteFolder(folderId: string): Promise<void> {
      try {
        await repositoryService.deleteFolderInType(type, folderId);
        await loadRepository();
      } catch (err) {
        throw err;
      }
    }

    async function moveScript(scriptId: string, targetFolderId: string | null): Promise<void> {
      try {
        await repositoryService.moveScriptWithinType(type, scriptId, targetFolderId);
        await loadRepository();
      } catch (err) {
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

    async function setEnabled(isEnabled: boolean): Promise<void> {
      enabled.value = isEnabled;
    }

    function getFolderScripts(folderId: string): Script[] {
      const folderItem = (repository.value as any[]).find(
        item => (item as any)?.type === 'folder' && (item as any)?.id === folderId,
      );
      if (folderItem && Array.isArray((folderItem as any).value)) return (folderItem as any).value as Script[];
      return [];
    }

    async function init(): Promise<void> {
      await loadRepository();
    }

    async function toggleScriptEnabled(scriptId: string): Promise<void> {
      const script = getScript(scriptId);
      if (!script) {
        throw new Error('脚本不存在');
      }
      await updateScript(scriptId, { enabled: !script.enabled });
    }

    function $reset(): void {
      repository.value = [] as any;
      expandedFolders.value.clear();
      filters.value = {};
      enabled.value = false;
    }

    return {
      // State
      repository,
      expandedFolders,
      filters,
      enabled,

      // Getters
      allScripts,
      allFolders,
      rootScripts,
      filteredScripts,
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
      setEnabled,
      getFolderScripts,
      init,
      toggleScriptEnabled,
      $reset,
    };
  });
}

// 便捷 hooks
export const useGlobalScriptStore = createScriptStore('global');
export const useCharacterScriptStore = createScriptStore('character');
export const usePresetScriptStore = createScriptStore('preset');
