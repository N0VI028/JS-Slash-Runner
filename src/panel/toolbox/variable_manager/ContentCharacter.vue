<template>
  <Editor v-model="settings.variables" :filters="props.filters" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import { useCharacterSettingsStore } from '@/store/settings';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';

const props = defineProps<{
  filters: FiltersState;
}>();

const settings = toRef(useCharacterSettingsStore(), 'settings');
</script>
