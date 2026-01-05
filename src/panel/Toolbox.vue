<template>
  <div class="flex flex-col gap-0.75">
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

    <Item type="box">
      <template #title>{{ t`日志查看器` }}</template>
      <template #description>{{ t`查看脚本和渲染界面的控制台日志` }}</template>
      <template #content>
        <Button @click="enable_logger = true">{{ t`打开` }}</Button>
      </template>
    </Item>

    <AudioPlayer />
  </div>

  <Teleport defer to="#extensionsMenu">
    <div class="extension_container">
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enable_prompt_viewer = true"
      >
        <div class="fa-fw fa-solid fa-magnifying-glass extensionsMenuExtensionButton" />
        <span>{{ t`提示词查看器` }}</span>
      </div>
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enable_variable_manager = true"
      >
        <div class="fa-fw fa-solid fa-square-root-variable extensionsMenuExtensionButton" />
        <span>{{ t`变量管理器` }}</span>
      </div>
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enable_logger = true"
      >
        <div class="fa-fw fa-solid fa-file-invoice extensionsMenuExtensionButton" />
        <span>{{ t`日志查看器` }}</span>
      </div>
    </div>
  </Teleport>

  <Dialog
    v-if="enable_prompt_viewer"
    storage-id="prompt-viewer"
    :title="t`提示词查看器`"
    :show-guide="true"
    @close="enable_prompt_viewer = false"
    @open-guide-popup="showPromptViewerHelp"
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
  <Dialog v-if="enable_logger" storage-id="logger" :title="t`日志查看器`" @close="enable_logger = false">
    <Logger />
  </Dialog>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import AudioPlayer from '@/panel/toolbox/AudioPlayer.vue';
import Logger from '@/panel/toolbox/Logger.vue';
import help_en from '@/panel/toolbox/prompt_viewer/help_en.md?raw';
import help_zh from '@/panel/toolbox/prompt_viewer/help_zh.md?raw';
import PromptViewer from '@/panel/toolbox/PromptViewer.vue';
import VariableManager from '@/panel/toolbox/VariableManager.vue';
import { renderMarkdown } from '@/util/tavern';
import { getCurrentLocale } from '@sillytavern/scripts/i18n';

const enable_prompt_viewer = ref<boolean>(false);
const enable_variable_manager = ref<boolean>(false);
const enable_logger = ref<boolean>(false);

/**
 * 显示提示词查看器帮助信息
 */
const { open: showPromptViewerHelp } = useModal({
  component: Popup,
  attrs: {
    width: 'wide',
  },
  slots: {
    default: `<div class="text-left p-1.5">${renderMarkdown(getCurrentLocale().includes('zh') ? help_zh : help_en)}</div>`,
  },
});
</script>
