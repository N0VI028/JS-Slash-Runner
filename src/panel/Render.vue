<template>
  <div>
    <Item type="plain">
      <template #title>{{ t`启用渲染器` }}</template>
      <template #description>{{ t`启用后，符合条件的代码块将被渲染` }}</template>
      <template #content>
        <Toggle id="render-enabled-toggle" v-model="renderEnabled" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用代码折叠` }}</template>
      <template #description>{{ t`折叠所有代码块，避免正则替换成前端代码时影响阅读` }}</template>
      <template #content>
        <Toggle id="render-hide-style-toggle" v-model="renderHideStyle" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用加载动画` }}</template>
      <template #description>{{ t`在前端内字体、图片等资源未加载完成前，显示加载动画而不是显示不完全界面` }}</template>
      <template #content>
        <Toggle id="render-loading-toggle" v-model="renderLoading" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用 Blob URL 渲染` }}</template>
      <template #description>{{
        t`使用 Blob URL 渲染前端界面，可能存在样式问题且某些国产浏览器不可用，但更方便 f12 开发者工具调试`
      }}</template>
      <template #content>
        <Toggle id="render-blob-url-toggle" v-model="renderBlobUrl" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`渲染深度` }}</template>
      <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为0时，将渲染所有楼层` }}</template>
      <template #content>
        <NumberInput id="render-depth" v-model="renderDepth" :min="0" />
      </template>
    </Item>
  </div>
</template>

<script setup lang="ts">
import Divider from '@/panel/component/Divider.vue';
import Item from '@/panel/component/Item.vue';
import Toggle from '@/panel/component/Toggle.vue';
import { useGlobalSettingsStore } from '@/store/settings';

const { settings } = useGlobalSettingsStore();

const renderEnabled = toRef(settings.render, 'render_enabled');
const renderHideStyle = toRef(settings.render, 'render_hide_style');
const renderLoading = toRef(settings.render, 'render_loading');
const renderBlobUrl = toRef(settings.render, 'render_blob_url');
const renderDepth = toRef(settings.render, 'render_depth');
</script>
