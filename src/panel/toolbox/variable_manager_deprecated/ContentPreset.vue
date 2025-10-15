<template>
  <Editor
    ref="editorRef"
    v-model="settings.variables"
    :filters="props.filters"
    :current-view="props.currentView"
    :search-input="props.searchInput"
  />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import type { RootVariablePayload } from '@/panel/toolbox/variable_manager/types';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { usePresetSettingsStore } from '@/store/settings';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput: RegExp | null;
}>();

const settings = toRef(usePresetSettingsStore(), 'settings');

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
