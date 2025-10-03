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
import JSZip from 'jszip';

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

  const files = Array.from(filesList);

  const ImportScript = z
    .object({
      type: z.string().optional(),
      id: z.string().catch(() => uuidv4()),
      name: z.string().catch(''),
      content: z.string().catch(''),
      info: z.string().catch(''),
      enabled: z.boolean().catch(false),
      button: z.object({
        enabled: z.boolean(),
        buttons: z.array(ScriptButton),
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
      button: v.button,
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

  // 处理文件
  for (const file of files) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith('.json')) {
      // 处理 JSON 文件
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
    } else if (fileName.endsWith('.zip')) {
      // 处理 ZIP 文件
      try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // 获取所有 JSON 文件
        const jsonFileNames: string[] = [];
        zip.forEach((relativePath, zipEntry) => {
          if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.json')) {
            jsonFileNames.push(relativePath);
          }
        });

        if (jsonFileNames.length === 0) {
          toastr.error('ZIP 文件中没有找到 JSON 文件: ' + file.name);
          continue;
        }

        // 解析所有 JSON 文件为脚本
        const scripts: Script[] = [];
        for (const jsonFileName of jsonFileNames) {
          try {
            const jsonContent = await zip.file(jsonFileName)!.async('string');
            const raw = JSON.parse(jsonContent);
            const toArray = Array.isArray(raw) ? raw : [raw];
            for (const item of toArray) {
              const parsed = ImportScript.parse(item);
              const strict = Script.parse(parsed);
              scripts.push(strict);
            }
          } catch (err) {
            console.error(err);
            toastr.error('导入 ZIP 中的脚本失败: ' + jsonFileName);
          }
        }

        if (scripts.length > 0) {
          // 创建文件夹，名称为 ZIP 文件名（去除扩展名）
          const folderName = file.name.replace(/\.zip$/i, '');
          const folder: ScriptFolder = {
            type: 'folder',
            enabled: false,
            id: uuidv4(),
            name: folderName,
            icon: 'fa-solid fa-folder',
            color: '#888888',
            scripts: scripts,
          };
          store.script_trees.push(folder);
        }
      } catch (err) {
        console.error(err);
        toastr.error('导入 ZIP 文件失败: ' + file.name);
      }
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
