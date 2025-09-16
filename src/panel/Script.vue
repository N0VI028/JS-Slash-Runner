<template>
  <div>
    <Toolbar class="width100p flex-container" />
    <SearchBar
      v-model="search_input"
      class="width100p flex-container alignItemsCenter"
      :placeholder="t`搜索（支持普通和正则）`"
      clearable
    />
  </div>
</template>

<script setup lang="ts">
import SearchBar from '@/panel/component/SearchBar.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { make_TODO } from '@/todo';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));
</script>
