<template>
  <Toolbar class="flex w-full flex-wrap gap-0.5" />
  <SearchBar
    v-model="search_input"
    class="flex w-full flex-wrap items-center gap-0.5"
    :placeholder="t`搜索（支持普通和/正则/）`"
    clearable
  />

  <Container
    v-model="global_scripts"
    :title="t`全局脚本`"
    :description="t`酒馆全局可用`"
    :search-input="search_input"
    store-type="global"
  />

  <template v-if="character_id !== undefined">
    <Divider />
    <Container
      v-model="character_scripts"
      :title="t`角色脚本`"
      :description="t`绑定到当前角色卡`"
      :search-input="search_input"
      store-type="character"
    />
  </template>

  <Divider />
  <Container
    v-model="preset_scripts"
    :title="t`预设脚本`"
    :description="t`绑定到当前预设`"
    :search-input="search_input"
    store-type="preset"
  />

  <template v-for="script in runtimes" :key="script.id + script.reload_memo">
    <Iframe :id="script.id" :content="script.content" :use-blob-url="use_blob_url" />
  </template>

  <Teleport v-if="button_element" :to="button_element">
    <div v-for="(buttons, _script_id) in button_map" :key="_script_id" class="qr--buttons flex gap-[5px]">
      <div
        v-for="button in buttons"
        :key="button.button_id"
        class="qr--button menu_button interactable"
        @click="eventSource.emit(button.button_id)"
      >
        {{ button.button_name }}
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import Container from '@/panel/script/Container.vue';
import Iframe from '@/panel/script/Iframe.vue';
import Toolbar from '@/panel/script/Toolbar.vue';
import { useButtonDestinationElement } from '@/panel/script/use_button_destination_element';
import { useResolveIdConflict } from '@/panel/script/use_resolve_id_conflict';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { eventSource } from '@sillytavern/script';

const search_input = ref<RegExp | null>(null);

const character_id = toRef(useCharacterSettingsStore(), 'id');
const preset_id = toRef(usePresetSettingsStore(), 'id');

const global_scripts = useGlobalScriptsStore();
const character_scripts = useCharacterScriptsStore();
const preset_scripts = usePresetScriptsStore();

useResolveIdConflict(character_id, preset_id, global_scripts, character_scripts, preset_scripts);

const { runtimes, button_map } = toRefs(useScriptIframeRuntimesStore());
const use_blob_url = toRef(useGlobalSettingsStore().settings.render, 'use_blob_url');

const button_element = useButtonDestinationElement();
</script>
