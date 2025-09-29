<template>
  <Toolbar class="flex w-full flex-wrap gap-0.5" />
  <SearchBar
    v-model="search_input"
    class="flex w-full flex-wrap items-center gap-0.5"
    :placeholder="t`搜索（支持普通和正则）`"
    :items="searchable_items"
    :search-fields="['name']"
    clearable
    @update:filtered-items="onSearchFiltered"
  />

  <Container v-model="global_scripts" title="全局脚本" description="酒馆全局可用" :filter-ids="active_filter_ids" />
  <template v-if="character_id !== undefined">
    <Divider />
    <Container
      v-model="character_scripts"
      title="角色脚本"
      description="绑定到当前角色卡"
      :filter-ids="active_filter_ids"
    />
  </template>
  <Divider />
  <Container v-model="preset_scripts" title="预设脚本" description="绑定到当前预设" :filter-ids="active_filter_ids" />

  <template v-for="script in runtimes" :key="script.id + script.reload_memo">
    <Iframe :id="script.id" :content="script.content" :use-blob-url="use_blob_url" />
  </template>
</template>

<script setup lang="ts">
import Container from '@/panel/script/Container.vue';
import Iframe from '@/panel/script/Iframe.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore } from '@/store/settings';
import type { ScriptTree } from '@/type/scripts';

const search_input = ref('');
const character_id = toRef(useCharacterSettingsStore(), 'id');

const global_scripts = useGlobalScriptsStore();
const character_scripts = useCharacterScriptsStore();
const preset_scripts = usePresetScriptsStore();

const searchable_items = computed<ScriptTree[]>(() => {
  const result: ScriptTree[] = [];
  result.push(...global_scripts.script_trees);
  if (character_id.value !== undefined) {
    result.push(...character_scripts.script_trees);
  }
  result.push(...preset_scripts.script_trees);
  return result;
});

const matched_ids = ref<Set<string>>(new Set());
const active_filter_ids = computed<Set<string> | null>(() =>
  search_input.value.trim().length > 0 ? matched_ids.value : null,
);

function onSearchFiltered(items: ScriptTree[]) {
  matched_ids.value = new Set(items.map(it => it.id));
}

const runtimes = toRef(useScriptIframeRuntimesStore(), 'runtimes');
const use_blob_url = toRef(useGlobalSettingsStore().settings.render, 'use_blob_url');
</script>
