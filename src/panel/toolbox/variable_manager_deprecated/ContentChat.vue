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

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput: RegExp | null;
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

const editorRef = ref<InstanceType<typeof Editor> | null>(null);
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
