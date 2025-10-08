<template>
  <Editor v-model="variables" :filters="props.filters" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';

const props = defineProps<{
  filters: FiltersState;
}>();

const variables = shallowRef<Record<string, any>>(get_variables_without_clone({ type: 'chat' }));
useIntervalFn(() => {
  const new_variables = get_variables_without_clone({ type: 'chat' });
  if (!_.isEqual(variables.value, new_variables)) {
    variables.value = new_variables;
  }
}, 2000);

watchDebounced(
  variables,
  new_variables => {
    replaceVariables(toRaw(new_variables), { type: 'chat' });
  },
  { debounce: 1000 },
);
</script>
