<template>
  <div class="text-sm select-text">
    <div class="flex items-center gap-0.25 py-0.25" :style="indentStyle">
      <span
        v-if="!isPrimitive"
        class="inline-flex shrink-0 cursor-pointer items-center justify-center text-sm leading-none select-none"
        :style="toggleContainerStyle"
        @click="toggleCollapse"
      >
        <svg
          :style="{ transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)' }"
          class="transition-transform duration-200"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M4.5 2L8.5 6L4.5 10V2Z" />
        </svg>
      </span>
      <span v-else class="inline-block shrink-0" :style="toggleContainerStyle"></span>

      <span v-if="nodeKey !== null" class="mr-0.25 self-start text-(--SmartThemeQuoteColor)">
        {{ nodeKey }}:
      </span>

      <span v-if="isPrimitive" :class="['break-words whitespace-pre-wrap', valueTypeClass]">
        {{ valuePreview }}
      </span>

      <span v-else class="flex cursor-pointer items-center gap-0.5" @click="toggleCollapse">
        <span class="font-bold text-gray-500">{{ isArray ? '[' : '{' }}</span>
        <span v-if="collapsed" class="text-gray-500 italic">{{ valuePreview }}</span>
        <span v-if="collapsed" class="font-bold text-gray-500">{{ isArray ? ']' : '}' }}</span>
      </span>
    </div>

    <template v-if="!isPrimitive && !collapsed">
      <TreeMode
        v-for="[key, value] in entries"
        :key="key"
        :data="value as any"
        :path="[...path, key]"
        :depth="depth + 1"
        :node-key="key"
      />
      <div class="flex items-center gap-0.5 text-black" :style="indentStyle">
        <span class="font-bold text-gray-500">{{ isArray ? ']' : '}' }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

defineOptions({ name: 'TreeMode' });

type Primitive = string | number | boolean | null | undefined;

const props = withDefaults(
  defineProps<{
    data: Record<string, unknown> | unknown[] | Primitive;
    path?: (string | number)[];
    depth?: number;
    nodeKey?: string | number | null;
  }>(),
  {
    path: () => [],
    depth: 0,
    nodeKey: null,
  },
);

const collapsed = ref((props.depth ?? 0) > 1);

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};

const isObject = computed(() => {
  return props.data !== null && typeof props.data === 'object' && !Array.isArray(props.data);
});

const isArray = computed(() => Array.isArray(props.data));

const isPrimitive = computed(() => !isObject.value && !isArray.value);

const valueType = computed(() => {
  if (props.data === null) return 'null';
  if (Array.isArray(props.data)) return 'array';
  return typeof props.data;
});

const entries = computed(() => {
  if (isObject.value) {
    return Object.entries(props.data as Record<string, unknown>);
  }
  if (isArray.value) {
    return (props.data as unknown[]).map((item, index) => [index, item] as const);
  }
  return [];
});

const valuePreview = computed(() => {
  const value = props.data as Primitive | Record<string, unknown> | unknown[];

  if (value === null) return 'null';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'boolean') return value.toString();
  if (typeof value === 'number') return value.toString();

  if (Array.isArray(value)) {
    return `Array(${value.length})`;
  }
  if (typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>);
    return `Object {${keys.length} ${keys.length === 1 ? 'key' : 'keys'}}`;
  }

  return String(value);
});

const toggleWidth = 12;
const toggleGap = 2;

const toggleContainerStyle = computed(() => ({
  width: `${Math.max(toggleWidth - toggleGap, 0)}px`,
}));

const indentStyle = computed(() => `padding-left: ${props.depth * 3}px`);

const valueTypeClass = computed(() => {
  const type = valueType.value;
  if (type === 'string') return 'text-(--SmartThemeBodyColor)';
  if (type === 'number') return 'text-(--SmartThemeEmColor)';
  if (type === 'boolean') return 'text-(--SmartThemeUnderlineColor)';
  if (type === 'null') return 'text-gray-500';
  return '';
});
</script>
