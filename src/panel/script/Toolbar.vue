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
    <Button type="tavern" @click="openImport">
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
import { Script, ScriptButton, ScriptFolder } from '@/type/scripts';
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

/**
 * 导入脚本库
 */

const { open, onChange } = useFileDialog({
  accept: '.json,.zip',
  directory: false,
});

async function handleImport(target: 'global' | 'character' | 'preset', filesList: FileList | null) {
  if (!filesList) return;
  const jsonFiles = Array.from(filesList).filter(f => f.name.toLowerCase().endsWith('.json'));
  if (jsonFiles.length === 0) return;

  const ImportScript = z
    .object({
      type: z.string().optional(),
      id: z.string().catch(() => uuidv4()),
      name: z.string().catch(''),
      content: z.string().catch(''),
      info: z.string().catch(''),
      enabled: z.boolean().catch(false),
      buttons: z.object({
        enabled: z.boolean(),
        button: z.array(ScriptButton),
      }),
      data: z.record(z.string(), z.any()).catch({}),
    })
    .transform(v => ({
      type: 'script' as const,
      enabled: v.enabled ?? false,
      id: v.id,
      name: v.name,
      content: v.content,
      info: v.info,
      buttons: v.buttons,
      data: v.data,
    }));

  let store;
  switch (target) {
    case 'global':
      store = useGlobalScriptsStore();
      break;
    case 'character':
      store = useCharacterScriptsStore();
      break;
    case 'preset':
      store = usePresetScriptsStore();
      break;
  }

  for (const file of jsonFiles) {
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const toArray = Array.isArray(raw) ? raw : [raw];
      for (const item of toArray) {
        const parsed = ImportScript.parse(item);
        const strict = Script.parse(parsed);
        store.script_trees.push(strict);
      }
    } catch (err) {
      console.error(err);
      toastr.error('导入脚本失败: ' + file.name);
    }
  }
}

function openImport() {
  const target_selector = useModal({
    component: TargetSelector,
    attrs: {
      onSubmit: async (value: 'global' | 'character' | 'preset') => {
        const disposer = onChange(selected => {
          handleImport(value, selected);
          disposer.off();
        });
        open();
      },
    },
  });
  target_selector.open();
}
</script>
