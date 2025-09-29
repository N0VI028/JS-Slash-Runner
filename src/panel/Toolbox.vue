<template>
  <div class="flex flex-col gap-1">
    <Item type="box">
      <template #title>{{ t`提示词查看器` }}</template>
      <template #description>{{ t`查看当前提示词发送情况，窗口开启时会监听新的发送及时更新显示` }}</template>
      <template #content>
        <Button @click="enable_prompt_viewer = true">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Item type="box">
      <template #title>{{ t`变量管理器` }}</template>
      <template #description>{{ t`查看和管理全局、角色、聊天、消息楼层变量` }}</template>
      <template #content>
        <Button @click="enable_variable_manager = true">{{ t`打开` }}</Button>
      </template>
    </Item>
  </div>

  <Teleport defer to="#extensionsMenu">
    <div class="extension_container">
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enable_prompt_viewer = true"
      >
        <div class="fa-solid fa-magnifying-glass extensionsMenuExtensionButton" />
        <span>{{ t`提示词查看器` }}</span>
      </div>
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enable_variable_manager = true"
      >
        <div class="fa-solid fa-square-root-variable extensionsMenuExtensionButton" />
        <span>{{ t`变量管理器` }}</span>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <Dialog
      v-if="enable_prompt_viewer"
      storage-id="prompt-viewer"
      :title="t`提示词查看器`"
      @close="enable_prompt_viewer = false"
    >
      <PromptViewer />
    </Dialog>
    <Dialog
      v-if="enable_variable_manager"
      storage-id="variable-manager"
      :title="t`变量管理器`"
      @close="enable_variable_manager = false"
    >
      <VariableManager />
    </Dialog>
  </Teleport>
</template>

<script setup lang="ts">
import PromptViewer from '@/panel/toolbox/PromptViewer.vue';
import VariableManager from '@/panel/toolbox/VariableManager.vue';

const enable_prompt_viewer = ref<boolean>(false);
const enable_variable_manager = ref<boolean>(false);
</script>
