<template>
  <Toolbar class="flex w-full flex-wrap gap-0.5" />
  <SearchBar
    v-model="search_input"
    class="flex w-full flex-wrap items-center gap-0.5"
    :placeholder="t`搜索（支持普通和/正则/）`"
    clearable
  />

  <Container v-model="global_scripts" :title="t`全局脚本`" :description="t`酒馆全局可用`" target="global" />

  <template v-if="character_name !== undefined">
    <Divider />
    <Container v-model="character_scripts" :title="t`角色脚本`" :description="t`绑定到当前角色卡`" target="character" />
  </template>

  <Divider />
  <Container v-model="preset_scripts" :title="t`预设脚本`" :description="t`绑定到当前预设`" target="preset" />

  <Teleport to="body">
    <Iframe
      v-for="script in runtimes"
      :id="script.id"
      :key="script.source + script.id + script.reload_memo"
      :name="script.name"
      :content="script.content"
      :use-blob-url="use_blob_url"
    />
  </Teleport>

  <Teleport v-if="!!button_element" defer :to="button_element">
    <div
      v-for="(buttons, script_id) in button_map"
      :id="`script_container_${script_id}`"
      :key="script_id"
      class="qr--buttons flex gap-[5px]"
    >
      <div
        v-for="button in buttons"
        :key="button.button_id"
        class="qr--button menu_button interactable"
        @click.stop.prevent="eventSource.emit(button.button_id)"
        @pointerdown.prevent
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
import { useCheckEnablementPopup } from '@/panel/script/use_check_enablement_popup';
import { useResolveIdConflict } from '@/panel/script/use_resolve_id_conflict';
import { useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore, useGlobalSettingsStore, usePresetSettingsStore } from '@/store/settings';
import { eventSource } from '@sillytavern/script';

const search_input = ref<RegExp | null>(null);
provide('search_input', search_input);
provide('during_sorting_item', ref(false));

const { name: preset_name } = storeToRefs(usePresetSettingsStore());
const { name: character_name } = storeToRefs(useCharacterSettingsStore());

const global_settings = useGlobalSettingsStore();
const global_scripts = useGlobalScriptsStore();
const preset_scripts = usePresetScriptsStore();
const character_scripts = useCharacterScriptsStore();

useResolveIdConflict(preset_name, character_name, global_scripts, preset_scripts, character_scripts);
useCheckEnablementPopup(preset_name, character_name, global_settings, preset_scripts, character_scripts);

const { runtimes, button_map } = toRefs(useScriptIframeRuntimesStore());
const use_blob_url = toRef(useGlobalSettingsStore().settings.render, 'use_blob_url');

const button_element = useButtonDestinationElement();
</script>
