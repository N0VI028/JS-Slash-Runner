<template>
  <Toolbar class="flex w-full flex-wrap gap-0.5" />
  <SearchBar
    v-model="search_input"
    class="flex w-full flex-wrap items-center gap-0.5"
    :placeholder="t`搜索（支持普通和正则）`"
    clearable
  />
  <ScriptContainer v-model="global_store" title="全局脚本" description="酒馆全局可用" />
  <Divider />
  <ScriptContainer v-model="character_store" title="角色脚本" description="绑定到当前角色卡" />
  <Divider />
  <ScriptContainer v-model="preset_store" title="预设脚本" description="绑定到当前预设" />
</template>

<script setup lang="ts">
import ScriptContainer from '@/panel/script/components/ScriptContainer.vue';
import Toolbar from '@/panel/script/components/Toolbar.vue';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { make_TODO } from '@/todo';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));

const global_store = useGlobalScriptsStore();
const character_store = useCharacterScriptsStore();
const preset_store = usePresetScriptsStore();
</script>
