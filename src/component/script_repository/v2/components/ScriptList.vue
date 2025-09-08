<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <EmptyState v-if="allItems.length === 0" :is-searching="isSearching" @clear-search="$emit('clear-search')" />

    <!-- 脚本和文件夹列表 -->
    <div v-else class="script-list" ref="listContainer">
      <template v-for="item in allItems" :key="`${item.type}-${item.id}`">
        <component
          :is="getComponentType(item)"
          v-bind="getComponentProps(item)"
          v-on="getComponentEvents(item)"
        >
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
              @toggle-script="(id) => emit('toggle-script', id)"
              @show-info="(id) => emit('show-info', id)"
              @edit-script="(id) => emit('edit-script', id)"
              @move-script="(id) => emit('move-script', id)"
              @move-script-type="(id) => emit('move-script-type', id)"
              @export-script="(id) => emit('export-script', id)"
              @delete-script="(id) => emit('delete-script', id)"
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
import type { Repository, Script, ScriptRepositoryItem } from '../schemas/script.schema';
import { ScriptRepositoryItemSchema, ScriptSchema } from '../schemas/script.schema';
import FolderItem from './FolderItem.vue';
import ScriptItem from './ScriptItem.vue';

// 空状态组件
const EmptyState = {
  props: {
    isSearching: Boolean,
  },
  emits: ['clear-search'],
  template: `
    <div class="empty-state">
      <div v-if="isSearching" class="empty-search">
        <i class="fa-solid fa-search"></i>
        <h3>未找到匹配的脚本</h3>
        <p>尝试使用不同的关键词搜索</p>
        <button @click="$emit('clear-search')" class="TavernHelper-button">清除搜索条件</button>
      </div>
      <div v-else class="empty-repository">
        <i class="fa-solid fa-scroll"></i>
        <h3>暂无脚本</h3>
        <p>点击"创建脚本"按钮开始添加脚本</p>
      </div>
    </div>
  `,
};

// Props
interface Props {
  repository: Repository;
  expandedFolders?: Set<string>;
  isSearching: boolean;
  repoType: 'global' | 'character';
  batchMode?: boolean;
  selectedScriptIds?: Set<string>;
  selectedFolderIds?: Set<string>;
}

const props = withDefaults(defineProps<Props>(), {
  expandedFolders: () => new Set(),
  batchMode: false,
  selectedScriptIds: () => new Set<string>(),
  selectedFolderIds: () => new Set<string>(),
});

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
  const items: Array<{ type: 'folder' | 'script'; id: string; data: ScriptRepositoryItem | Script }> = [];

  for (const item of props.repository) {
    // 使用zod验证数据类型
    const scriptResult = ScriptSchema.safeParse(item);
    if (scriptResult.success) {
      // 直接的脚本对象
      const script = scriptResult.data;
      items.push({ type: 'script', id: script.id, data: script });
      continue;
    }

    const repositoryItemResult = ScriptRepositoryItemSchema.safeParse(item);
    if (repositoryItemResult.success) {
      const repositoryItem = repositoryItemResult.data;
      if (repositoryItem.type === 'folder') {
        items.push({
          type: 'folder',
          id: repositoryItem.id || 'unknown',
          data: repositoryItem,
        });
      } else if (repositoryItem.type === 'script') {
        const script = repositoryItem.value as Script;
        items.push({ type: 'script', id: script.id, data: script });
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
        return Array.isArray(repositoryItem.value) ? repositoryItem.value : [];
      }
    }
  }
  return [];
};

// 动态组件类型
const getComponentType = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepositoryItem | Script }) => {
  return item.type === 'folder' ? FolderItem : ScriptItem;
};

// 动态组件属性
const getComponentProps = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepositoryItem | Script }) => {
  if (item.type === 'folder') {
    const folderItem = item.data as ScriptRepositoryItem;
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
const getComponentEvents = (item: { type: 'folder' | 'script'; id: string; data: ScriptRepositoryItem | Script }) => {
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
}

.empty-search i,
.empty-repository i {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-search h3,
.empty-repository h3 {
  margin-bottom: 0.5rem;
  color: var(--SmartThemeBodyColor);
}

.empty-search p,
.empty-repository p {
  margin-bottom: 1rem;
  opacity: 0.7;
}

.TavernHelper-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 8px 16px;
  background-color: var(--SmartThemeBlurTintColor);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 5px;
  color: var(--SmartThemeBodyColor);
  cursor: pointer;
  transition: background-color 0.2s;
}

.TavernHelper-button:hover {
  background-color: var(--SmartThemeQuoteColor);
}

/* 拖拽状态样式 */
.script-list.root-drag-target {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 5%, transparent);
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
}
</style>
