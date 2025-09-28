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
    <template #description>{{ t`折叠所有代码块，避免正则替换成前端代码时影响阅读` }}</template>
    <template #content>
      <Toggle id="TH-render-collapse-code-block" v-model="collapse_code_block" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`启用加载动画` }}</template>
    <template #description>{{ t`在前端内字体、图片等资源未加载完成前，显示加载动画而不是显示不完全界面` }}</template>
    <template #content>
      <Toggle id="TH-render-with-loading" v-model="with_loading" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`启用 Blob URL 渲染` }}</template>
    <template #description>
      {{ t`使用 Blob URL 渲染前端界面，可能存在样式问题且某些国产浏览器不可用，但更方便 f12 开发者工具调试` }}
    </template>
    <template #content>
      <Toggle id="TH-render-use-blob-url" v-model="use_blob_url" />
    </template>
  </Item>
  <Divider />
  <Item type="plain">
    <template #title>{{ t`渲染深度` }}</template>
    <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为0时，将渲染所有楼层` }}</template>
    <template #content>
      <input v-model="depth" class="text_pole w-3.5!" type="number" :min="0" />
    </template>
  </Item>

  <template v-for="(runtime, message_id) in runtimes" :key="message_id">
    <template v-for="(element, index) in runtime" :key="element">
      <Teleport :to="element">
        <Iframe
          :id="`${message_id}-${index}`"
          :element="element"
          :with-loading="with_loading"
          :use-blob-url="use_blob_url"
        />
      </Teleport>
    </template>
  </template>
</template>

<script setup lang="ts">
import Iframe from '@/panel/render/Iframe.vue';
import { optimizeHljs } from '@/panel/render/optimize_hljs';
import { useCollapseCodeBlock } from '@/panel/render/use_collapse_code_block';
import { useMessageIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useGlobalSettingsStore } from '@/store/settings';

optimizeHljs();

const { enabled, collapse_code_block, with_loading, use_blob_url, depth } = toRefs(
  useGlobalSettingsStore().settings.render,
);

useCollapseCodeBlock(collapse_code_block);
const runtimes = toRef(useMessageIframeRuntimesStore(), 'runtimes');
</script>
