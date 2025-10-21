<template>
  <JsonEditor v-model="store.settings.variables" />
</template>

<script setup lang="ts">
import { usePresetSettingsStore } from '@/store/settings';

const store = usePresetSettingsStore();
</script>
