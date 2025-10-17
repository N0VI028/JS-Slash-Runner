<template>
  <span>第 {{ normalizedMessageId }} 楼</span>
  <JsonEditor v-model="variables" />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';

const props = defineProps<{
  messageId: number;
  normalizedMessageId: number;
}>();

const variables = shallowRef<Record<string, any>>(
  get_variables_without_clone({ type: 'message', message_id: props.messageId }),
);
useIntervalFn(() => {
  const new_variables = get_variables_without_clone({ type: 'message', message_id: props.messageId });
  if (!_.isEqual(variables.value, new_variables)) {
    pause();
    variables.value = new_variables;
    resume();
  }
}, 2000);

const { pause, resume } = watchPausable(variables, new_variables => {
  replaceVariables(klona(new_variables), { type: 'message', message_id: props.messageId });
});
</script>
