<template>
  <div class="flex flex-col gap-1">
    <Item type="box">
      <template #title>{{ t`提示词查看器` }}</template>
      <template #description>{{ t`查看提示词发送情况` }}</template>
      <template #content>
        <Button :on-click="make_TODO('打开提示词查看器')">{{ t`打开` }}</Button>
      </template>
    </Item>

    <Item type="box">
      <template #title>{{ t`变量管理器` }}</template>
      <template #description>{{ t`查看和管理变量` }}</template>
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
