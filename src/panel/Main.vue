<template>
  <Item type="plain">
    <template #title>{{ t`版本更新` }}</template>
    <template #description>{{ t`查看最新特性，检查并更新扩展` }}</template>
    <template #content>
      <Button @click="show_update = true">{{ t`更新` }}</Button>
    </template>
  </Item>
  <Divider type="major">
    <i class="fa-solid fa-tools mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`开发工具` }}</div>
  </Divider>
  <div class="flex flex-col gap-0.75">
    <Listener />
    <Reference />
    <MacroLike />
  </div>
  <Divider type="major">
    <i class="fa-solid fa-shapes mr-0.5" />
    <div style="word-spacing: 1.5">{{ t`扩展信息` }}</div>
  </Divider>
  <Info />

  <Update v-model="show_update" />
</template>

<script setup lang="ts">
import Info from '@/panel/main/Info.vue';
import Listener from '@/panel/main/Listener.vue';
import MacroLike from '@/panel/main/MacroLike.vue';
import Reference from '@/panel/main/Reference.vue';
import Update from '@/panel/main/Update.vue';

const show_update = ref(false);
</script>
