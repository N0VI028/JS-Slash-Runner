<template>
  <div>{{ name }}</div>
  <div>{{ content }}</div>
</template>

<script setup lang="ts">
const name = defineModel<number | string>('name', { required: true });
const content = defineModel<string>('content', { required: true });
</script>
