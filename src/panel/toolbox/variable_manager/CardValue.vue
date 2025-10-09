<template>
  <CardBase
    v-model:name="name"
    v-model:content="content"
    v-model:collapsed="isCollapsed"
    :depth="props.depth"
    :type-label="
      contentType === 'string'
        ? t`String`
        : contentType === 'number'
          ? t`Number`
          : contentType === 'boolean'
            ? t`Boolean`
            : t`Null`
    "
    :icon="
      contentType === 'string'
        ? 'fa-regular fa-font'
        : contentType === 'number'
          ? 'fa-solid fa-hashtag'
          : contentType === 'boolean'
            ? 'fa-solid fa-toggle-on'
            : 'fa-regular fa-circle-dot'
    "
    collapsible
    @delete="emitDelete"
  >
    <div v-show="!isCollapsed" class="vm-card-value__value mt-0.25 break-all text-(--SmartThemeBodyColor)">
      {{ formattedValue }}
    </div>
  </CardBase>
</template>

<script setup lang="ts">
import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import { computed, ref, watch } from 'vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: any }): void;
}>();

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    depth?: number;
  }>(),
  {
    collapsed: false,
    depth: 0,
  },
);

const isCollapsed = ref(props.collapsed ?? false);

watch(
  () => props.collapsed,
  value => {
    if (value === undefined) return;
    if (value !== isCollapsed.value) {
      isCollapsed.value = value;
    }
  },
);

type ContentType = 'string' | 'number' | 'boolean' | 'nil';

const emitDelete = () => {
  emit('delete', {
    name: name.value,
    content: content.value,
  });
};

const contentType = computed<ContentType>(() => {
  const v = content.value;
  if (v === null || v === undefined) return 'nil';
  const t = typeof v;
  if (t === 'string' || t === 'number' || t === 'boolean') return t;
  // 兜底为字符串展示
  return 'string';
});

const formattedValue = computed(() => {
  const v = content.value;
  switch (contentType.value) {
    case 'string':
      return v === '' ? '""' : String(v);
    case 'number':
      return v;
    case 'boolean':
      return v ? 'true' : 'false';
    case 'nil':
      return v === null ? 'null' : 'undefined';
    default:
      return String(v);
  }
});
</script>

<style scoped>
.vm-card-value__value {
  word-wrap: break-word;
  overflow-wrap: break-word;
  white-space: normal;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .vm-card-value__value {
    font-size: 0.85rem;
    line-height: 1.4;
  }
}

@media (max-width: 480px) {
  .vm-card-value__value {
    font-size: 0.8rem;
    line-height: 1.35;
  }
}
</style>
