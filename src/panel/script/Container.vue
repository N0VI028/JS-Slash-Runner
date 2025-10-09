<template>
  <div class="mt-0.5 flex items-center justify-between">
    <div class="flex flex-col">
      <div class="flex items-center">
        <div class="font-bold">{{ props.title }}</div>
        <div class="ml-0.5 flex cursor-pointer items-center justify-center">
          <i class="fa-solid fa-cog"></i>
        </div>
      </div>
      <!-- prettier-ignore-attribute -->
      <div class="mt-0.25 text-sm opacity-70">{{ props.description }}</div>
    </div>
    <Toggle :id="`${props.title}-script-enable-toggle`" v-model="store.enabled" />
  </div>

  <div class="flex h-full flex-col overflow-hidden">
    <VueDraggable
      v-model="script_trees"
      group="scripts"
      handle=".TH-handle"
      class="flex flex-grow flex-col gap-[5px] overflow-y-auto py-0.5"
      :class="{ 'min-h-2': script_trees.length === 0 }"
      item-key="id"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      :data-container-type="props.storeType"
      direction="vertical"
      :disabled="searchInput !== ''"
    >
      <div v-for="(script, index) in script_trees" :key="script.id">
        <ScriptItem
          v-if="isScript(script_trees[index])"
          v-model="script_trees[index]"
          :search-input="props.searchInput"
          @delete="handleDelete"
        />
        <FolderItem v-else v-model="script_trees[index]" :search-input="props.searchInput" @delete="handleDelete" />
      </div>
      <div v-if="script_trees.length === 0" class="text-center opacity-50">{{ t`暂无脚本` }}</div>
    </VueDraggable>
  </div>
</template>

<script setup lang="ts">
import FolderItem from '@/panel/script/FolderItem.vue';
import ScriptItem from '@/panel/script/ScriptItem.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { isScript } from '@/type/scripts';
import { VueDraggable } from 'vue-draggable-plus';

const store = defineModel<ReturnType<typeof useGlobalScriptsStore>>({ required: true });

const props = defineProps<{
  title: string;
  description: string;
  searchInput: string | RegExp;
  storeType: 'global' | 'character' | 'preset';
}>();

const script_trees = toRef(store.value, 'script_trees');

const handleDelete = (id: string) => {
  _.remove(store.value.script_trees, script => script.id === id);
};
</script>
