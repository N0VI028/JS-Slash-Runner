<template>
  <div class="width100p">
    <div class="flex-container">
      <Button type="tavern" :on-click="TODO_hint('创建脚本库脚本')"
        ><i class="fa-solid fa-scroll" /><small>+ 脚本</small></Button
      >
      <Button type="tavern" :on-click="TODO_hint('创建脚本库脚本文件夹')"
        ><i class="fa-solid fa-folder-plus" /><small>+ 文件夹</small></Button
      >
      <Button type="tavern" :on-click="TODO_hint('导入脚本库脚本')"
        ><i class="fa-solid fa-file-import" /><small>导入</small></Button
      >
      <Button type="tavern" :on-click="TODO_hint('查看脚本库内置库')"
        ><i class="fa-solid fa-archive" /><small>内置库</small></Button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import { TODO_hint } from '@/todo';
</script>
