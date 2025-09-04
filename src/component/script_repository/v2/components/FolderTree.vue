<template>
  <div class="folder-tree-container">
    <!-- 根目录脚本 -->
    <div v-if="rootScripts.length > 0" class="root-scripts">
      <div class="tree-node root-node">
        <div class="node-header">
          <div class="node-info">
            <i class="fa-solid fa-home node-icon"></i>
            <span class="node-name">根目录</span>
            <span class="node-count">({{ rootScripts.length }})</span>
          </div>
          <button @click="toggleRootExpanded" class="expand-btn" :class="{ expanded: rootExpanded }">
            <i class="fa-solid fa-chevron-right"></i>
          </button>
        </div>

        <div v-if="rootExpanded" class="node-children">
          <div
            v-for="script in rootScripts"
            :key="script.id"
            :class="['script-node', { selected: selectedScriptId === script.id }]"
            @click="$emit('select-script', script.id)"
          >
            <div class="script-info">
              <i
                :class="[
                  'fa-solid',
                  script.enabled ? 'fa-play-circle script-enabled' : 'fa-pause-circle script-disabled',
                ]"
              ></i>
              <span class="script-name">{{ getScriptDisplayName(script) }}</span>
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
    </div>

    <!-- 文件夹树 -->
    <div v-if="folderTree.length > 0" class="folder-tree">
      <folder-tree-node
        v-for="folder in folderTree"
        :key="folder.id"
        :folder="folder"
        :scripts="getScriptsInFolder(folder.id)"
        :expanded-folders="expandedFolders"
        :selected-script-id="selectedScriptId"
        :level="0"
        @expand-folder="$emit('expand-folder', $event)"
        @select-script="$emit('select-script', $event)"
        @toggle-script="$emit('toggle-script', $event)"
        @folder-menu="$emit('folder-menu', $event.folder, $event.event)"
        @script-menu="$emit('script-menu', $event.script, $event.event)"
      />
    </div>

    <!-- 空状态 -->
    <div v-if="folderTree.length === 0 && rootScripts.length === 0" class="empty-tree">
      <i class="fa-solid fa-folder-open"></i>
      <span>暂无文件夹</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Folder, Script } from '../schemas/script.schema';
import FolderTreeNode from './FolderTreeNode.vue';

// Props
interface Props {
  folderTree: Folder[];
  rootScripts: Script[];
  expandedFolders: Set<string>;
  selectedScriptId: string | null;
  getScriptsInFolder: (folderId: string) => Script[];
}

defineProps<Props>();

// Emits
interface Emits {
  'expand-folder': [folderId: string];
  'select-script': [scriptId: string];
  'toggle-script': [scriptId: string];
  'folder-menu': [folder: Folder, event: Event];
  'script-menu': [script: Script, event: Event];
}

defineEmits<Emits>();

// Local state
const rootExpanded = ref(true);

// Methods
/**
 * 切换根目录展开状态
 */
const toggleRootExpanded = () => {
  rootExpanded.value = !rootExpanded.value;
};

/**
 * 获取脚本显示名称
 */
const getScriptDisplayName = (script: Script): string => {
  return script.name.trim() || '未命名脚本';
};
</script>

<style scoped>
.folder-tree-container {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 0;
}

.root-scripts {
  margin-bottom: 8px;
}

.tree-node {
  display: flex;
  flex-direction: column;
}

.root-node {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  padding: 4px;
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 8px;
  cursor: pointer;
  border-radius: 3px;
  transition: background 0.2s ease;
}

.node-header:hover {
  background: rgba(255, 255, 255, 0.05);
}

.node-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
}

.node-icon {
  color: var(--SmartThemeEmColor);
  font-size: 14px;
}

.node-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--SmartThemeEmColor);
}

.node-count {
  font-size: 11px;
  color: #888;
}

.expand-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px;
  color: #888;
  transition: all 0.2s ease;
  font-size: 12px;
}

.expand-btn:hover {
  color: var(--SmartThemeEmColor);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.node-children {
  margin-left: 16px;
  padding-top: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
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
}

.script-node:hover {
  background: rgba(255, 255, 255, 0.05);
}

.script-node.selected {
  background: rgba(var(--SmartThemeQuoteColor), 0.3);
  border-left: 2px solid var(--SmartThemeEmColor);
}

.script-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
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
}

.script-actions {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
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

.folder-tree {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.empty-tree {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #888;
  font-size: 13px;
}

.empty-tree i {
  font-size: 24px;
  margin-bottom: 8px;
  opacity: 0.5;
}
</style>
