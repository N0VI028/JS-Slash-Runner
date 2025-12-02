<template>
  <JsonEditor v-model="variables" :schema="schemas_store.chat" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, getVariables, replaceVariables } from '@/function/variables';
import { useVariableSchemasStore } from '@/store/variable_schemas';

const schemas_store = useVariableSchemasStore();

const variables = shallowRef<Record<string, any>>(getVariables({ type: 'chat' }));
useIntervalFn(() => {
  const new_variables = get_variables_without_clone({ type: 'chat' });
  if (!_.isEqual(variables.value, new_variables)) {
    ignoreUpdates(() => {
      // 酒馆可能用 /flushvar 等直接修改对象内部, 因此要拷贝一份从而能被 _.isEqual 判定
      variables.value = klona(new_variables);
    });
  }
}, 2000);

const { ignoreUpdates } = watchIgnorable(variables, new_variables => {
  replaceVariables(klona(new_variables), { type: 'chat' });
});
</script>
