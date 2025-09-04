<template>
  <div class="folder-tree-node" :style="{ paddingLeft: `${level * 16}px` }">
    <!-- 文件夹头部 -->
    <div
      class="folder-header"
      @click="toggleExpanded"
      @contextmenu.prevent="$emit('folder-menu', { folder, event: $event })"
    >
      <div class="folder-info">
        <button class="expand-btn" :class="{ expanded: isExpanded }">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <i
          :class="['fa-solid', isExpanded ? 'fa-folder-open' : 'fa-folder', 'folder-icon']"
          :style="{ color: folder.color || '#ffd700' }"
        ></i>
        <span class="folder-name">{{ getFolderDisplayName(folder) }}</span>
        <span class="folder-count">({{ totalItemCount }})</span>
      </div>

      <div class="folder-actions">
        <button @click.stop="$emit('folder-menu', { folder, event: $event })" class="action-btn" title="文件夹操作">
          <i class="fa-solid fa-ellipsis-v"></i>
        </button>
      </div>
    </div>

    <!-- 文件夹内容 -->
    <div v-if="isExpanded" class="folder-content">
      <!-- 子文件夹 -->
      <folder-tree-node
        v-for="childFolder in childFolders"
        :key="childFolder.id"
        :folder="childFolder"
        :scripts="getChildScripts(childFolder.id)"
        :all-folders="allFolders"
        :expanded-folders="expandedFolders"
        :selected-script-id="selectedScriptId"
        :level="level + 1"
        @expand-folder="$emit('expand-folder', $event)"
        @select-script="$emit('select-script', $event)"
        @toggle-script="$emit('toggle-script', $event)"
        @folder-menu="$emit('folder-menu', $event)"
        @script-menu="$emit('script-menu', $event)"
      />

      <!-- 脚本列表 -->
      <div
        v-for="script in scripts"
        :key="script.id"
        :class="['script-node', { selected: selectedScriptId === script.id }]"
        @click="$emit('select-script', script.id)"
        @contextmenu.prevent="$emit('script-menu', { script, event: $event })"
      >
        <div class="script-info">
          <div class="script-indent"></div>
          <i
            :class="['fa-solid', script.enabled ? 'fa-play-circle script-enabled' : 'fa-pause-circle script-disabled']"
          ></i>
          <span class="script-name">{{ getScriptDisplayName(script) }}</span>
          <span v-if="script.buttons.length > 0" class="script-buttons">
            <i class="fa-solid fa-mouse-pointer"></i>
            {{ script.buttons.length }}
          </span>
        </div>

        <div class="script-actions">
          <button
            @click.stop="$emit('toggle-script', script.id)"
            :class="['toggle-btn', { enabled: script.enabled }]"
            :title="script.enabled ? '禁用' : '启用'"
          >
            <i :class="script.enabled ? 'fa-solid fa-toggle-on' : 'fa-solid fa-toggle-off'"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';

// Props
interface Props {
  folder: Folder;
  scripts: Script[];
  allFolders?: Folder[];
  expandedFolders: Set<string>;
  selectedScriptId: string | null;
  level: number;
}

const props = withDefaults(defineProps<Props>(), {
  allFolders: () => [],
});

// Emits
interface Emits {
  'expand-folder': [folderId: string];
  'select-script': [scriptId: string];
  'toggle-script': [scriptId: string];
  'folder-menu': [data: { folder: Folder; event: Event }];
  'script-menu': [data: { script: Script; event: Event }];
}

const emit = defineEmits<Emits>();

// Computed
/**
 * 是否展开
 */
const isExpanded = computed(() => props.expandedFolders.has(props.folder.id));

/**
 * 子文件夹
 */
const childFolders = computed(() => {
  return props.allFolders.filter(f => f.parentId === props.folder.id);
});

/**
 * 总项目数量（脚本 + 子文件夹）
 */
const totalItemCount = computed(() => {
  return props.scripts.length + childFolders.value.length;
});

// Methods
/**
 * 切换展开状态
 */
const toggleExpanded = () => {
  emit('expand-folder', props.folder.id);
};

/**
 * 获取文件夹显示名称
 */
const getFolderDisplayName = (folder: Folder): string => {
  return folder.name.trim() || '未命名文件夹';
};

/**
 * 获取脚本显示名称
 */
const getScriptDisplayName = (script: Script): string => {
  return script.name.trim() || '未命名脚本';
};

/**
 * 获取子文件夹的脚本
 */
const getChildScripts = (_folderId: string): Script[] => {
  // 这里需要从父组件传入获取脚本的方法
  // 为简化，暂时返回空数组，实际使用时需要注入获取方法
  return [];
};
</script>

<style scoped>
.folder-tree-node {
  display: flex;
  flex-direction: column;
}

.folder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s ease;
  min-height: 32px;
}

.folder-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.folder-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #888;
  transition: all 0.2s ease;
  font-size: 12px;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.expand-btn:hover {
  color: var(--SmartThemeEmColor);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.folder-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.folder-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--SmartThemeEmColor);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-count {
  font-size: 11px;
  color: #888;
  flex-shrink: 0;
}

.folder-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.folder-header:hover .folder-actions {
  opacity: 1;
}

.action-btn {
  background: none;
  border: 1px solid transparent;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 3px;
  color: #888;
  font-size: 10px;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--SmartThemeBorderColor);
  color: var(--SmartThemeEmColor);
}

.folder-content {
  display: flex;
  flex-direction: column;
  margin-left: 12px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding-left: 4px;
}

.script-node {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 8px;
  margin: 1px 0;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.2s ease;
  min-height: 28px;
}

.script-node:hover {
  background: rgba(255, 255, 255, 0.05);
}

.script-node.selected {
  background: var(--SmartThemeQuoteColor);
  border-left: 2px solid var(--SmartThemeEmColor);
}

.script-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.script-indent {
  width: 12px;
  flex-shrink: 0;
}

.script-enabled {
  color: #4caf50;
}

.script-disabled {
  color: #888;
}

.script-name {
  font-size: 12px;
  color: var(--SmartThemeBodyColor);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.script-buttons {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 10px;
  color: #666;
  flex-shrink: 0;
}

.script-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.script-node:hover .script-actions {
  opacity: 1;
}

.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  color: #888;
  transition: all 0.2s ease;
  font-size: 10px;
}

.toggle-btn:hover {
  background: rgba(255, 255, 255, 0.1);
}

.toggle-btn.enabled {
  color: #4caf50;
}

/* 层级缩进 */
.folder-tree-node[style*='padding-left'] .folder-header {
  position: relative;
}

.folder-tree-node[style*='padding-left'] .folder-header::before {
  content: '';
  position: absolute;
  left: -1px;
  top: 50%;
  width: 8px;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}
</style>
