<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">{{ title }}</div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div class="mt-0.25 th-text-sm opacity-70">{{ description }}</div>
    </div>
    <Toggle :id="`${title}-script-enable-toggle`" v-model="store.enabled" />
  </div>

  <div class="flex h-full flex-col">
    <VueDraggable
      v-model="script_trees"
      group="TH-scripts"
      handle=".TH-handle"
      class="flex grow flex-col gap-[5px] overflow-y-auto py-0.5"
      :class="{ 'min-h-2': script_trees.length === 0 }"
      :animation="150"
      :data-container-type="target"
      direction="vertical"
      :disabled="search_input !== null"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      :invert-swap="true"
      :inverted-swap-threshold="0.9"
      @start="onSortingItemStart"
      @end="during_sorting_item = false"
    >
      <div v-for="(script, index) in script_trees" :key="script.id">
        <ScriptItem
          v-if="isScript(script_trees[index])"
          v-model="script_trees[index]"
          :target="target"
          @delete="handleDelete"
          @move="handleMove"
          @copy="handleCopy"
        />
        <FolderItem v-else v-model="script_trees[index]" :target="target" @delete="handleDelete" @move="handleMove" />
      </div>
      <div v-if="script_trees.length === 0" class="text-center opacity-50">{{ t`暂无脚本` }}</div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/panel/script/FolderItem.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useCharacterScriptsStore, useGlobalScriptsStore, usePresetScriptsStore } from '@/store/scripts';
import { isScript } from '@/type/scripts';
import { uuidv4 } from '@sillytavern/scripts/utils';
import { SortableEvent, VueDraggable } from 'vue-draggable-plus';

const store = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });

defineProps<{
  title: string;
  description: string;
  target: 'global' | 'character' | 'preset';
}>();

const emit = defineEmits<{
  move: [id: string, target: 'global' | 'character' | 'preset'];
}>();

provide<Ref<boolean>>('container_enabled', toRef(store.value, 'enabled'));

const search_input = inject<Ref<RegExp | null>>('search_input', ref(null));

const during_sorting_item = inject<Ref<boolean>>('during_sorting_item', ref(false));
function onSortingItemStart(event: SortableEvent) {
  during_sorting_item.value = $(event.item).children('[data-type="script"]').length > 0;
}

const script_trees = toRef(store.value, 'script_trees');

const handleDelete = (id: string) => {
  _.remove(store.value.script_trees, script => script.id === id);
};

const handleMove = (id: string, target: 'global' | 'character' | 'preset') => {
  const removed = _.remove(store.value.script_trees, script => script.id === id);
  switch (target) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(...removed);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(...removed);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(...removed);
      break;
  }
};

const handleCopy = (id: string, target: 'global' | 'character' | 'preset') => {
  const script = _.find(store.value.script_trees, script => script.id === id);
  if (!script) {
    return;
  }
  const copied_script = klona(script);
  copied_script.id = uuidv4();
  copied_script.enabled = false;
  switch (target) {
    case 'global':
      useGlobalScriptsStore().script_trees.push(copied_script);
      break;
    case 'character':
      useCharacterScriptsStore().script_trees.push(copied_script);
      break;
    case 'preset':
      usePresetScriptsStore().script_trees.push(copied_script);
      break;
  }
};
</script>
