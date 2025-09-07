<template>
  <div class="script-item" :id="script.id">
    <input type="checkbox" class="script-checkbox" style="display: none" />
    <span class="drag-handle menu-handle">☰</span>
    <div class="script-item-name flexGrow overflow-hidden marginLeft5">
      {{ script.name }}
    </div>
    <div class="script-item-control flex-container flexnowrap alignItemsCenter">
      <!-- 脚本开关 -->
      <div 
        class="script-toggle" 
        :class="{ enabled: script.enabled }"
        @click="$emit('toggle-script', script.id)"
      >
        <i v-if="script.enabled" class="fa-solid fa-toggle-on"></i>
        <i v-else class="fa-solid fa-toggle-off"></i>
      </div>
      
      <!-- 脚本信息 -->
      <div 
        class="script-info menu_button interactable"
        @click="$emit('show-info', script.id)"
        title="查看脚本信息"
      >
        <i class="fa-solid fa-info-circle"></i>
      </div>
      
      <!-- 编辑脚本 -->
      <div 
        class="edit-script menu_button interactable"
        @click="$emit('edit-script', script.id)"
        title="编辑脚本"
      >
        <i class="fa-solid fa-pencil"></i>
      </div>
      
      <!-- 移动脚本 -->
      <div 
        class="script-storage-location menu_button interactable"
        @click="$emit('move-script', script.id)"
        :title="moveTitle"
      >
        <i class="fa-solid" :class="moveIcon"></i>
      </div>
      
      <!-- 导出脚本 -->
      <div 
        class="export-script menu_button interactable"
        @click="$emit('export-script', script.id)"
        title="导出脚本"
      >
        <i class="fa-solid fa-file-export"></i>
      </div>
      
      <!-- 删除脚本 -->
      <div 
        class="delete-script menu_button interactable"
        @click="$emit('delete-script', script.id)"
        title="删除脚本"
      >
        <i class="fa-solid fa-trash"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Script } from '../schemas/script.schema';

// Props
interface Props {
  script: Script;
}

const props = defineProps<Props>();

// Emits
defineEmits<{
  'toggle-script': [id: string];
  'show-info': [id: string];
  'edit-script': [id: string];
  'move-script': [id: string];
  'export-script': [id: string];
  'delete-script': [id: string];
}>();

// 计算移动按钮的图标和标题
const moveIcon = computed(() => {
  return props.script.folderId ? 'fa-folder-open' : 'fa-folder';
});

const moveTitle = computed(() => {
  return props.script.folderId ? '移动到根目录' : '移动到文件夹';
});
</script>

<style scoped>
/* 使用V1的样式 */
.script-item {
  width: 100%;
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 10px;
  min-height: 35px;
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  align-items: center;
  padding: 0 5px;
}

.script-item:has(.script-toggle:not(.enabled)) .script-item-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.script-toggle {
  cursor: pointer;
  padding: 5px;
}

.script-toggle:hover {
  background-color: var(--SmartThemeBlurTintColor);
  border-radius: 5px;
}

.menu_button {
  cursor: pointer;
  padding: 5px;
  margin: 0 2px;
  border-radius: 5px;
}

.menu_button:hover {
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
