<template>
  <Popup v-model="show_selector" @confirm="onSelectorConfirm">
    <Selector
      v-model="target"
      title="选择创建目标"
      :options="
        useCharacterSettingsStore().id === undefined
          ? [
              { label: '全局脚本库', value: 'global' },
              { label: '预设脚本库', value: 'preset' },
            ]
          : [
              { label: '全局脚本库', value: 'global' },
              { label: '角色脚本库', value: 'character' },
              { label: '预设脚本库', value: 'preset' },
            ]
      "
    />
  </Popup>

  <FolderEditor v-if="type === 'folder'" v-model="show_editor" @submit="onFolderEditorSubmit" />
  <ItemEditor v-else v-model="show_editor" @submit="onItemEditorSubmit" />
</template>

<script setup lang="ts">
import FolderEditor from '@/panel/script/FolderEditor.vue';
import ItemEditor from '@/panel/script/ItemEditor.vue';
import { ScriptFolderForm, ScriptForm } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore } from '@/store/settings';
import { Script, ScriptFolder } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { ref } from 'vue';

const show_selector = defineModel<boolean>({ required: true });

defineProps<{ type?: 'script' | 'folder' }>();

const target = ref<'global' | 'character' | 'preset'>('global');
function onSelectorConfirm() {
  show_selector.value = false;
  show_editor.value = true;
  return true;
}

const show_editor = ref<boolean>(false);

function onItemEditorSubmit(result: ScriptForm) {
  const script: Script = {
    type: 'script',
    enabled: false,
    id: uuidv4(),
    ...result,
  };
  switch (target.value) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(script);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(script);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(script);
      break;
  }
}

function onFolderEditorSubmit(result: ScriptFolderForm) {
  const folder: ScriptFolder = {
    type: 'folder',
    enabled: false,
    id: uuidv4(),
    scripts: [],
    ...result,
  };
  switch (target.value) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(folder);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(folder);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(folder);
      break;
  }
}
</script>
