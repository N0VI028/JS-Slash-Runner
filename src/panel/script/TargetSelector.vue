<template>
  <div>
    <div class="my-0.5 text-(length:--TH-FontSize-md) font-bold">{{ title }}</div>
    <div
      class="flex w-full flex-wrap justify-center gap-1.5 p-1"
      role="radiogroup"
    >
      <label v-for="option in options" :key="option.value" class="inline-flex items-center gap-[5px]">
        <input
          v-model="selected"
          type="radio"
          :value="option.value"
        />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type TargetSelection = 'global' | 'character' | 'preset';

interface Props {
  title: string;
  globalLabel?: string;
  characterLabel?: string;
  presetLabel?: string;
  currentPresetName?: string;
  modelValue?: TargetSelection;
}

interface TargetOption {
  label: string;
  value: TargetSelection;
}

const props = withDefaults(defineProps<Props>(), {
  globalLabel: '',
  characterLabel: '',
  presetLabel: '',
  currentPresetName: undefined,
  modelValue: 'global' as TargetSelection,
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: TargetSelection): void;
  (event: 'change', value: TargetSelection): void;
}>();

const options = computed<TargetOption[]>(() => {

  const items: TargetOption[] = [
    {  label: props.globalLabel, value: 'global' },
    {  label: props.characterLabel, value: 'character' },
    {  label: props.presetLabel, value: 'preset' },
  ];

  return items;
});

const selected = computed<TargetSelection>({
  get: () => props.modelValue ?? 'global',
  set: value => {
    emit('update:modelValue', value);
    emit('change', value);
  },
});

export type { TargetSelection };
</script>
