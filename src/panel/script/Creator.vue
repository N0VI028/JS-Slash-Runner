<template>
  <Popup v-model="show_selector" @confirm="onSelectorConfirm">
    <Selector
      v-model="target"
      title="选择脚本目标"
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
</template>

<script setup lang="ts">
import Editor from '@/panel/script/Editor.vue';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { useCharacterSettingsStore } from '@/store/settings';
import { Script } from '@/type/scripts';

const show_selector = defineModel<boolean>({ required: true });

const emit = defineEmits<{
  submit: [];
}>();

const target = ref<string>('global');
function onSelectorConfirm() {
  show_selector.value = false;
  show_editor.value = true;
  return true;
}

const show_editor = ref<boolean>(false);
function onEditorSubmit(result: Script) {
  switch (target.value) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(result);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(result);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(result);
      break;
  }
  emit('submit');
}
</script>
