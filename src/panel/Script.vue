<template>
  <div>
    <Toolbar class="width100p flex-container" />
    <SearchBar
      v-model="search_input"
      class="width100p flex-container alignItemsCenter"
      placeholder="搜索（支持普通和正则）"
      clearable
    />
  </div>
</template>

<script setup lang="ts">
import SearchBar from '@/panel/component/SearchBar.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { TODO_hint } from '@/todo';
import { ref, watch } from 'vue';

const search_input = ref('');
watch(search_input, TODO_hint('按照搜索结果筛选脚本'));
</script>
