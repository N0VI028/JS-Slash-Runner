<template>
  <Editor v-model="settings.variables" :filters="props.filters" :current-view="props.currentView" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { useCharacterSettingsStore } from '@/store/settings';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
}>();

const settings = toRef(useCharacterSettingsStore(), 'settings');
</script>
