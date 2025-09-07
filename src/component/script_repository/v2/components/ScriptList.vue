<template>
  <div class="script-list-container">
    <!-- 空状态 -->
    <div v-if="allItems.length === 0" class="empty-state">
      <div v-if="isSearching" class="empty-search">
        <i class="fa-solid fa-search"></i>
        <h3>未找到匹配的脚本</h3>
        <p>尝试使用不同的关键词搜索</p>
        <button @click="$emit('clear-search')" class="TavernHelper-button">清除搜索条件</button>
      </div>
      <div v-else class="empty-repository">
        <i class="fa-solid fa-scroll"></i>
        <p>脚本库为空</p>
      </div>
    </div>

    <!-- 脚本和文件夹列表 -->
    <div v-else class="script-list" ref="listContainer">
      <template v-for="item in allItems" :key="`${item.type}-${item.id}`">
        <!-- 文件夹 -->
        <folder-item
          v-if="item.type === 'folder'"
          :folder="item.data as Folder"
          :is-expanded="expandedFolders.has(item.id)"
          :folder-scripts="getFolderScripts(item.id)"
          @toggle-expand="$emit('toggle-folder-expand', $event)"
          @toggle-folder-scripts="$emit('toggle-folder-scripts', $event)"
          @edit-folder="$emit('edit-folder', $event)"
          @export-folder="$emit('export-folder', $event)"
          @move-folder="$emit('move-folder', $event)"
          @delete-folder="$emit('delete-folder', $event)"
        >
          <!-- 文件夹内的脚本 -->
          <script-item
            v-for="script in getFolderScripts(item.id)"
            :key="script.id"
            :script="script"
            @toggle-script="$emit('toggle-script', $event)"
            @show-info="$emit('show-info', $event)"
            @edit-script="$emit('edit-script', $event)"
            @move-script="$emit('move-script', $event)"
            @export-script="$emit('export-script', $event)"
            @delete-script="$emit('delete-script', $event)"
          />
        </folder-item>

        <!-- 根级脚本 -->
        <script-item
          v-else-if="item.type === 'script'"
          :script="item.data as Script"
          @toggle-script="$emit('toggle-script', $event)"
          @show-info="$emit('show-info', $event)"
          @edit-script="$emit('edit-script', $event)"
          @move-script="$emit('move-script', $event)"
          @export-script="$emit('export-script', $event)"
          @delete-script="$emit('delete-script', $event)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';
import FolderItem from './FolderItem.vue';
import ScriptItem from './ScriptItem.vue';

// Props
interface Props {
  scripts: Script[];
  folders?: Folder[];
  expandedFolders?: Set<string>;
  isSearching: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  folders: () => [],
  expandedFolders: () => new Set(),
});

// Emits
defineEmits<{
  'clear-search': [];
  'create-script': [];
  'toggle-script': [id: string];
  'show-info': [id: string];
  'edit-script': [id: string];
  'move-script': [id: string];
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
  padding: 10px;
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
