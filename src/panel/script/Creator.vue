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

  <Editor v-model="show_editor" @submit="onEditorSubmit" />
  <FolderCreate v-model="show_folder_creator" />
</template>

<script setup lang="ts">
import Editor from '@/panel/script/Editor.vue';
import FolderCreate from '@/panel/script/FolderCreate.vue';
import { ScriptForm } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore } from '@/store/settings';
import { Script } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { ref, watch } from 'vue';

type CreationType = 'script' | 'folder';

const show_selector = defineModel<boolean>({ required: true });

const props = withDefaults(defineProps<{ type?: CreationType }>(), {
  type: 'script',
});

const target = ref<string>('global');
function onSelectorConfirm() {
  show_selector.value = false;
  show_editor.value = false;
  show_folder_creator.value = false;

  if (props.type === 'folder') {
    show_folder_creator.value = true;
  } else {
    show_editor.value = true;
  }

  return true;
}

const show_editor = ref<boolean>(false);
const show_folder_creator = ref<boolean>(false);

watch(
  () => props.type,
  () => {
    show_editor.value = false;
    show_folder_creator.value = false;
  },
);

function onEditorSubmit(result: ScriptForm) {
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
</script>
