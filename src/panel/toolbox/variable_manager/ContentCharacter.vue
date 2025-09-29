<template>
  <Editor v-model="settings.variables" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import { useCharacterSettingsStore } from '@/store/settings';

const settings = toRef(useCharacterSettingsStore(), 'settings');
</script>
