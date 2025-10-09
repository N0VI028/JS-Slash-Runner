<template>
  <component
    :is="resolvedComponent"
    v-model:name="name"
    v-model:content="content"
    v-bind="componentProps"
    @save="handleSave"
    @delete="handleDelete"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import CardArray from '@/panel/toolbox/variable_manager/CardArray.vue';
import CardObject from '@/panel/toolbox/variable_manager/CardObject.vue';
import CardValue from '@/panel/toolbox/variable_manager/CardValue.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any>('content', { required: true });

const props = withDefaults(
  defineProps<{
    depth?: number;
    asChild?: boolean;
  }>(),
  {
    depth: 0,
    asChild: false,
  },
);

const detect = (value: any): 'array' | 'object' | 'primitive' => {
  if (Array.isArray(value)) return 'array';
  if (value !== null && typeof value === 'object') return 'object';
  return 'primitive';
};

const emit = defineEmits<{
  (e: 'save', payload: { name: number | string; content: any }): void;
  (e: 'delete', payload: { name: number | string; content: any }): void;
}>();

const cardKind = computed(() => detect(content.value));

const resolvedComponent = computed(() => {
  if (cardKind.value === 'array') return CardArray;
  if (cardKind.value === 'object') return CardObject;
  return CardValue;
});

const componentProps = computed(() => ({
  depth: props.depth ?? 0,
}));

const handleSave = () => {
  emit('save', {
    name: name.value,
    content: content.value,
  });
};

const handleDelete = () => {
  emit('delete', {
    name: name.value,
    content: content.value,
  });
};
</script>
