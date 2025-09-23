<template>
  <div>
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
        <Toggle id="TH-render-hide-style" v-model="hide_style" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用加载动画` }}</template>
      <template #description>{{ t`在前端内字体、图片等资源未加载完成前，显示加载动画而不是显示不完全界面` }}</template>
      <template #content>
        <Toggle id="TH-render-loading" v-model="loading" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用 Blob URL 渲染` }}</template>
      <template #description>
        {{ t`使用 Blob URL 渲染前端界面，可能存在样式问题且某些国产浏览器不可用，但更方便 f12 开发者工具调试` }}
      </template>
      <template #content>
        <Toggle id="TH-render-blob-url" v-model="blob_url" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`渲染深度` }}</template>
      <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为0时，将渲染所有楼层` }}</template>
      <template #content>
        <input v-model="depth" class="w-3" type="number" :min="0" />
      </template>
    </Item>
  </div>
</template>

<script setup lang="ts">
import { useGlobalSettingsStore } from '@/store/settings';
import { make_TODO } from '@/todo';

const { enabled, hide_style, loading, blob_url, depth } = toRefs(useGlobalSettingsStore().settings.render);
watch(enabled, make_TODO('启用渲染器'), { immediate: true });
watch(hide_style, make_TODO('启用代码折叠'), { immediate: true });
watch(loading, make_TODO('启用加载动画'), { immediate: true });
watch(blob_url, make_TODO('启用 Blob URL 渲染'), { immediate: true });
watch(depth, make_TODO('渲染深度'), { immediate: true });
</script>
