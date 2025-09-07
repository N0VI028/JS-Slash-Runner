<template>
  <div class="script-folder" :id="folder.id">
    <div class="folder-header">
      <input type="checkbox" class="folder-checkbox" style="display: none" />
      <span class="drag-handle menu-handle">☰</span>
      <i :class="['fa', folderIcon, 'folder-icon', 'marginLeft5']"></i>
      <span class="folder-name flexGrow overflow-hidden marginLeft5">
        {{ folder.name }}
      </span>
      <div class="folder-control flex-container flexnowrap alignItemsCenter">
        <!-- 批量开关文件夹内脚本 -->
        <div 
          class="folder-script-toggle" 
          :class="{ enabled: allScriptsEnabled }"
          @click="$emit('toggle-folder-scripts', folder.id)"
          title="批量开关文件夹内脚本"
        >
          <i v-if="allScriptsEnabled" class="fa-solid fa-toggle-on"></i>
          <i v-else class="fa-solid fa-toggle-off"></i>
        </div>
        
        <!-- 编辑文件夹 -->
        <i 
          class="fa fa-pencil folder-edit" 
          @click="$emit('edit-folder', folder.id)"
          title="编辑文件夹"
        ></i>
        
        <!-- 导出文件夹 -->
        <i 
          class="fa fa-file-export folder-export" 
          @click="$emit('export-folder', folder.id)"
          title="导出文件夹"
        ></i>
        
        <!-- 移动文件夹 -->
        <i 
          :class="['fa', moveIcon, 'folder-move']"
          @click="$emit('move-folder', folder.id)"
          :title="moveTitle"
        ></i>
        
        <!-- 删除文件夹 -->
        <i 
          class="fa fa-trash folder-delete" 
          @click="$emit('delete-folder', folder.id)"
          title="删除文件夹"
        ></i>
        
        <!-- 展开/折叠 -->
        <i 
          :class="['fa', isExpanded ? 'fa-chevron-up' : 'fa-chevron-down', 'folder-toggle']"
          @click="$emit('toggle-expand', folder.id)"
        ></i>
      </div>
    </div>
    
    <!-- 文件夹内容 -->
    <div 
      class="folder-content" 
      :style="{ display: isExpanded ? 'block' : 'none' }"
    >
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Folder } from '../schemas/script.schema';

// Props
interface Props {
  folder: Folder;
  isExpanded: boolean;
  folderScripts?: any[]; // 文件夹内的脚本，用于判断是否全部启用
}

const props = withDefaults(defineProps<Props>(), {
  folderScripts: () => [],
});

// Emits
defineEmits<{
  'toggle-expand': [id: string];
  'toggle-folder-scripts': [id: string];
  'edit-folder': [id: string];
  'export-folder': [id: string];
  'move-folder': [id: string];
  'delete-folder': [id: string];
}>();

// 计算属性
const folderIcon = computed(() => {
  return props.folder.icon || 'fa-folder';
});

const allScriptsEnabled = computed(() => {
  if (!props.folderScripts.length) return false;
  return props.folderScripts.every(script => script.enabled);
});

const moveIcon = computed(() => {
  return props.folder.parentId ? 'fa-folder-open' : 'fa-folder';
});

const moveTitle = computed(() => {
  return props.folder.parentId ? '移动到根目录' : '移动到文件夹';
});
</script>

<style scoped>
/* 使用V1的样式 */
.script-folder {
  width: 100%;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  background-color: var(--grey5020a);
}

.folder-header {
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: center;
  padding: 0 5px;
  min-height: 35px;
}

.script-folder:has(.folder-script-toggle:not(.enabled)) .folder-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.folder-content {
  padding: 5px;
  border-top: 1px solid var(--SmartThemeBorderColor);
}

.folder-content :deep(.script-item) {
  background-color: var(--SmartThemeBlurTintColor);
  margin-bottom: 5px;
}

.folder-content :deep(.script-item:last-child) {
  margin-bottom: 0;
}

.folder-script-toggle {
  cursor: pointer;
  padding: 5px;
}

.folder-script-toggle:hover {
  background-color: var(--SmartThemeBlurTintColor);
  border-radius: 5px;
}

.folder-edit,
.folder-export,
.folder-move,
.folder-delete,
.folder-toggle {
  cursor: pointer;
  padding: 5px;
  margin: 0 2px;
  border-radius: 5px;
}

.folder-edit:hover,
.folder-export:hover,
.folder-move:hover,
.folder-delete:hover,
.folder-toggle:hover {
  background-color: var(--SmartThemeBlurTintColor);
}

.drag-handle {
  cursor: grab;
  padding: 5px;
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.folder-icon {
  color: var(--SmartThemeBodyColor);
}

.flexGrow {
  flex-grow: 1;
}

.overflow-hidden {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.marginLeft5 {
  margin-left: 5px;
}

.flex-container {
  display: flex;
}

.flexnowrap {
  flex-wrap: nowrap;
}

.alignItemsCenter {
  align-items: center;
}
</style>
