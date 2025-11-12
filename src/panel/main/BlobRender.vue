<template>
  <Item type="box">
    <template #title>{{ t`启用 Blob URL 渲染` }}</template>
    <template #description>
      {{ t`使用 Blob URL 渲染前端界面，更方便 f12 开发者工具调试，若界面出现渲染问题请尝试关闭此选项` }}
    </template>
    <template #content>
      <Toggle id="TH-render-use-blob-url" v-model="use_blob_url" />
    </template>
  </Item>
</template>

<script setup lang="ts">
import { useGlobalSettingsStore } from '@/store/settings';

const global_settings = useGlobalSettingsStore();
const use_blob_url = toRef(global_settings.settings.render, 'use_blob_url');
</script>
