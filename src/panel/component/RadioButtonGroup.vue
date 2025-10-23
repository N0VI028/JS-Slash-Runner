<template>
  <div class="inline-flex">
    <div
      v-for="option in options"
      :key="option.value"
      class="TH-radio-button"
      :class="{ 'TH-radio-button--selected': modelValue === option.value }"
      :style="modelValue === option.value ? { color: textColor } : {}"
      @click="selectOption(option.value)"
    >
      {{ option.label }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { getSmartThemeQuoteTextColor } from '@/util/color';

const textColor = getSmartThemeQuoteTextColor();

interface RadioOption {
  value: string | number;
  label: string;
}

interface Props {
  options: RadioOption[];
  modelValue: string | number;
}

interface Emits {
  (e: 'update:modelValue', value: string | number): void;
}

const props = defineProps<Props>();

const emit = defineEmits<Emits>();

/**
 * 选择选项
 * @param value 选项值
 */
const selectOption = (value: string | number) => {
  if (props.modelValue === value) return;
  emit('update:modelValue', value);
};
</script>

<style lang="scss" scoped>
@reference "../../global.css";

.TH-radio-button {
  @apply relative p-[3px_5px] border border-(--grey5050a) cursor-pointer transition-all duration-200 ease-in-out th-text-sm whitespace-nowrap text-(--SmartThemeBodyColor);

  &--selected {
    @apply border-(--SmartThemeQuoteColor) bg-(--SmartThemeQuoteColor);
  }

  &:first-child {
    @apply rounded-l-sm;
  }

  &:last-child {
    @apply rounded-r-sm;
  }

  &:not(:first-child):not(:last-child) {
    @apply rounded-none;
  }

  /* 连接样式 - 相邻按钮之间的边框处理 */
  &:not(:first-child) {
    @apply -ml-px;
  }
}
</style>
