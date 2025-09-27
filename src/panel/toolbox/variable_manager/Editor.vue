<template>
  <template v-for="data in writable_variables" :key="data[0]">
    <Card v-model:name="data[0]" v-model:content="data[1]" />
  </template>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const variables = defineModel<Record<string, any>>({ required: true });

// TODO: 在这里 debounce 还是在 ContentGlobal 等中?
const writable_variables = computed({
  get: () => Object.entries(variables.value),
  set: entries => {
    variables.value = Object.fromEntries(entries);
  },
});
</script>
