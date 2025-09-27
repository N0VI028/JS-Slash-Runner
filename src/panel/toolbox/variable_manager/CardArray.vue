<template>
  <div>{{ name }}</div>
  <template v-for="(_item, index) in content" :key="index">
    <!-- QUESTION: 要传入索引吗? -->
    <Card v-model:content="content[index]" :name="index" />
  </template>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any[]>('content', { required: true });
</script>
