<template>
  <div>{{ name }}</div>
  <template v-for="data in writable_content" :key="data[0]">
    <Card v-model:name="data[0]" v-model:content="data[1]" />
  </template>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<Record<string, any>>('content', { required: true });

const writable_content = computed({
  get: () => Object.entries(content.value),
  set: entries => {
    content.value = Object.fromEntries(entries);
  },
});
</script>
