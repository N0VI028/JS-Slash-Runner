<template>
  <!-- prettier-ignore -->
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
      class="mt-0.5 flex min-w-0 flex-col gap-0.5 p-0"
      direction="vertical"
      handle=".vm-card-array__handle"
      :animation="150"
      :force-fallback="true"
      :fallback-offset="{ x: 0, y: 0 }"
      :fallback-on-body="true"
      :ghost-class="'opacity-60'"
      :chosen-class="'outline outline-1 outline-dashed outline-[var(--SmartThemeQuoteColor)]'"
    >
      <div
        v-for="(_item, index) in content"
        v-show="itemVisibility[index]"
        :key="itemKeys[index]"
        class="flex min-w-0 items-stretch gap-0.5 p-0"
        :data-id="itemKeys[index]"
      >
        <div
          class="
            inline-flex flex-shrink-0 cursor-grab items-center justify-center rounded text-sm
            text-[var(--SmartThemeBodyColor)] transition-colors duration-200 ease-in-out select-none
            hover:bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_15%,transparent)]
            hover:text-[var(--SmartThemeQuoteColor)]
          "
          title="拖拽调整顺序"
        >
          ☰
        </div>
        <CardMode
          v-model:content="content[index]"
          :name="index"
          :depth="nextDepth"
          :filters="props.filters"
          :as-child="true"
          @delete="removeItem(index)"
        />
      </div>
      <div v-if="content.length === 0" class="px-0 py-2 text-center text-[var(--SmartThemeBodyColor)] opacity-60">
        暂无元素
      </div>
    </VueDraggable>
  </CardBase>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';

import CardBase from '@/panel/toolbox/variable_manager/Card.vue';
import CardMode from '@/panel/toolbox/variable_manager/CardMode.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { matchesFilters } from '@/panel/toolbox/variable_manager/filter';

const name = defineModel<number | string>('name', { required: true });
const content = defineModel<any[]>('content', { required: true });

const emit = defineEmits<{
  (e: 'delete', payload: { name: number | string; content: any[] }): void;
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

const itemVisibility = computed(() => content.value.map(item => matchesFilters(item, props.filters, nextDepth.value)));

const removeItem = (index: number) => {
  content.value.splice(index, 1);
};
</script>
