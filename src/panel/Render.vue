<template>
  <div>
    <Item type="plain">
      <template #title>{{ t`启用渲染器` }}</template>
      <template #description>{{ t`启用后，符合条件的代码块将被渲染` }}</template>
      <template #content>
        <Toggle id="tavern_helper_settings_script_render_enabled" v-model="render_enabled" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用代码折叠` }}</template>
      <template #description>{{ t`折叠所有代码块，避免正则替换成前端代码时影响阅读` }}</template>
      <template #content>
        <Toggle id="tavern_helper_settings_script_render_enabled" v-model="render_hide_style" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用加载动画` }}</template>
      <template #description>{{ t`在前端内字体、图片等资源未加载完成前，显示加载动画而不是显示不完全界面` }}</template>
      <template #content>
        <Toggle id="tavern_helper_settings_script_render_enabled" v-model="render_loading" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`启用 Blob URL 渲染` }}</template>
      <template #description>{{
        t`使用 Blob URL 渲染前端界面，可能存在样式问题且某些国产浏览器不可用，但更方便 f12 开发者工具调试`
      }}</template>
      <template #content>
        <Toggle id="tavern_helper_settings_script_render_enabled" v-model="render_blob_url" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`渲染深度` }}</template>
      <template #description>{{ t`设置需要渲染的楼层数，从最新楼层开始计数。为0时，将渲染所有楼层` }}</template>
      <template #content>
        <input v-model="render_depth" type="number" :min="0" />
      </template>
    </Item>
  </div>
</template>

<script setup lang="ts">
import Divider from '@/panel/component/Divider.vue';
import Item from '@/panel/component/Item.vue';
import Toggle from '@/panel/component/Toggle.vue';
import { useGlobalSettingsStore } from '@/store/settings';

const { render_enabled, render_hide_style, render_loading, render_blob_url, render_depth } = toRefs(
  useGlobalSettingsStore().settings.render,
);
</script>
