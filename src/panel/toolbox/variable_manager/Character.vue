<template>
  <JsonEditor v-model="settings.variables" />
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';

const settings = toRef(useCharacterSettingsStore(), 'settings');
</script>
