<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="variable-list">
      <template v-for="data in writable_variables" :key="data[0]">
        <Card v-model:name="data[0]" v-model:content="data[1]" />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const variables = defineModel<Record<string, any>>({ required: true });

const writable_variables = computed({
  get: () => Object.entries(variables.value),
  set: entries => {
    variables.value = Object.fromEntries(entries);
  },
});
</script>
