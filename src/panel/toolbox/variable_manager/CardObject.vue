<template>
  <CardBase
    v-model:name="name"
    v-model:content="content"
    v-model:collapsed="isCollapsed"
    :depth="props.depth"
    :type-label="t`Object`"
    icon="fa-regular fa-folder-open"
    @delete="emitDelete"
  >
    <div class="mt-0.5 flex min-w-0 flex-col gap-0.5 p-0">
      <template v-for="data in writable_content" :key="data[0]">
        <CardMode
          v-model:name="data[0]"
          v-model:content="data[1]"
          :depth="nextDepth"
          :filters="props.filters"
          :as-child="true"
          @delete="removeField(data[0])"
        />
      </template>
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<Record<string, any>>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: Record<string, any> }): void;
}>();

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    depth?: number;
    filters: FiltersState;
  }>(),
  {
    collapsed: true,
    depth: 0,
  },
);

const writable_content = computed({
  get: () => Object.entries(content.value),
  set: entries => {
    content.value = Object.fromEntries(entries);
  },
});

const isCollapsed = ref(props.collapsed ?? true);

watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

const emitDelete = () => {
  emit('delete', {
    name: name.value,
    content: content.value,
  });
};

const nextDepth = computed(() => (props.depth ?? 0) + 1);

const removeField = (fieldKey: string) => {
  const entries = Object.entries(content.value).filter(([key]) => key !== fieldKey);
  content.value = Object.fromEntries(entries);
};
</script>
