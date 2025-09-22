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
  <teleport to="body">
    <Dialog
      v-if="isPromptViewerDialogOpen"
      :title="t`提示词查看器`"
      :storage-id="`prompt-viewer`"
      @close="isPromptViewerDialogOpen = false"
    >
      <template #content>
        <Content />
      </template>
    </Dialog>
    <Dialog
      v-if="isVariableManagerDialogOpen"
      :title="t`变量管理器`"
      :storage-id="`variable-manager`"
      @close="isVariableManagerDialogOpen = false"
    />
  </teleport>
</template>

<script setup lang="ts">
import Content from './toolbox/prompt_viewer/Content.vue';

const isPromptViewerDialogOpen = ref(false);
const isVariableManagerDialogOpen = ref(false);

function openPromptViewer() {
  isPromptViewerDialogOpen.value = true;
}

function openVariableManager() {
  isVariableManagerDialogOpen.value = true;
}
</script>
