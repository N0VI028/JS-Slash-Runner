<template>
  <div class="script-folder wide100p" :id="folder.id || ''">
    <div class="folder-header flex justifyContentSpaceBetween flexNoWrap alignItemsCenter paddingLeftRight5 height32px">
      <input type="checkbox" class="folder-checkbox" style="display: none" />
      <span class="drag-handle menu-handle padding5">☰</span>
      <i :class="['fa', folderIcon, 'folder-icon', 'marginLeft5']"></i>
      <span class="folder-name flexGrow overflow-hidden marginLeft5">
        {{ folder.name }}
      </span>
      <div class="folder-control flex-container flexnowrap alignItemsCenter">
        <!-- 批量开关文件夹内脚本 -->
        <div
          class="folder-script-toggle padding5"
          :class="{ enabled: allScriptsEnabled }"
          @click="$emit('toggle-folder-scripts', folder.id || '')"
          title="批量开关文件夹内脚本"
        >
          <i v-if="allScriptsEnabled" class="fa-solid fa-toggle-on"></i>
          <i v-else class="fa-solid fa-toggle-off"></i>
        </div>

        <!-- 编辑文件夹 -->
        <i
          class="fa fa-pencil folder-edit padding5 margin-r2"
          @click="$emit('edit-folder', folder.id || '')"
          title="编辑文件夹"
        ></i>

        <!-- 导出文件夹 -->
        <i
          class="fa fa-file-export folder-export padding5 margin-r2"
          @click="$emit('export-folder', folder.id || '')"
          title="导出文件夹"
        ></i>

        <!-- 移动文件夹 -->
        <i
          :class="['fa', moveIcon, 'folder-move', 'padding5', 'margin-r2']"
          @click="$emit('move-folder', folder.id || '')"
          :title="moveTitle"
        ></i>

        <!-- 删除文件夹 -->
        <i
          class="fa fa-trash folder-delete padding5 margin-r2"
          @click="$emit('delete-folder', folder.id || '')"
          title="删除文件夹"
        ></i>

        <!-- 展开/折叠 -->
        <i
          :class="['fa', isExpanded ? 'fa-chevron-up' : 'fa-chevron-down', 'folder-toggle', 'padding5', 'margin-r2']"
          @click="$emit('toggle-expand', folder.id || '')"
        ></i>
      </div>
    </div>

    <!-- 文件夹内容 -->
    <div class="folder-content padding5" :style="{ display: isExpanded ? 'block' : 'none' }">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Script, ScriptRepositoryItem } from '../schemas/script.schema';

// Props
interface Props {
  folder: ScriptRepositoryItem; // V1文件夹结构
  isExpanded: boolean;
  folderScripts?: Script[]; // 文件夹内的脚本，用于判断是否全部启用
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
  // V1结构中没有parentId概念，所有文件夹都在根级别
  return 'fa-folder';
});

const moveTitle = computed(() => {
  return '移动文件夹';
});
</script>

<style scoped>
.folder-control {
  gap: 3px; /* 保留现有样式，gap3px 类可能不够精确 */
}
.script-folder {
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  background-color: var(--grey5020a);
}

.script-folder:has(.folder-script-toggle:not(.enabled)) .folder-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.folder-content {
  border-top: 1px solid var(--SmartThemeBorderColor);
}

.folder-content :deep(.script-item) {
  background-color: var(--SmartThemeBlurTintColor);
}

.folder-content :deep(.script-item:last-child) {
  margin-bottom: 0;
}

.folder-script-toggle {
  cursor: pointer;
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
  user-select: none;
}

.drag-handle:active {
  cursor: grabbing;
}

.folder-icon {
  color: var(--SmartThemeBodyColor);
}
</style>
