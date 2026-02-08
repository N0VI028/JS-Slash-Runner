<template>
  <div class="relative inline-block" :class="size_class">
    <input :id="props.id" v-model="model" type="checkbox" class="peer sr-only" />
    <!-- prettier-ignore-attribute -->
    <label
      :for="props.id"
      class="
        absolute inset-0 mt-0! cursor-pointer overflow-hidden rounded-full bg-gray-300 transition-all duration-300
        peer-checked:bg-(--SmartThemeQuoteColor)
        peer-focus:shadow-[0_0_1px_var(--SmartThemeQuoteColor)]
        after:absolute after:top-1/2 after:-translate-y-1/2 after:rounded-full after:bg-white after:transition-all
        after:duration-300 after:content-['']
      "
      :class="thumb_class"
    >
    </label>
  </div>
</template>

<script setup lang="ts">
type Size = 'xs' | 'sm' | 'base' | 'lg';

const model = defineModel<boolean>({ required: true });
const props = defineProps<{ id: string; size?: Size }>();

// 从 Item 组件注入尺寸，优先使用 props.size
const injected_size = inject<ComputedRef<Size> | undefined>('item-size', undefined);
const current_size = computed(() => props.size ?? injected_size?.value ?? 'base');

// 容器尺寸
const size_class = computed(() => {
  const map = { xs: 'h-0.75 w-1.5', sm: 'h-0.875 w-1.75', base: 'h-1 w-2', lg: 'h-1.25 w-2.5' };
  return map[current_size.value];
});

// 滑块尺寸与位置
const thumb_class = computed(() => {
  const map = {
    xs: 'after:left-[0.0625rem] after:h-0.625 after:w-0.625 peer-checked:after:left-auto peer-checked:after:right-[0.0625rem]',
    sm: 'after:left-[0.09375rem] after:h-[0.6875rem] after:w-[0.6875rem] peer-checked:after:left-auto peer-checked:after:right-[0.09375rem]',
    base: 'after:left-[0.125rem] after:h-0.75 after:w-0.75 peer-checked:after:left-auto peer-checked:after:right-[0.125rem]',
    lg: 'after:left-[0.15625rem] after:h-[0.9375rem] after:w-[0.9375rem] peer-checked:after:left-auto peer-checked:after:right-[0.15625rem]',
  };
  return map[current_size.value];
});
</script>
