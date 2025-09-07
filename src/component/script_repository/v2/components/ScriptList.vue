<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <EmptyState
      v-if="allItems.length === 0"
      :is-searching="isSearching"
      @clear-search="$emit('clear-search')"
    />

    <!-- 脚本和文件夹列表 -->
    <div v-else class="script-list" ref="listContainer">
      <component
        v-for="item in allItems"
        :key="`${item.type}-${item.id}`"
        :is="getComponentType(item)"
        v-bind="getComponentProps(item)"
        v-on="getComponentEvents(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';
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
      </div>
    </div>
  `,
};

// Props
interface Props {
  scripts: Script[];
  folders?: Folder[];
  expandedFolders?: Set<string>;
  isSearching: boolean;
  repoType: 'global' | 'character';
}

const props = withDefaults(defineProps<Props>(), {
  folders: () => [],
  expandedFolders: () => new Set(),
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
}>();

// Template refs
const listContainer = ref<HTMLElement>();

// 计算属性：合并文件夹和根级脚本
const allItems = computed(() => {
  const items: Array<{ type: 'folder' | 'script'; id: string; data: Folder | Script }> = [];

  // 添加文件夹
  props.folders.forEach(folder => {
    items.push({ type: 'folder', id: folder.id, data: folder });
  });

  // 添加根级脚本（folderId 为 null 的脚本）
  props.scripts
    .filter(script => !script.folderId)
    .forEach(script => {
      items.push({ type: 'script', id: script.id, data: script });
    });

  return items;
});

// 获取指定文件夹内的脚本
const getFolderScripts = (folderId: string): Script[] => {
  return props.scripts.filter(script => script.folderId === folderId);
};

// 动态组件类型
const getComponentType = (item: { type: 'folder' | 'script'; id: string; data: Folder | Script }) => {
  return item.type === 'folder' ? FolderItem : ScriptItem;
};

// 动态组件属性
const getComponentProps = (item: { type: 'folder' | 'script'; id: string; data: Folder | Script }) => {
  if (item.type === 'folder') {
    const folder = item.data as Folder;
    return {
      folder,
      isExpanded: props.expandedFolders?.has(item.id) ?? false,
      folderScripts: getFolderScripts(item.id),
    };
  } else {
    return {
      script: item.data as Script,
      repoType: props.repoType,
    };
  }
};

// 动态组件事件
const getComponentEvents = (item: { type: 'folder' | 'script'; id: string; data: Folder | Script }) => {
  if (item.type === 'folder') {
    return {
      'toggle-expand': (id: string) => emit('toggle-folder-expand', id),
      'toggle-folder-scripts': (id: string) => emit('toggle-folder-scripts', id),
      'edit-folder': (id: string) => emit('edit-folder', id),
      'export-folder': (id: string) => emit('export-folder', id),
      'move-folder': (id: string) => emit('move-folder', id),
      'delete-folder': (id: string) => emit('delete-folder', id),
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
</style>
