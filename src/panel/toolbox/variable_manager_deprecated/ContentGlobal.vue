<template>
  <Editor
    ref="editorRef"
    v-model="variables"
    :filters="props.filters"
    :current-view="props.currentView"
    :search-input="props.searchInput"
  />
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager/types';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { event_types } from '@sillytavern/script';

const editorRef = ref<InstanceType<typeof Editor> | null>(null);

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput: RegExp | null;
}>();

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
  { debounce: 1000 },
);

const undo = () => editorRef.value?.undo();
const redo = () => editorRef.value?.redo();
const canUndo = computed(() => editorRef.value?.canUndo ?? false);
const canRedo = computed(() => editorRef.value?.canRedo ?? false);
const createRootVariable = (payload: RootVariablePayload) => editorRef.value?.createRootVariable(payload) ?? false;

defineExpose({
  undo,
  redo,
  canUndo,
  canRedo,
  createRootVariable,
});
</script>
