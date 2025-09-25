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

  <Teleport to="body">
    <!-- TODO: 如何让 v-for 不考虑顺序 -->
    <template v-for="script in scripts" :key="script.id">
      <Iframe :script="script" />
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import Iframe from '@/panel/script/components/Iframe.vue';
import ScriptContainer from '@/panel/script/components/ScriptContainer.vue';
import Toolbar from '@/panel/script/components/Toolbar.vue';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { make_TODO } from '@/todo';
import { isScript, Script } from '@/type/scripts';

const search_input = ref('');
watch(search_input, make_TODO('按照搜索结果筛选脚本'));

const global_store = useGlobalScriptsStore();
const character_store = useCharacterScriptsStore();
const preset_store = usePresetScriptsStore();

const scripts = computed(() => {
  const computeScripts = (store: ReturnType<typeof useGlobalScriptsStore>): Script[] => {
    if (!store.enabled) {
      return [];
    }
    return _(store.script_trees)
      .flatMap(script => {
        if (isScript(script)) {
          return script.enabled ? [script] : [];
        }
        return script.scripts.filter(script => script.enabled);
      })
      .value();
  };
  return _([...computeScripts(global_store), ...computeScripts(character_store), ...computeScripts(preset_store)])
    .sortBy(script => script.id)
    .value();
});
</script>
