<template>
  <JsonEditor v-model="store.settings.variables" />
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';

const store = useCharacterSettingsStore();
</script>
