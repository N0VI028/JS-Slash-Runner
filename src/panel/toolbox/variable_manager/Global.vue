<template>
  <JsonEditor v-model="variables" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import { event_types } from '@sillytavern/script';

const variables = shallowRef<Record<string, any>>(get_variables_without_clone({ type: 'global' }));
useEventSourceOn(event_types.SETTINGS_UPDATED, () => {
  const new_variables = get_variables_without_clone({ type: 'global' });
  if (!_.isEqual(variables.value, new_variables)) {
    pause();
    variables.value = new_variables;
    resume();
  }
});

const { pause, resume } = watchPausable(variables, new_variables => {
  replaceVariables(klona(new_variables), { type: 'global' });
});
</script>
