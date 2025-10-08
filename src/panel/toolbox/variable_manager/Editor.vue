<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="variable-list">
      <template v-if="writable_variables.length > 0">
        <!-- <template v-for="data in writable_variables" :key="data[0]"> -->
        <TreeMode v-model:data="variables" :filters="props.filters" />
        <!-- <Card v-model:name="data[0]" v-model:content="data[1]" /> -->
        <!-- </template> -->
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRefHistory } from '@vueuse/core';
import { computed, inject, onBeforeUnmount, onMounted } from 'vue';

import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { variableHistoryKey } from '@/panel/toolbox/variable_manager/historyControl';
import TreeMode from './TreeMode.vue';

const props = defineProps<{
  filters: FiltersState;
}>();

const variables = defineModel<Record<string, any>>({ required: true });

const writable_variables = computed({
  get: () => Object.entries(variables.value),
  set: entries => {
    variables.value = Object.fromEntries(entries);
  },
});

const { undo, redo, canUndo, canRedo, clear, commit } = useRefHistory(variables, {
  deep: true,
  clone: true,
  capacity: 10,
});

const historyContext = inject(variableHistoryKey, null);

const registerController = () => {
  if (!historyContext) return;
  historyContext.setController({
    canUndo,
    canRedo,
    undo: () => {
      if (canUndo.value) {
        undo();
      }
    },
    redo: () => {
      if (canRedo.value) {
        redo();
      }
    },
    clear,
    commit,
  });
};

onMounted(() => {
  registerController();
});

onBeforeUnmount(() => {
  historyContext?.setController(null);
});
</script>
