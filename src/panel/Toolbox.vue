<template>
  <div class="flex flex-col gap-1">
    <Item type="box">
      <template #title>{{ t`提示词查看器` }}</template>
      <template #description>{{ t`查看当前提示词发送情况，窗口开启时会监听新的发送及时更新显示` }}</template>
      <template #content>
        <Button :on-click="openPromptViewer">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Item type="box">
      <template #title>{{ t`变量管理器` }}</template>
      <template #description>{{ t`查看和管理全局、角色、聊天、消息楼层变量` }}</template>
      <template #content>
        <Button :on-click="openVariableManager">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Dialog
      v-if="showPromptViewer"
      id="prompt-viewer"
      :title="t`提示词查看器`"
      :collapsible="true"
      :draggable="true"
      :resizable="true"
      :width="isMobileDevice ? '95vw' : '80vw'"
      :height="isMobileDevice ? '70vh' : '70vh'"
      :min-width="isMobileDevice ? '90vw' : 400"
      :min-height="isMobileDevice ? '50vh' : 300"
      @close="showPromptViewer = false"
    >
      <!-- 保留空内容：后续再填充 -->
    </Dialog>

    <Dialog
      v-if="showVariableManager"
      id="variable-manager"
      :title="t`变量管理器`"
      :collapsible="true"
      :draggable="true"
      :resizable="true"
      :width="isMobileDevice ? '95vw' : '70vw'"
      :height="isMobileDevice ? '70vh' : '60vh'"
      :min-width="isMobileDevice ? '90vw' : 400"
      :min-height="isMobileDevice ? '50vh' : 300"
      @close="showVariableManager = false"
    >
      <!-- 保留空内容：后续再填充 -->
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import Dialog from '@/panel/component/Dialog.vue';
import Item from '@/panel/component/Item.vue';
import { isMobile } from '@sillytavern/scripts/RossAscends-mods';

const isMobileDevice = isMobile();

const showPromptViewer = ref(false);
const showVariableManager = ref(false);

function focusOrShow(id: string, setter: (v: boolean) => void) {
  const existing = document.querySelector<HTMLElement>(`.TH-floating-dialog[data-dialog-id="${id}"]`);
  if (existing) {
    const dialogs = Array.from(document.querySelectorAll<HTMLElement>('.TH-floating-dialog'));
    const maxZ = dialogs.reduce((max, d) => {
      const z = parseInt(getComputedStyle(d).zIndex || '4000', 10);
      return Math.max(max, isNaN(z) ? 4000 : z);
    }, 4000);
    existing.style.zIndex = String(maxZ + 1);
    return;
  }
  setter(true);
}

function openPromptViewer() {
  focusOrShow('prompt-viewer', v => (showPromptViewer.value = v));
}

function openVariableManager() {
  focusOrShow('variable-manager', v => (showVariableManager.value = v));
}
</script>
