<template>
  <div class="list-group-item flex-container flexGap5 interactable">
    <div class="fa-solid fa-magnifying-glass extensionsMenuExtensionButton" />
    <span @click="handleClick">提示词查看器</span>
  </div>
</template>

<script setup lang="ts">
import { openDialogOnceById } from '@/composables/useFloatingDialog';
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';

const PROMPT_VIEWER_ID = 'prompt-viewer';
const PROMPT_VIEWER_TITLE = '提示词查看器';

function handleClick(): void {
  openDialogOnceById(PROMPT_VIEWER_ID, PROMPT_VIEWER_TITLE, Content);
}
</script>
