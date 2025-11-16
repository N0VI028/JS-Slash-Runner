<template>
  <div class="flex gap-0.25">
    <Button type="tavern" @click="openCreator('script')">
      <i class="fa-solid fa-scroll" />
      <small>{{ `+ ` + t`脚本` }}</small>
    </Button>
    <Button type="tavern" @click="openCreator('folder')">
      <i class="fa-solid fa-folder-plus" />
      <small>{{ `+ ` + t`文件夹` }}</small>
    </Button>
    <Button type="tavern" @click="openImport">
      <i class="fa-solid fa-file-import" />
      <small>{{ t`导入` }}</small>
    </Button>
    <Button type="tavern" @click="openBuiltin">
      <i class="fa-solid fa-archive" />
      <small>{{ t`内置库` }}</small>
    </Button>
  </div>
</template>

<script setup lang="ts">
import Builtin from '@/panel/script/Builtin.vue';
import FolderEditor from '@/panel/script/FolderEditor.vue';
import ScriptEditor from '@/panel/script/ScriptEditor.vue';
import TargetSelector from '@/panel/script/TargetSelector.vue';
import { ScriptFolderForm, ScriptForm } from '@/panel/script/type';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { ScriptData as BackwardScriptData } from '@/type/backward';
import { isScriptFolder, Script, ScriptFolder, ScriptTree } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { useFileDialog } from '@vueuse/core';

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

function getStoreFormType(target: 'global' | 'character' | 'preset'): ReturnType<typeof useGlobalScriptsStore> {
  switch (target) {
    case 'global':
      return useGlobalScriptsStore();
    case 'character':
      return useCharacterScriptsStore();
    case 'preset':
      return usePresetScriptsStore();
  }
}

function onScriptEditorSubmit(target: 'global' | 'character' | 'preset', result: ScriptForm) {
  getStoreFormType(target).script_trees.push(Script.parse(result));
}

function onFolderEditorSubmit(target: 'global' | 'character' | 'preset', result: ScriptFolderForm) {
  getStoreFormType(target).script_trees.push(ScriptFolder.parse(result));
}

const { open: openFileDialog, onChange } = useFileDialog({
  accept: '.json',
  multiple: true,
  directory: false,
});

async function handleImport(target: 'global' | 'character' | 'preset', files_list: FileList | null) {
  if (!files_list) {
    return;
  }

  await Promise.allSettled(
    Array.from(files_list).map(async (file: File) => {
      try {
        const data = JSON.parse(await file.text());
        const script_tree = (_.has(data, 'buttons') ? BackwardScriptData : ScriptTree).parse(data);
        script_tree.enabled = false;
        script_tree.id = uuidv4();
        if (isScriptFolder(script_tree)) {
          script_tree.scripts.forEach(script => {
            script.id = uuidv4();
          });
          toastr.success(t`成功导入脚本文件夹 '${script_tree.name}'`);
        } else {
          toastr.success(t`成功导入脚本 '${script_tree.name}'`);
        }
        getStoreFormType(target).script_trees.push(script_tree);
      } catch (err) {
        const error = err as Error;
        console.error(error);
        toastr.error(error.message, t`导入脚本文件 '${file.name}' 失败`);
      }
    }),
  );
}

const { open: openImport } = useModal({
  component: TargetSelector,
  attrs: {
    onSubmit: async (value: 'global' | 'character' | 'preset') => {
      const disposer = onChange(selected => {
        handleImport(value, selected);
        disposer.off();
      });
      openFileDialog();
    },
  },
});

const { open: openBuiltin } = useModal({
  component: Builtin,
});
</script>
