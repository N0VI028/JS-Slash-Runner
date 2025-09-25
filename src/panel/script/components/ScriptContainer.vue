<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">{{ props.title }}</div>
        <div class="ml-0.5 flex cursor-pointer items-center justify-center" title="批量操作">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div class="mt-0.25 text-(length:--TH-FontSize-sm) opacity-70">{{ props.description }}</div>
    </div>
    <Toggle id="global-script-enable-toggle" v-model="store.enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <div ref="list_ref" class="script-list TH-script-list flex flex-grow flex-col gap-[5px] overflow-y-auto py-0.5">
      <template v-for="(script, index) in store.script_trees" :key="script.id">
        <template v-if="isScript(store.script_trees[index])">
          <ScriptItem v-model="store.script_trees[index]" />
        </template>
        <template v-else>
          <FolderItem v-model="store.script_trees[index]" />
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/panel/script/components/FolderItem.vue';
import ScriptItem from '@/panel/script/components/ScriptItem.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { isScript } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { useSortable } from '@vueuse/integrations/useSortable';

const props = defineProps<{
  title: string;
  description: string;
}>();

const store = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });
store.value.script_trees = [
  {
    type: 'script',
    enabled: true,
    name: '测试脚本',
    id: uuidv4(),
    content: '测试脚本内容',
    info: '测试脚本信息',
    buttons_enabled: true,
    buttons: [],
    data: {},
  },
  {
    type: 'script',
    enabled: true,
    name: '测试脚本2',
    id: uuidv4(),
    content: '测试脚本内容2',
    buttons_enabled: true,
    info: '测试脚本信息2',
    buttons: [],
    data: {},
  },
  {
    type: 'script',
    enabled: false,
    name: '测试脚本3',
    id: uuidv4(),
    content: '测试脚本内容3',
    buttons_enabled: true,
    info: '测试脚本信息3',
    buttons: [],
    data: {},
  },
];

const list_ref = useTemplateRef<HTMLDivElement>('list_ref');
useSortable(list_ref, toRef(store.value, 'script_trees'), {
  group: { name: 'scripts', pull: true, put: true },
  handle: '.TH-handle',
  draggable: '[data-sortable-item]',
  // TODO: onMove 导致脚本拖动时显示增值 - 脚本在原来的位置依旧有一个显示, 而新位置也有一个.
  // onMove: event => {
  //   const to = event.to;
  //   const dragged = event.dragged;
  //   if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') {
  //     return false;
  //   }
  //   return true;
  // },
});
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 20px;
  opacity: 0.5;
}

.script-list.root-drag-target {
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 5%, transparent);
  border: 1px solid var(--SmartThemeQuoteColor);
  border-radius: 5px;
}
</style>
