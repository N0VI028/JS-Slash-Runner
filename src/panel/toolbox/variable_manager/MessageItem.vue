<template>
  <span>第 {{ messageId < 0 ? chatLength + messageId : messageId }} 楼</span>
  <JsonEditor v-model="variables" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, getVariables, replaceVariables } from '@/function/variables';

const props = defineProps<{
  chatLength: number;
  messageId: number;
  refreshKey: symbol;
}>();

const variables = shallowRef<Record<string, any>>(getVariables({ type: 'message', message_id: props.messageId }));
watch(
  () => props.refreshKey,
  () => {
    const new_variables = get_variables_without_clone({ type: 'message', message_id: props.messageId });
    if (!_.isEqual(variables.value, new_variables)) {
      ignoreUpdates(() => {
        // 用户可能用 delete 等直接修改对象内部, 因此要拷贝一份从而能被 _.isEqual 判定
        variables.value = klona(new_variables);
      });
    }
  },
);

const { ignoreUpdates } = watchIgnorable(variables, new_variables => {
  replaceVariables(klona(new_variables), { type: 'message', message_id: props.messageId });
});
</script>
