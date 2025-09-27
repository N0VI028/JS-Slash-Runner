<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="variable-list">
      <Editor v-model="variables" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';

const variables = defineModel<Record<string, any>>({ required: true });
</script>
