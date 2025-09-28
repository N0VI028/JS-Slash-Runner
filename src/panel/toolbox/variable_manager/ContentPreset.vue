<template>
  <Editor v-model="variables" />
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';

const variables = ref<Record<string, any>>({
  字符串: '字符串',
  数值: 123,
  布尔: true,
  对象: {
    a: 1,
    b: 2,
  },
  数组: [1, 2, 3],
});
</script>
