<template>
  <JsonEditor v-model="store.settings.variables" :schema="schemas_store.preset" />
</template>

<script setup lang="ts">
import { usePresetSettingsStore } from '@/store/settings';
import { useVariableSchemasStore } from '@/store/variable_schemas';

const schemas_store = useVariableSchemasStore();
const store = usePresetSettingsStore();
</script>
