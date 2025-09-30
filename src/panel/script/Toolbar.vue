<template>
  <div class="flex gap-0.25">
    <Button type="tavern" @click="openCreator('script')">
      <i class="fa-solid fa-scroll" />
      <small>{{ t`+ 脚本` }}</small>
    </Button>
    <Button type="tavern" @click="openCreator('folder')">
      <i class="fa-solid fa-folder-plus" />
      <small>{{ t`+ 文件夹` }}</small>
    </Button>
    <Button type="tavern" @click="make_TODO('导入脚本库脚本')">
      <i class="fa-solid fa-file-import" />
      <small>{{ t`导入` }}</small>
    </Button>
    <Button type="tavern" @click="make_TODO('查看脚本库内置库')">
      <i class="fa-solid fa-archive" />
      <small>{{ t`内置库` }}</small>
    </Button>
  </div>
</template>

<script setup lang="ts">
import FolderEditor from '@/panel/script/FolderEditor.vue';
import ScriptEditor from '@/panel/script/ScriptEditor.vue';
import TargetSelector from '@/panel/script/TargetSelector.vue';
import { ScriptFolderForm, ScriptForm } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { make_TODO } from '@/todo';
import { Script, ScriptFolder } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';

function openCreator(type: 'script' | 'folder') {
  let target: 'global' | 'character' | 'preset';
  const target_selector = useModal({
    component: TargetSelector,
    attrs: {
      onSubmit: async (value: 'global' | 'character' | 'preset') => {
        target = value;
        editor.open();
      },
    },
  });
  const editor = useModal({
    component: type === 'script' ? ScriptEditor : FolderEditor,
    attrs: {
      onSubmit: async (result: ScriptForm | ScriptFolderForm) => {
        if (type === 'script') {
          onScriptEditorSubmit(target, result as ScriptForm);
        } else {
          onFolderEditorSubmit(target, result as ScriptFolderForm);
        }
        target_selector.close();
      },
    },
  });
  target_selector.open();
}

function onScriptEditorSubmit(target: 'global' | 'character' | 'preset', result: ScriptForm) {
  const script: Script = {
    type: 'script',
    enabled: false,
    id: uuidv4(),
    ...result,
  };
  switch (target) {
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

function onFolderEditorSubmit(target: 'global' | 'character' | 'preset', result: ScriptFolderForm) {
  const folder: ScriptFolder = {
    type: 'folder',
    enabled: false,
    id: uuidv4(),
    scripts: [],
    ...result,
  };
  switch (target) {
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
