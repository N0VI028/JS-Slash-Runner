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
import { computed } from 'vue';

import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import TreeMode from './TreeMode.vue';

const props = defineProps<{
  filters: FiltersState;
}>();

const variables = defineModel<Record<string, any>>({ required: true });

/**
 * 为变量创建历史记录管理
 * 配置深度监听、容量限制和克隆选项
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
</script>
