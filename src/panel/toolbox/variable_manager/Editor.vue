<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="h-full w-full">
      <template v-if="writable_variables.length > 0 || props.currentView === 'text'">
        <TreeMode v-if="props.currentView === 'tree'" v-model:data="variables" :filters="props.filters" />
        <template v-else-if="props.currentView === 'card'">
          <template v-for="data in writable_variables" :key="data[0]">
            <CardMode v-model:name="data[0]" v-model:content="data[1]" @delete="removeVariable($event.name)" />
          </template>
        </template>
        <TextMode v-else-if="props.currentView === 'text'" v-model:data="variables" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRefHistory } from '@vueuse/core';
import { computed } from 'vue';

import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import TextMode from '@/panel/toolbox/variable_manager/TextMode.vue';
import TreeMode from '@/panel/toolbox/variable_manager/TreeMode.vue';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
}>();

const variables = defineModel<Record<string, any>>({ required: true });

/**
 * 涓哄彉閲忓垱寤哄巻鍙茶褰曠鐞? * 閰嶇疆娣卞害鐩戝惉銆佸閲忛檺鍒跺拰鍏嬮殕閫夐」
 */
const { history, commit, undo, redo, canUndo, canRedo } = useRefHistory(variables, {
  deep: true,
  clone: true,
  capacity: 20,
  flush: 'post',
});

watchDebounced(variables, () => commit(), { debounce: 300, deep: true });

defineExpose({
  undo,
  redo,
  canUndo,
  canRedo,
  history,
});

const writable_variables = computed({
  get: () => Object.entries(variables.value),
  set: entries => {
    variables.value = Object.fromEntries(entries);
  },
});

const removeVariable = (nameToRemove: string | number) => {
  const target = String(nameToRemove);
  writable_variables.value = writable_variables.value.filter(([key]) => String(key) !== target);
};
</script>
