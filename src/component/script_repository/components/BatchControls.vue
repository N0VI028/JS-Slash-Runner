<template>
  <div class="batch-controls width100p flex-container alignItemsCenter">
    <button
      class="menu_button menu_button_icon interactable redWarningBG batch-action-btn"
      @click="$emit('batch-delete')"
    >
      <i class="fa-solid fa-trash margin-r5"></i>删除
    </button>
    <button class="menu_button menu_button_icon interactable batch-action-btn" @click="$emit('batch-export')">
      <i class="fa-solid fa-file-export margin-r5"></i>导出
    </button>
    <button class="menu_button menu_button_icon interactable batch-action-btn" @click="$emit('batch-move')">
      <i class="fa-solid fa-folder-open margin-r5"></i>移动到文件夹
    </button>
    <button class="menu_button menu_button_icon interactable batch-action-btn" @click="$emit('batch-cancel')">
      <i class="fa-solid fa-times margin-r5"></i>退出
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ScriptType } from '@/component/script_repository/schemas/script.schema';
defineProps<{ repoType: ScriptType }>();
defineEmits(['batch-delete', 'batch-export', 'batch-move', 'batch-cancel']);
</script>

<style scoped>
.batch-controls {
  height: 2em;
}

.batch-action-btn {
  background-color: var(--grey5020a);
  border: 1px solid var(--SmartThemeBorderColor);
  border-radius: 5px;
  padding: 5px;
  cursor: pointer;
  width: auto;
  height: 100%;
}

.batch-action-btn i {
  font-size: calc(var(--mainFontSize) * 0.8);
}
</style>
