<template>
  <div>{{ name }}</div>
  <template v-if="!collapsed">
    <template v-for="(_item, index) in content" :key="index">
      <!-- TODO: 注意数组的索引不可被修改, 是否要给 Card 加一个 immutable 属性来区分? -->
      <Card v-model:content="content[index]" :name="index" />
    </template>
  </template>
</template>

<script setup lang="ts">
import Card from '@/panel/toolbox/variable_manager/Card.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any[]>('content', { required: true });

withDefaults(
  defineProps<{
    collapsed?: boolean;
  }>(),
  {
    collapsed: true,
  },
);
</script>
