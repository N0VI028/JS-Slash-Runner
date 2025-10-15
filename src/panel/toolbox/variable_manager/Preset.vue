<template>
  <JsonEditor v-model="settings.variables" />
</template>

<script setup lang="ts">
import { usePresetSettingsStore } from '@/store/settings';

const settings = toRef(usePresetSettingsStore(), 'settings');
</script>
