<template>
  <div>
    <Item>
      <template #title>{{ t`启用扩展` }}</template>
      <template #description>{{ t`扩展总开关` }}</template>
      <template #content>
        <Toggle id="tavern_helper_settings_enabled" v-model="enabled" />
      </template>
    </Item>
    <Divider />
    <Item type="plain">
      <template #title>{{ t`版本更新` }}</template>
      <template #description>{{ t`查看最新特性，检查并更新扩展` }}</template>
      <template #content>
        <Button :on-click="make_TODO('实现检查酒馆助手版本并更新的功能')">{{ t`更新` }}</Button>
      </template>
    </Item>
    <Divider type="major"><i class="fa-solid fa-tools margin-r5"></i>{{ t`开发工具` }}</Divider>
    <Reference />
    <Divider type="major"><i class="fa-solid fa-shapes margin-r5"></i>{{ t`扩展信息` }}</Divider>
    <Info />
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import { Collapsible } from '@/panel/component/collapsible';
import Divider from '@/panel/component/Divider.vue';
import Item from '@/panel/component/Item.vue';
import Toggle from '@/panel/component/Toggle.vue';
import Info from '@/panel/main/Info.vue';
import Reference from '@/panel/main/Reference.vue';
import { useGlobalSettingsStore } from '@/store/settings';
import { make_TODO } from '@/todo';

const enabled = toRef(useGlobalSettingsStore().settings, 'enabled');

onMounted(() => {
  Collapsible.initAll('.collapsible', {
    headerSelector: 'div:first-child',
    contentSelector: '.collapsible-content',
    initiallyExpanded: false,
    animationDuration: {
      expand: 280,
      collapse: 250,
    },
  });
});
</script>
