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
      <div class="mt-0.25 text-sm opacity-70">{{ props.description }}</div>
    </div>
    <Toggle :id="`${props.title}-script-enable-toggle`" v-model="store.enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <div ref="list_ref" class="script-list TH-script-list flex flex-grow flex-col gap-[5px] overflow-y-auto py-0.5">
      <template v-for="idx in display_indices" :key="script_trees[idx].id">
        <ScriptItem v-if="isScript(script_trees[idx])" v-model="script_trees[idx]" @delete="handleDelete" />
        <FolderItem v-else v-model="script_trees[idx]" @delete="handleDelete" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/panel/script/FolderItem.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { isScript } from '@/type/scripts';
// import { useSortable } from '@vueuse/integrations/useSortable';

const props = defineProps<{
  title: string;
  description: string;
  filterIds?: Set<string> | null;
}>();

const store = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });
const script_trees = toRef(store.value, 'script_trees');
const display_indices = computed(() => {
  if (!props.filterIds) return script_trees.value.map((_, i) => i);
  return script_trees.value
    .map((item, i) => {
      // 命中规则：
      // - 顶层脚本命中其自身 id
      // - 文件夹命中其自身 id 或其任意子脚本 id
      if (props.filterIds!.has(item.id)) return i;
      if (!isScript(item)) {
        const hasChildMatched = item.scripts.some(s => props.filterIds!.has(s.id));
        if (hasChildMatched) return i;
      }
      return -1;
    })
    .filter(i => i !== -1);
});

const handleDelete = (id: string) => {
  _.remove(store.value.script_trees, script => script.id === id);
};

const list_ref = useTemplateRef<HTMLDivElement>('list_ref');
// useSortable(list_ref, script_trees, {
//   group: { name: 'scripts', pull: true, put: true },
//   handle: '.TH-handle',
//   draggable: '[data-sortable-item]',
//   disabled: computed(() => !!props.filterIds),
//   TODO: onMove 导致脚本拖动时显示增值 - 脚本在原来的位置依旧有一个显示, 而新位置也有一个.
//   onMove: event => {
//     const to = event.to;
//     const dragged = event.dragged;
//     if (to?.hasAttribute('data-folder-content') && dragged?.dataset.type === 'folder') {
//       return false;
//     }
//     return true;
//   },
// });
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
