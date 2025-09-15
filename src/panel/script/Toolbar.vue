<template>
  <div class="width100p">
    <div class="flex-container">
      <Button type="tavern" :on-click="TODO"><i class="fa-solid fa-scroll" /><small>+ 脚本</small></Button>
      <Button type="tavern" :on-click="TODO"><i class="fa-solid fa-folder-plus" /><small>+ 文件夹</small></Button>
      <Button type="tavern" :on-click="TODO"><i class="fa-solid fa-file-import" /><small>导入</small></Button>
      <Button type="tavern" :on-click="TODO"><i class="fa-solid fa-archive" /><small>内置库</small></Button>
    </div>
  </div>

  <div class="width100p flex-container alignItemsCenter">
    <SearchBar v-model="search_input" placeholder="搜索（支持普通和正则）" clearable />
  </div>
</template>

<script setup lang="ts">
import Button from '@/panel/component/Button.vue';
import SearchBar from '@/panel/component/SearchBar.vue';
import { TODO } from '@/todo';
import { ref, watch } from 'vue';

const search_input = ref('');
watch(search_input, TODO);
</script>
