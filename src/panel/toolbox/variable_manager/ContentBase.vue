<template>
  <div class="flex-1 overflow-y-auto p-1">
    <div class="variable-list">
      <Card name="示例变量" content="示例值" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const variables = defineModel<Record<string, any>>({});
</script>
