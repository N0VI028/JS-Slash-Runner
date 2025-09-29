<template>
  <Editor v-model="settings.variables" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import { usePresetSettingsStore } from '@/store/settings';

const settings = toRef(usePresetSettingsStore(), 'settings');
</script>
