<template>
  <JsonEditor v-model="variables" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import { event_types } from '@sillytavern/script';

const variables = shallowRef<Record<string, any>>(get_variables_without_clone({ type: 'global' }));
useEventSourceOn(
  event_types.SETTINGS_UPDATED,
  _.debounce(() => {
    const new_variables = get_variables_without_clone({ type: 'global' });
    if (!_.isEqual(variables.value, new_variables)) {
      variables.value = new_variables;
    }
  }, 1000),
);

watchDebounced(
  variables,
  new_variables => {
    replaceVariables(toRaw(new_variables), { type: 'global' });
  },
  { debounce: 1000, deep: true },
);
</script>
