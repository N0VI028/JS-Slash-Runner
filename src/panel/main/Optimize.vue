<template>
  <div class="flex flex-col">
    <Item type="plain">
      <template #title>
        {{ t`禁用不兼容选项` }}
        <i class="fa-solid fa-circle-question note-link-span" @click.stop="showDisableIncompatibleHelp" />
      </template>
      <template #content>
        <Toggle id="TH-optimize-disable-incompatible-option" v-model="disable_incompatible_option" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>
        {{ t`角色卡更新优化` }}
        <i class="fa-solid fa-circle-question note-link-span" @click.stop="showCharacterUpdateHelp" />
      </template>
      <template #content>
        <Toggle id="TH-optimize-character-update-worldbook-sync" v-model="character_update_worldbook_sync" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>
        {{ t`角色卡导出优化` }}
        <i class="fa-solid fa-circle-question note-link-span" @click.stop="showCharacterExportHelp" />
      </template>
      <template #content>
        <Toggle id="TH-optimize-character-export-save-worldbook" v-model="character_export_save_worldbook" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>
        {{ t`楼层显示优化` }}
        <i class="fa-solid fa-circle-question note-link-span" @click.stop="showBetterChatTruncationHelp" />
      </template>
      <template #content>
        <Toggle id="TH-optimize-better-chat-truncation" v-model="better_chat_truncation" />
      </template>
    </Item>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import { useBetterChatTruncation } from '@/panel/render/use_better_chat_truncation';
import { useGlobalSettingsStore } from '@/store/settings';

const {
  disable_incompatible_option,
  character_update_worldbook_sync,
  character_export_save_worldbook,
  better_chat_truncation,
} = toRefs(useGlobalSettingsStore().settings.optimize);

useBetterChatTruncation(better_chat_truncation);

/**
 * 创建帮助弹窗 优化项帮助说明
 */
function createHelpModal(content: string) {
  return useModal({
    component: Popup,
    attrs: { buttons: [{ name: t`关闭` }] },
    slots: { default: `<div class="p-1 text-left">${content}</div>` },
  });
}

const { open: showDisableIncompatibleHelp } = createHelpModal(
  t`启动时自动禁用与游玩可能不兼容的酒馆设置:<br>• 自动修复生成的 Markdown → 关<br>• 修剪不完整的句子 → 关<br>• 禁止外部媒体 → 关<br>• 在响应中显示标签 → 关<br>• 在机器人消息中允许{{char}} → 开<br>• 在机器人消息中允许{{user}} → 开`,
);
const { open: showCharacterUpdateHelp } = createHelpModal(
  t`开启选项后，在替换/更新角色卡时，若该角色已绑定世界书，新角色卡中内嵌的世界书数据将同步更新到已绑定的世界书中。<br>（原生酒馆只会更新角色卡, 不会更新世界书）`,
);
const { open: showCharacterExportHelp } = createHelpModal(
  t`开启选项后，导出角色卡时，必然会导出最新世界书。<br>（原生酒馆导出角色卡时，可能导出陈旧世界书)`,
);
const { open: showBetterChatTruncationHelp } = createHelpModal(
  t`• 解除酒馆的【要加载 # 条消息】的倍数限制, 现在可以设置为任意非负数<br>• 当发送新消息或收到新回复时, 旧楼层将会被自动取消渲染，当删除楼层时, 旧楼层将自动补全出来，确保始终只显示设置的消息数量<br>`,
);
</script>
