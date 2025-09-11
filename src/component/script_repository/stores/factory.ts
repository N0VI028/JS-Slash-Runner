import type { Script, ScriptRepository, ScriptType, SearchFilters } from '@/component/script_repository/schemas/script.schema';
import _ from 'lodash';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { matchesNameByQuery } from '../../common/SearchBar.vue';
import { repositoryService } from '../services/repository.service';

export function createScriptStore(type: ScriptType) {
  const storeId = `${type}-Script`;
  return defineStore(storeId, () => {
    const repository = ref<ScriptRepository>([]);
    const expandedFolders = ref<Set<string>>(new Set());
    const filters = ref<SearchFilters>({});
    const enabled = ref(false);
    
    // 批量操作状态
    const batchMode = ref(false);
    const selectedScriptIds = ref<Set<string>>(new Set());
    const selectedFolderIds = ref<Set<string>>(new Set());

    // ===== Getters =====
    const allScripts = computed((): Script[] => {
      const result: Script[] = [];
      for (const item of repository.value as any[]) {
        const anyItem: any = item as any;
        if (anyItem && anyItem.type === 'script' && anyItem.value) {
          console.log('[Store] allScripts - 处理脚本类型项:', {
            rootId: anyItem.id,
            rootName: anyItem.name,
            valueId: anyItem.value?.id,
            valueName: anyItem.value?.name,
            item: anyItem
          });
          result.push(anyItem.value as Script);
        } else if (anyItem && anyItem.type === 'folder' && Array.isArray(anyItem.value)) {
          console.log('[Store] allScripts - 处理文件夹类型项:', {
            folderId: anyItem.id,
            folderName: anyItem.name,
            scriptsCount: anyItem.value.length
          });
          result.push(...(anyItem.value as Script[]));
        } else if ((item as any)?.id && (item as any)?.content !== undefined) {
          // 顶层纯 Script 兼容
          console.log('[Store] allScripts - 处理纯脚本对象:', {
            id: (item as any).id,
            name: (item as any).name
          });
          result.push(item as unknown as Script);
        }
      }
      console.log('[Store] allScripts - 总计脚本数量:', result.length);
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
      const data = repositoryService.loadRepositoryByType(type);
      repository.value = _.cloneDeep(data);
    }

    async function saveRepository(): Promise<void> {
      await repositoryService.saveRepositoryByType(type, repository.value);
    }

    async function createScript(schema: Partial<Script>): Promise<string> {
      const scriptId = await repositoryService.createScriptInType(type, schema);
      await loadRepository();
      return scriptId;
    }

    async function updateScript(scriptId: string, payload: Partial<Script>): Promise<void> {
      const script = getScript(scriptId);
      if (!script) {
          throw new Error('脚本不存在');
      }
      // 直接在内存中更新对象状态
      Object.assign(script, payload);
  }

  async function deleteScript(scriptId: string): Promise<void> {
    // 同样，只操作内存中的 repository.value
    // 注意：这里的实现需要 lodash 或者递归函数来处理嵌套情况
    const removeRecursively = (items: any[]) => {
        _.remove(items, (item: any) => {
            if (item.type === 'script' && item.value?.id === scriptId) return true;
            if (item.id && item.content !== undefined && item.id === scriptId) return true; // 兼容顶层脚本
            if (item.type === 'folder' && Array.isArray(item.value)) {
                removeRecursively(item.value);
            }
            return false;
        });
    };
    removeRecursively(repository.value);
}

    function getScript(scriptId: string): Script | null {
      return allScripts.value.find(script => script.id === scriptId) || null;
    }

    async function createFolder(payload: any): Promise<string> {
      const folderId = await repositoryService.createFolderInType(type, payload);
      await loadRepository();
      return folderId;
    }

    async function deleteFolder(folderId: string): Promise<void> {
      await repositoryService.deleteFolderInType(type, folderId);
      await loadRepository();
    }

    async function moveScript(scriptId: string, targetFolderId: string | null): Promise<void> {
      await repositoryService.moveScriptWithinType(type, scriptId, targetFolderId);
      await loadRepository();
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
    /**
     * 设置类型开关
     * @param isEnabled 是否启用
     * @returns void
    */
    async function setEnabled(isEnabled: boolean): Promise<void> {
      enabled.value = isEnabled;
    }

    /**
     * 初始化设置类型开关（不触发 watch）
     * 用于初始化阶段避免触发持久化保存
     * @param isEnabled 是否启用
     * @returns void
    */
    function initEnabled(isEnabled: boolean): void {
      enabled.value = isEnabled;
    }

    function getFolderScripts(folderId: string, searchKeyword?: string): Script[] {
      const folderItem = (repository.value as any[]).find(
        item => (item as any)?.type === 'folder' && (item as any)?.id === folderId,
      );
      if (folderItem && Array.isArray((folderItem as any).value)) {
        const scripts = (folderItem as any).value as Script[];
        if (!searchKeyword) return scripts;
        return scripts.filter(s => matchesNameByQuery(s.name, searchKeyword));
      }
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

    // 批量操作方法
    function toggleBatchMode(): void {
      batchMode.value = !batchMode.value;
      if (!batchMode.value) clearBatchSelections();
    }

    function enterBatchMode(): void {
      batchMode.value = true;
    }

    function exitBatchMode(): void {
      batchMode.value = false;
      clearBatchSelections();
    }

    function clearBatchSelections(): void {
      selectedScriptIds.value.clear();
      selectedFolderIds.value.clear();
    }

    function selectScript(id: string, selected: boolean): void {
      if (selected) selectedScriptIds.value.add(id);
      else selectedScriptIds.value.delete(id);
    }

    function selectFolder(id: string, selected: boolean): void {
      if (selected) selectedFolderIds.value.add(id);
      else selectedFolderIds.value.delete(id);
    }

    function $reset(): void {
      repository.value = [] as any;
      expandedFolders.value.clear();
      filters.value = {};
      enabled.value = false;
      batchMode.value = false;
      selectedScriptIds.value.clear();
      selectedFolderIds.value.clear();
    }

    return {
      // State
      repository,
      expandedFolders,
      filters,
      enabled,
      batchMode,
      selectedScriptIds,
      selectedFolderIds,

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
      initEnabled,
      getFolderScripts,
      init,
      toggleScriptEnabled,
      
      // Batch Actions
      toggleBatchMode,
      enterBatchMode,
      exitBatchMode,
      clearBatchSelections,
      selectScript,
      selectFolder,
      
      $reset,
    };
  });
}

// 便捷 hooks
export const useGlobalScriptStore = createScriptStore('global');
export const useCharacterScriptStore = createScriptStore('character');
export const usePresetScriptStore = createScriptStore('preset');

/**
 * 获取所有类型的store映射
 */
export function getStoreByType() {
  return {
    global: useGlobalScriptStore(),
    character: useCharacterScriptStore(), 
    preset: usePresetScriptStore(),
  } as const;
}

/**
 * 重新加载所有类型的仓库数据
 */
export const loadAllRepositories = async (): Promise<void> => {
  const stores = [
    useGlobalScriptStore(),
    useCharacterScriptStore(),
    usePresetScriptStore()
  ];
  
  await Promise.all(stores.map(store => store.init()));
};
