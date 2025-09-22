<template>
  <div class="flex flex-col gap-1">
    <Item type="box">
      <template #title>{{ t`提示词查看器` }}</template>
      <template #description>{{ t`查看当前提示词发送情况，窗口开启时会监听新的发送及时更新显示` }}</template>
      <template #content>
        <Button class="cursor-pointer" :on-click="openPromptViewer">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Item type="box">
      <template #title>{{ t`变量管理器` }}</template>
      <template #description>{{ t`查看和管理全局、角色、聊天、消息楼层变量` }}</template>
      <template #content>
        <Button class="cursor-pointer" :on-click="openVariableManager">{{ t`打开` }}</Button>
      </template>
    </Item>
  </div>

  <Teleport to="#extensionsMenu">
    <div class="extension_container">
      <div class="list-group-item flex-container flexGap5 interactable" tabindex="0" role="listitem">
        <div class="fa-solid fa-magnifying-glass extensionsMenuExtensionButton" />
        <span @click="openPromptViewer">提示词查看器</span>
      </div>
      <div class="list-group-item flex-container flexGap5 interactable" tabindex="0" role="listitem">
        <div class="fa-solid fa-square-root-variable extensionsMenuExtensionButton" />
        <span @click="openVariableManager">变量管理器</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { openDialogOnceById } from '@/panel/composables/useFloatingDialog';
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';

function openPromptViewer(): void {
  openDialogOnceById('prompt-viewer', t`提示词查看器`, Content);
}

function openVariableManager(): void {
  // 预留：变量管理器浮窗接入点
}
</script>
