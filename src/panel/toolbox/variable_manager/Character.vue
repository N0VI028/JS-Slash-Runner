<template>
  <JsonEditor :content="settings.variables" />
</template>

<script setup lang="ts">
import { useCharacterSettingsStore } from '@/store/settings';

const settings = toRef(useCharacterSettingsStore(), 'settings');
</script>
