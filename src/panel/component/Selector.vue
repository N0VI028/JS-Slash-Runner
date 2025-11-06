<template>
  <div>
    <div class="my-0.5 th-text-md font-bold">{{ title }}</div>
    <div class="flex w-full flex-col flex-wrap gap-1 p-1" role="radiogroup">
      <label v-for="(option, index) in options" :key="index" class="inline-flex items-center gap-[5px]">
        <input v-model="result" type="radio" :value="option.value" />
        <span>{{ option.label }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
  options: { label: string; value: any }[];
}>();

const result = defineModel<any>();
</script>
