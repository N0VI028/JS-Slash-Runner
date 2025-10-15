<template>
  <component
    :is="resolvedComponent"
    v-show="isVisible"
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
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { matchesFilters } from '@/panel/toolbox/variable_manager/filter';
import { isSearching, nodeMatchesSearch } from '@/panel/toolbox/variable_manager/search';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any>('content', { required: true });

const props = withDefaults(
  defineProps<{
    depth?: number;
    asChild?: boolean;
    filters: FiltersState;
    searchInput: RegExp | null;
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

const filterDepth = computed(() => (props.asChild ? (props.depth ?? 0) : (props.depth ?? 0) + 1));

const filterMatched = computed(() => matchesFilters(content.value, props.filters, filterDepth.value));
const searchMatched = computed(() => {
  if (!isSearching(props.searchInput)) return true;
  const q = props.searchInput as string | RegExp;
  return nodeMatchesSearch(name.value as any, content.value, q);
});

const isVisible = computed(() => filterMatched.value && searchMatched.value);

const componentProps = computed(() => ({
  depth: props.depth ?? 0,
  filters: props.filters,
  searchInput: props.searchInput,
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
