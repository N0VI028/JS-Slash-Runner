<template>
  <div class="script-item" :id="script.id" :class="{ 'batch-mode': batchMode, selected }" ref="scriptElement">
    <input
      type="checkbox"
      class="script-checkbox"
      :style="batchMode ? {} : { display: 'none' }"
      :checked="selected"
      @change="$emit('select-script', script.id, ($event.target as HTMLInputElement).checked)"
      @click.stop
    />
    <span class="drag-handle menu-handle" v-show="!batchMode" ref="dragHandle">☰</span>
    <div class="script-item-name flexGrow overflow-hidden marginLeft5">
      {{ script.name }}
    </div>
    <div class="script-item-control flex-container flexnowrap alignItemsCenter" v-show="!batchMode">
      <!-- 脚本开关 -->
      <div class="script-toggle" :class="{ enabled: script.enabled }" @click="$emit('toggle-script', script.id)">
        <i v-if="script.enabled" class="fa-solid fa-toggle-on"></i>
        <i v-else class="fa-solid fa-toggle-off"></i>
      </div>

      <!-- 脚本信息 -->
      <div class="script-info menu_button interactable" @click="$emit('show-info', script.id)" title="查看脚本信息">
        <i class="fa-solid fa-info-circle"></i>
      </div>

      <!-- 编辑脚本 -->
      <div class="edit-script menu_button interactable" @click="$emit('edit-script', script.id)" title="编辑脚本">
        <i class="fa-solid fa-pencil"></i>
      </div>

      <!-- 在全局/角色之间移动脚本 -->
      <div
        class="script-move-type menu_button interactable"
        @click="$emit('move-script-type', script.id)"
        :title="typeMoveTitle"
      >
        <i class="fa-solid" :class="typeMoveIcon"></i>
      </div>

      <!-- 导出脚本 -->
      <div class="export-script menu_button interactable" @click="$emit('export-script', script.id)" title="导出脚本">
        <i class="fa-solid fa-file-export"></i>
      </div>

      <!-- 删除脚本 -->
      <div class="delete-script menu_button interactable" @click="$emit('delete-script', script.id)" title="删除脚本">
        <i class="fa-solid fa-trash"></i>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useJQueryDrag } from '../composables/useJQueryDrag';
import type { Script } from '../schemas/script.schema';

// Props
interface Props {
  script: Script;
  repoType: 'global' | 'character';
  batchMode?: boolean;
  selected?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  batchMode: false,
  selected: false,
});

// Emits
defineEmits<{
  'toggle-script': [id: string];
  'show-info': [id: string];
  'edit-script': [id: string];
  'move-script': [id: string];
  'move-script-type': [id: string];
  'export-script': [id: string];
  'delete-script': [id: string];
  'select-script': [id: string, selected: boolean];
}>();

// 全局/角色移动按钮
const typeMoveIcon = computed(() => {
  return props.repoType === 'global' ? 'fa-arrow-down' : 'fa-arrow-up';
});

const typeMoveTitle = computed(() => {
  return props.repoType === 'global' ? '移动到角色脚本库' : '移动到全局脚本库';
});

// 拖拽功能
const scriptElement = ref<HTMLElement>();
const { useScriptElement } = useJQueryDrag();
useScriptElement(scriptElement, props.script.id);
</script>

<style scoped>
.script-item-control {
  gap: 3px;
}
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

.script-item.batch-mode.selected {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 10%, transparent);
  border-color: var(--SmartThemeQuoteColor);
}

.script-item:has(.script-toggle:not(.enabled)) .script-item-name {
  text-decoration: line-through;
  filter: grayscale(0.5);
}

.script-item .menu_button {
  width: calc(var(--icon-size) * 1.8);
  height: calc(var(--icon-size) * 1.8);
}

.script-item i {
  font-size: calc(var(--icon-size) * 0.95)!important;
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

/* 拖拽状态样式 */
.script-item.dragging-source {
  opacity: 0.6;
}

.script-item.ui-dragging {
  opacity: 0.8;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
