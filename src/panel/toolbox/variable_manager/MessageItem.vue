<template>
  <!-- prettier-ignore-attribute -->
  <div
    class="
      flex cursor-pointer items-center justify-between rounded-t-sm bg-(--SmartThemeQuoteColor)/20 px-0.5 py-0.25
      th-text-sm
    "
    @click="is_collapsed = !is_collapsed"
  >
    <span> {{ t`第 ${normalized_message_id} 楼` }} </span>
    <div class="flex items-center justify-center">
      <i class="fa-solid" :class="is_collapsed ? 'fa-chevron-down' : 'fa-chevron-up'"></i>
    </div>
  </div>
  <div v-show="!is_collapsed">
    <JsonEditor v-model="variables" :schema="schemas_store.message" />
  </div>
</template>

<script setup lang="ts">
import { get_variables_without_clone, getVariables, replaceVariables } from '@/function/variables';
import { useVariableSchemasStore } from '@/store/variable_schemas';
import { event_types } from '@sillytavern/script';

const props = defineProps<{
  chatLength: number;
  messageId: number;
  refreshKey: symbol;
}>();

const schemas_store = useVariableSchemasStore();

const normalized_message_id = computed(() =>
  props.messageId < 0 ? props.chatLength + props.messageId : props.messageId,
);

const internal_refresh_key = ref<symbol>(Symbol());
useEventSourceOn(
  [
    event_types.MESSAGE_UPDATED,
    event_types.MESSAGE_SWIPED,
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
  ],
  message_id => {
    if (Number(message_id) === normalized_message_id.value) {
      internal_refresh_key.value = Symbol();
    }
  },
);

const is_collapsed = ref(false);
const variables = shallowRef<Record<string, any>>(getVariables({ type: 'message', message_id: props.messageId }));
watch(
  () => [props.refreshKey, internal_refresh_key.value],
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
