<template>
  <Toolbar class="flex w-full flex-wrap gap-0.5" />
  <SearchBar
    v-model="search_input"
    class="flex w-full flex-wrap items-center gap-0.5"
    :placeholder="t`搜索（支持普通和正则）`"
    clearable
  />

  <Container v-model="global_scripts" title="全局脚本" description="酒馆全局可用" />
  <template v-if="character_id !== undefined">
    <Divider />
    <Container v-model="character_scripts" title="角色脚本" description="绑定到当前角色卡" />
  </template>
  <Divider />
  <Container v-model="preset_scripts" title="预设脚本" description="绑定到当前预设" />

  <template v-for="script in scripts" :key="script.hash">
    <Iframe :id="script.id" :content="script.content" :use-blob-url="use_blob_url" />
  </template>
</template>

<script setup lang="ts">
import Container from '@/panel/script/Container.vue';
import Iframe from '@/panel/script/Iframe.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { useScriptIframeRuntimes } from '@/panel/script/use_script_iframe_runtimes';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore } from '@/store/settings';
import { make_TODO } from '@/todo';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));

const global_settings = useGlobalSettingsStore();
const use_blob_url = global_settings.settings.render.use_blob_url;

const character_id = toRef(useCharacterSettingsStore(), 'id');

const global_scripts = useGlobalScriptsStore();
const character_scripts = useCharacterScriptsStore();
const preset_scripts = usePresetScriptsStore();

const scripts = useScriptIframeRuntimes(
  toRef(global_settings, 'app_ready'),
  global_scripts,
  character_scripts,
  preset_scripts,
);
</script>
