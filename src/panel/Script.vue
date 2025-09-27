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

  <!-- TODO: iframe 加载时间过早, 页面还没渲染完 -->
  <Teleport to="body">
    <template v-for="script in scripts" :key="script.id + script.content">
      <Iframe :id="script.id" :content="script.content" :use-blob-url="use_blob_url" />
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import Container from '@/panel/script/Container.vue';
import Iframe from '@/panel/script/Iframe.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { ScriptRuntime } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore } from '@/store/settings';
import { make_TODO } from '@/todo';
import { isScript, Script } from '@/type/scripts';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));

const use_blob_url = useGlobalSettingsStore().settings.render.use_blob_url;

const global_scripts = useGlobalScriptsStore();
const character_id = toRef(useCharacterSettingsStore(), 'id');
const character_scripts = useCharacterScriptsStore();
const preset_scripts = usePresetScriptsStore();

// TODO: 测试当 content 发生变化时 iframe 会重新渲染, 而其他字段发生变化时不会
function toScriptRuntime(script: Script): ScriptRuntime {
  return {
    id: script.id,
    content: script.content,
  };
}
function flatScripts(store: ReturnType<typeof useGlobalScriptsStore>): ScriptRuntime[] {
  if (!store.enabled) {
    return [];
  }
  return _(store.script_trees)
    .flatMap(script => {
      if (isScript(script)) {
        return script.enabled ? [toScriptRuntime(script)] : [];
      }
      return script.scripts.filter(script => script.enabled).map(toScriptRuntime);
    })
    .value();
}
const scripts = computed(() => {
  return _([...flatScripts(global_scripts), ...flatScripts(character_scripts), ...flatScripts(preset_scripts)])
    .sortBy(script => script.id)
    .value();
});
</script>
