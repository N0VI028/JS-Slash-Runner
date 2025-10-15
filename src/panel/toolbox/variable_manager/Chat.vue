<template>
  <JsonEditor :content="variables" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';

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
