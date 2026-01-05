<template>
  <Item type="plain">
    <template #title>{{ t`启用渲染器` }}</template>
    <template #description>{{ t`启用后，符合条件的代码块将被渲染` }}</template>
    <template #content>
      <Toggle id="TH-render-enabled" v-model="enabled" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`启用代码折叠` }}</template>
    <template #description>
      {{ t`折叠指定类型的代码块，当选择“仅前端”时，将只折叠可渲染成前端界面但没被渲染的代码块` }}
    </template>
    <template #content>
      <RadioButtonGroup v-model="collapse_code_block" :options="collapse_code_block_options" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`启用 Blob URL 渲染` }}</template>
    <template #description>
      {{ t`使用 Blob URL 渲染前端界面，更方便 f12 开发者工具调试，若界面出现渲染问题请尝试关闭此选项` }}
    </template>
    <template #content>
      <Toggle id="TH-render-use-blob-url" v-model="use_blob_url" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`渲染深度` }}</template>
    <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为 0 时，将渲染所有楼层` }}</template>
    <template #content>
      <input v-model="depth" class="text_pole w-3.5!" type="number" :min="0" />
    </template>
  </Item>

  <template v-for="{ message_id, reload_memo, elements } in runtimes" :key="message_id + reload_memo">
    <Teleport v-for="(element, index) in elements" :key="index" defer :to="element">
      <Iframe :id="`${message_id}--${index}`" :element="element" :use-blob-url="use_blob_url" />
    </Teleport>
  </template>

  <Teleport defer to="#extensionsMenu">
    <div class="extension_container">
      <div
        class="list-group-item flex-container flexGap5 interactable"
        tabindex="0"
        role="listitem"
        @click="enabled = !enabled"
      >
        <div class="fa-fw fa-solid fa-puzzle-piece extensionsMenuExtensionButton" />
        <span>{{ enabled ? t`关闭前端渲染` : t`开启前端渲染` }}</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Iframe from '@/panel/render/Iframe.vue';
import { useMacroLike } from '@/panel/render/macro_like';
import { useOptimizeHljs } from '@/panel/render/optimize_hljs';
import { useCollapseCodeBlock } from '@/panel/render/use_collapse_code_block';
import { useMessageIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useGlobalSettingsStore } from '@/store/settings';
import { useBetterChatTruncation } from './render/use_better_chat_truncation';

const global_settings = useGlobalSettingsStore();
const { enabled, collapse_code_block, use_blob_url, depth } = toRefs(global_settings.settings.render);
const { enabled: macro_enabled } = toRefs(global_settings.settings.macro);

const collapse_code_block_options = [
  {
    label: t`全部`,
    value: 'all',
  },
  {
    label: t`仅前端`,
    value: 'frontend_only',
  },
  {
    label: t`禁用`,
    value: 'none',
  },
];

useBetterChatTruncation(enabled);
useOptimizeHljs(enabled);
const enable_collapse_code_block = computed(() => {
  if (!enabled.value) {
    return 'none';
  }
  return collapse_code_block.value;
});
useCollapseCodeBlock(enable_collapse_code_block);
useMacroLike(macro_enabled);
const runtimes = toRef(useMessageIframeRuntimesStore(), 'runtimes');
</script>

<style>
.TH-render:has(.TH-collapse-code-block-button:not(.hidden\!)):has(pre.hidden\!) {
  display: inline-block;
}
</style>
