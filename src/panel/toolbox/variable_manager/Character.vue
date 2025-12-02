<template>
  <JsonEditor v-model="settings_store.settings.variables" :schema="schemas_store.character" />
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';
import { useVariableSchemasStore } from '@/store/variable_schemas';

const schemas_store = useVariableSchemasStore();
const settings_store = useCharacterSettingsStore();
</script>
