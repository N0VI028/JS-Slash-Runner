<template>
  <div>{{ name }}</div>
  <template v-for="(_item, index) in content" :key="index">
    <!-- TODO: 如何处理索引 -->
    <!-- <Card v-model:name="index" v-model:content="content[index]" /> -->
  </template>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any[]>('content', { required: true });
</script>
