<template>
  <div class="flex flex-col gap-1">
    <Item type="box">
      <template #title>{{ t`提示词查看器` }}</template>
      <template #description>{{ t`查看当前提示词发送情况，窗口开启时会监听新的发送及时更新显示` }}</template>
      <template #content>
        <Button :on-click="make_TODO('打开提示词查看器')">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Item type="box">
      <template #title>{{ t`变量管理器` }}</template>
      <template #description>{{ t`查看和管理全局、角色、聊天、消息楼层变量` }}</template>
      <template #content>
        <Button :on-click="make_TODO('打开变量管理器')">{{ t`打开` }}</Button>
      </template>
    </Item>
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import Item from '@/panel/component/Item.vue';
import { make_TODO } from '@/todo';
</script>
