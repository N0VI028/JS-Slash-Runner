<template>
  <CardBase
    v-model:name="name"
    v-model:content="content"
    v-model:collapsed="isCollapsed"
    :depth="props.depth"
    :type-label="`${t`Array`} · ${content.length}`"
    icon="fa-solid fa-list"
    @delete="emitDelete"
  >
    <VueDraggable
      v-model="content"
      class="vm-card-array__items"
      direction="vertical"
      handle=".vm-card-array__handle"
      :animation="150"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      :ghost-class="'vm-card-array__ghost'"
      :chosen-class="'vm-card-array__chosen'"
    >
      <div
        v-for="(_item, index) in content"
        :key="itemKeys[index]"
        class="vm-card-array__row"
        :data-id="itemKeys[index]"
      >
        <div class="vm-card-array__handle text-sm" title="拖拽调整顺序">☰</div>
        <CardMode
          v-model:content="content[index]"
          :name="index"
          :depth="nextDepth"
          :as-child="true"
          @delete="removeItem(index)"
        />
      </div>
      <div v-if="content.length === 0" class="vm-card-array__empty">暂无元素</div>
    </VueDraggable>
  </CardBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';

import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any[]>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: any[] }): void;
}>();

const props = withDefaults(
  defineProps<{
    collapsed?: boolean;
    depth?: number;
  }>(),
  {
    collapsed: true,
    depth: 0,
  },
);

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

const DRAG_KEY_SYMBOL = Symbol('vmCardArrayDragKey');
let dragKeySeed = 0;
const primitiveKeyBuckets = new Map<string, string[]>();

const createDragKey = () => `vm-card-array-item-${++dragKeySeed}`;

const ensureObjectKey = (value: Record<PropertyKey, unknown>): string => {
  const existing = Reflect.get(value, DRAG_KEY_SYMBOL) as string | undefined;
  if (existing) return existing;
  const key = createDragKey();
  Object.defineProperty(value, DRAG_KEY_SYMBOL, {
    value: key,
    enumerable: false,
    configurable: false,
  });
  return key;
};

const ensurePrimitiveKey = (bucketKey: string, order: number): string => {
  const bucket = primitiveKeyBuckets.get(bucketKey) ?? [];
  if (!bucket[order]) {
    bucket[order] = createDragKey();
    primitiveKeyBuckets.set(bucketKey, bucket);
  }
  return bucket[order];
};

const itemKeys = computed(() => {
  const usage = new Map<string, number>();
  return content.value.map(item => {
    if (item !== null && (typeof item === 'object' || typeof item === 'function')) {
      return ensureObjectKey(item as Record<PropertyKey, unknown>);
    }
    const bucketKey = `${typeof item}:${String(item)}`;
    const order = usage.get(bucketKey) ?? 0;
    usage.set(bucketKey, order + 1);
    return ensurePrimitiveKey(bucketKey, order);
  });
});

const removeItem = (index: number) => {
  content.value.splice(index, 1);
};
</script>

<style scoped>
.vm-card-array__items {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
}

.vm-card-array__row {
  display: flex;
  align-items: stretch;
  gap: 6px;
  /* 确保行本身也左对齐 */
  margin: 0;
  padding: 0;
}

.vm-card-array__handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 4px;
  color: var(--SmartThemeBodyColor);
  cursor: grab;
  user-select: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.vm-card-array__handle:hover {
  color: var(--SmartThemeQuoteColor);
  background-color: color-mix(in srgb, var(--SmartThemeQuoteColor) 15%, transparent);
}

.vm-card-array__ghost {
  opacity: 0.6;
}

.vm-card-array__chosen {
  outline: 1px dashed var(--SmartThemeQuoteColor);
}

.vm-card-array__empty {
  text-align: center;
  color: var(--SmartThemeBodyColor);
  opacity: 0.6;
  padding: 8px 0;
}
</style>
