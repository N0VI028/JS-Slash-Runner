<template>
  <div class="script-folder wide100p" :id="folder.id || ''" :class="{ 'batch-mode': batchMode, selected }" ref="folderElement">
    <div 
      class="folder-header flex justifyContentSpaceBetween flexNoWrap alignItemsCenter paddingLeftRight5 height32px"
      @click="onHeaderClick"
      ref="folderHeader"
    >
      <input
        type="checkbox"
        class="folder-checkbox"
        :style="batchMode ? {} : { display: 'none' }"
        :checked="selected"
        @change="$emit('select-folder', folder.id || '', ($event.target as HTMLInputElement).checked)"
        @click.stop
      />
      <span class="drag-handle menu-handle padding5" v-show="!batchMode" ref="dragHandle">☰</span>
      <i :class="['fa', folderIcon, 'folder-icon', 'marginLeft5']"></i>
      <span class="folder-name flexGrow overflow-hidden marginLeft5">
        {{ folder.name }}
      </span>
      <div class="folder-control flex-container flexnowrap alignItemsCenter" v-show="!batchMode">
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
          class="fa fa-exchange-alt folder-move padding5 margin-r2"
          @click="$emit('move-folder', folder.id || '')"
          title="移动到其他脚本库"
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
    <Transition name="folder-slide">
      <div v-show="isExpanded" class="folder-content padding5">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useJQueryDrag } from '../composables/useJQueryDrag';
import type { Script, ScriptRepositoryItem, ScriptType } from '../schemas/script.schema';

// Props
interface Props {
  folder: ScriptRepositoryItem; // V1文件夹结构
  isExpanded: boolean;
  folderScripts?: Script[]; // 文件夹内的脚本，用于判断是否全部启用
  batchMode?: boolean;
  selected?: boolean;
  repoType: ScriptType; // 添加仓库类型
}

const props = withDefaults(defineProps<Props>(), {
  folderScripts: () => [],
  batchMode: false,
  selected: false,
});

// Emits
const emit = defineEmits<{
  'toggle-expand': [id: string];
  'toggle-folder-scripts': [id: string];
  'edit-folder': [id: string];
  'export-folder': [id: string];
  'move-folder': [id: string];
  'delete-folder': [id: string];
  'select-folder': [id: string, selected: boolean];
}>();

// 计算属性
const folderIcon = computed(() => {
  return props.folder.icon || 'fa-folder';
});

const allScriptsEnabled = computed(() => {
  if (!props.folderScripts.length) return false;
  return props.folderScripts.every(script => script.enabled);
});

// 移动图标现在使用固定的exchange图标，与脚本项保持一致

// 处理文件夹头部点击事件
const onHeaderClick = (event: MouseEvent) => {
  // 如果点击的是控制按钮或复选框，不触发折叠切换
  const target = event.target as HTMLElement;
  if (target.closest('.folder-control') || target.closest('.folder-checkbox') || target.classList.contains('folder-checkbox')) {
    return;
  }
  
  // 触发折叠切换
  emit('toggle-expand', props.folder.id || '');
};

// 拖拽功能
const folderElement = ref<HTMLElement>();
const folderHeader = ref<HTMLElement>();
const { useFolderElement, useFolderDrop, useFolderSortable } = useJQueryDrag();

useFolderElement(folderElement, props.folder.id || '');
useFolderDrop(folderHeader, props.folder.id || '', props.repoType);
useFolderSortable(folderElement, props.repoType);
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

.script-folder.batch-mode.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent);
  border-color: var(--SmartThemeQuoteColor);
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

/* 文件夹头部交互 */
.folder-header {
  cursor: pointer;
  transition: background-color 0.2s;
}

.folder-slide-enter-from {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.folder-slide-leave-to {
  max-height: 0;
  opacity: 0;
  transform: translateY(-10px);
}

.folder-slide-enter-to,
.folder-slide-leave-from {
  max-height: 1000px; /* 足够大的值 */
  opacity: 1;
  transform: translateY(0);
}

/* 拖拽状态样式 */
.script-folder.dragging-source {
  opacity: 0.6;
}

.script-folder.ui-dragging {
  opacity: 0.8;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.script-folder.folder-drag-target .folder-header {
  border-color: var(--SmartThemeQuoteColor);
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 15%, transparent);
}
</style>
