<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <div v-if="allItems.length === 0" class="empty-state">
      <p>暂无脚本</p>
    </div>

    <!-- 脚本和文件夹列表 -->
    <div v-else class="script-list" ref="listContainer">
      <template v-for="item in allItems" :key="`${item.type}-${item.id}`">
        <!-- 文件夹项 -->
        <FolderItem 
          v-if="item.type === 'folder'"
          :folder="item.data"
          :is-expanded="expandedFolders?.has(item.id) ?? false"
          :folder-scripts="getFolderScripts(item.id)"
          :batch-mode="batchMode"
          :selected="selectedFolderIds?.has(item.id) ?? false"
          :repo-type="repoType"
          @toggle-expand="id => emit('toggle-folder-expand', id)"
          @toggle-folder-scripts="id => emit('toggle-folder-scripts', id)"
          @edit-folder="id => emit('edit-folder', id)"
          @export-folder="id => emit('export-folder', id)"
          @move-folder="id => emit('move-folder', id)"
          @delete-folder="id => emit('delete-folder', id)"
          @select-folder="(id, selected) => emit('select-folder', id, selected)"
        >
          <!-- 文件夹内的脚本 -->
          <ScriptItem
            v-for="script in getFolderScripts(item.id)"
            :key="`script-${script.id}`"
            :script="script"
            :repo-type="repoType"
            :batch-mode="batchMode"
            :selected="selectedScriptIds?.has(script.id) ?? false"
            @toggle-script="id => emit('toggle-script', id)"
            @show-info="id => emit('show-info', id)"
            @edit-script="id => emit('edit-script', id)"
            @move-script="id => emit('move-script', id)"
            @move-script-type="id => emit('move-script-type', id)"
            @export-script="id => emit('export-script', id)"
            @delete-script="id => emit('delete-script', id)"
            @select-script="(id, selected) => emit('select-script', id, selected)"
          />
        </FolderItem>
        
        <!-- 脚本项 -->
        <ScriptItem 
          v-else
          :script="item.data"
          :repo-type="repoType"
          :batch-mode="batchMode"
          :selected="selectedScriptIds?.has(item.id) ?? false"
          @toggle-script="id => emit('toggle-script', id)"
          @show-info="id => emit('show-info', id)"
          @edit-script="id => emit('edit-script', id)"
          @move-script="id => emit('move-script', id)"
          @move-script-type="id => emit('move-script-type', id)"
          @export-script="id => emit('export-script', id)"
          @delete-script="id => emit('delete-script', id)"
          @select-script="(id, selected) => emit('select-script', id, selected)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/component/script_repository/components/FolderItem.vue';
import ScriptItem from '@/component/script_repository/components/ScriptItem.vue';
import { useJQueryDrag } from '@/component/script_repository/composables/useJQueryDrag';
import type { Script, ScriptRepository, ScriptType } from '@/component/script_repository/schemas/script.schema';
import { ScriptRepositoryItemSchema, ScriptSchema } from '@/component/script_repository/schemas/script.schema';
import { getStoreByType } from '@/component/script_repository/stores/factory';
import { computed, ref } from 'vue';

interface Props {
  repository: ScriptRepository;
  expandedFolders?: Set<string>;
  isSearching: boolean;
  repoType: ScriptType;
  batchMode?: boolean;
  selectedScriptIds?: Set<string>;
  selectedFolderIds?: Set<string>;
  searchKeyword?: string;
}

const props = withDefaults(defineProps<Props>(), {
  expandedFolders: () => new Set(),
  batchMode: false,
  selectedScriptIds: () => new Set<string>(),
  selectedFolderIds: () => new Set<string>(),
});

import { matchesNameByQuery } from '@/component/common/SearchBar.vue';

const emit = defineEmits<{
  'clear-search': [];
  'create-script': [];
  'toggle-script': [id: string];
  'show-info': [id: string];
  'edit-script': [id: string];
  'move-script': [id: string];
  'move-script-type': [id: string];
  'export-script': [id: string];
  'delete-script': [id: string];
  'toggle-folder-expand': [id: string];
  'toggle-folder-scripts': [id: string];
  'edit-folder': [id: string];
  'export-folder': [id: string];
  'move-folder': [id: string];
  'delete-folder': [id: string];
  'select-script': [id: string, selected: boolean];
  'select-folder': [id: string, selected: boolean];
}>();

const listContainer = ref<HTMLElement>();

// Store实例
const storeByType = getStoreByType();
const currentStore = computed(() => storeByType[props.repoType]);

const { useListSortable, useRootDrop } = useJQueryDrag();
useListSortable(listContainer, props.repoType);
useRootDrop(listContainer, props.repoType);

const allItems = computed(() => {
  const items: Array<{ type: 'folder' | 'script'; id: string; data: any }> = [];

  for (const item of props.repository) {
    // 使用zod验证数据类型
    const scriptResult = ScriptSchema.safeParse(item);
    if (scriptResult.success) {
      // 直接的脚本对象
      const script = scriptResult.data;
      // 根级脚本：按搜索关键字过滤名称
      const show = !props.searchKeyword || matchesNameByQuery(script.name, props.searchKeyword);
      if (show) {
        items.push({ type: 'script', id: script.id, data: script });
      }
      continue;
    }

    const repositoryItemResult = ScriptRepositoryItemSchema.safeParse(item);
    if (repositoryItemResult.success) {
      const repositoryItem = repositoryItemResult.data;
      if (repositoryItem.type === 'folder') {
        // 未搜索时：显示所有文件夹；搜索时：仅显示包含匹配脚本的文件夹
        const folderId = repositoryItem.id || 'unknown';
        const hasVisible = getFolderScripts(folderId).length > 0;
        if (!props.searchKeyword || hasVisible) {
          items.push({
            type: 'folder',
            id: folderId,
            data: repositoryItem,
          });
        }
      } else if (repositoryItem.type === 'script') {
        const script = repositoryItem.value as Script;
        const show = !props.searchKeyword || matchesNameByQuery(script.name, props.searchKeyword);
        if (show) {
          items.push({ type: 'script', id: script.id, data: script });
        }
      }
    }
  }

  return items;
});

/**
 * 获取指定文件夹内的脚本
 * @param folderId 文件夹ID
 * @returns 脚本列表
 */
const getFolderScripts = (folderId: string): Script[] => {
  return currentStore.value.getFolderScripts(folderId, props.searchKeyword);
};

</script>

<style scoped>
.script-list-container {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.script-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 20px;
  opacity: 0.5;
}

/* 拖拽状态样式 */
.script-list.root-drag-target {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 5%, transparent);
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
}
</style>
