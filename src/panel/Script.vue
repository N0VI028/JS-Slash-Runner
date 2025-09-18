<template>
  <div>
    <Toolbar class="flex w-full flex-wrap gap-0.5" />
    <SearchBar
      v-model="search_input"
      class="flex w-full flex-wrap items-center gap-0.5"
      :placeholder="t`搜索（支持普通和正则）`"
      clearable
    />
    <ScriptContainer />
  </div>
</template>

<script setup lang="ts">
import SearchBar from '@/panel/component/SearchBar.vue';
import ScriptContainer from '@/panel/script/ScriptContainer.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { make_TODO } from '@/todo';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));
</script>
