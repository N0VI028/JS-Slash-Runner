<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <div v-if="allItems.length === 0" class="empty-state">
      <p>暂无脚本</p>
    </div>

    <!-- 脚本和文件夹列表 -->
    <div v-else class="script-list" ref="listContainer">
      <template v-for="item in allItems" :key="`${item.type}-${item.id}`">
        <component :is="getComponentType(item)" v-bind="getComponentProps(item)" v-on="getComponentEvents(item)">
          <!-- 如果是文件夹，渲染文件夹内的脚本 -->
          <template v-if="item.type === 'folder'">
            <component
              v-for="script in getFolderScripts(item.id)"
              :key="`script-${script.id}`"
              :is="ScriptItem"
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
          </template>
        </component>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useJQueryDrag } from '../composables/useJQueryDrag';
import type { Script, ScriptRepository } from '../schemas/script.schema';
import { ScriptRepositoryItemSchema, ScriptSchema } from '../schemas/script.schema';
import FolderItem from './FolderItem.vue';
import ScriptItem from './ScriptItem.vue';

// Props
import type { ScriptType } from '@/component/script_repository/v2/schemas/script.schema';

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

import { matchesNameByQuery } from '../../../common/SearchBar.vue';

// Emits
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

// Template refs
const listContainer = ref<HTMLElement>();

// 拖拽功能
const { useListSortable, useRootDrop } = useJQueryDrag();
useListSortable(listContainer);
useRootDrop(listContainer, props.repoType);

// 计算属性：解析仓库数据为列表项
const allItems = computed(() => {
  const items: Array<{ type: 'folder' | 'script'; id: string; data: ScriptRepository | Script }> = [];

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

// 获取指定文件夹内的脚本
const getFolderScripts = (folderId: string): Script[] => {
  for (const item of props.repository) {
    const repositoryItemResult = ScriptRepositoryItemSchema.safeParse(item);
    if (repositoryItemResult.success) {
      const repositoryItem = repositoryItemResult.data;
      if (repositoryItem.type === 'folder' && repositoryItem.id === folderId) {
        const scripts = Array.isArray(repositoryItem.value) ? repositoryItem.value : [];
        if (!props.searchKeyword) return scripts;
        return scripts.filter(s => matchesNameByQuery(s.name, props.searchKeyword || ''));
      }
    }
  }
  return [];
};

// 动态组件类型
const getComponentType = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepository | Script }) => {
  return item.type === 'folder' ? FolderItem : ScriptItem;
};

// 动态组件属性
const getComponentProps = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepository | Script }) => {
  if (item.type === 'folder') {
    const folderItem = item.data as ScriptRepository;
    return {
      folder: folderItem,
      isExpanded: props.expandedFolders?.has(item.id) ?? false,
      folderScripts: getFolderScripts(item.id),
      batchMode: props.batchMode,
      selected: props.selectedFolderIds?.has(item.id) ?? false,
      repoType: props.repoType,
    };
  } else {
    return {
      script: item.data as Script,
      repoType: props.repoType,
      batchMode: props.batchMode,
      selected: props.selectedScriptIds?.has(item.id) ?? false,
    };
  }
};

// 动态组件事件
const getComponentEvents = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepository | Script }) => {
  if (item.type === 'folder') {
    return {
      'toggle-expand': (id: string) => emit('toggle-folder-expand', id),
      'toggle-folder-scripts': (id: string) => emit('toggle-folder-scripts', id),
      'edit-folder': (id: string) => emit('edit-folder', id),
      'export-folder': (id: string) => emit('export-folder', id),
      'move-folder': (id: string) => emit('move-folder', id),
      'delete-folder': (id: string) => emit('delete-folder', id),
      'select-folder': (id: string, selected: boolean) => emit('select-folder', id, selected),
    };
  } else {
    return {
      'toggle-script': (id: string) => emit('toggle-script', id),
      'show-info': (id: string) => emit('show-info', id),
      'edit-script': (id: string) => emit('edit-script', id),
      'move-script': (id: string) => emit('move-script', id),
      'move-script-type': (id: string) => emit('move-script-type', id),
      'export-script': (id: string) => emit('export-script', id),
      'delete-script': (id: string) => emit('delete-script', id),
      'select-script': (id: string, selected: boolean) => emit('select-script', id, selected),
    };
  }
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
