<template>
  <div>
    <Button type="tavern" :on-click="make_TODO('创建脚本库脚本')"
      ><i class="fa-solid fa-scroll" /><small>+ 脚本</small></Button
    >
    <Button type="tavern" :on-click="make_TODO('创建脚本库脚本文件夹')"
      ><i class="fa-solid fa-folder-plus" /><small>+ 文件夹</small></Button
    >
    <Button type="tavern" :on-click="make_TODO('导入脚本库脚本')"
      ><i class="fa-solid fa-file-import" /><small>导入</small></Button
    >
    <Button type="tavern" :on-click="make_TODO('查看脚本库内置库')"
      ><i class="fa-solid fa-archive" /><small>内置库</small></Button
    >
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import { make_TODO } from '@/todo';
</script>
