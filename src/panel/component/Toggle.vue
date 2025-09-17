<template>
  <div class="relative inline-block h-1 w-2">
    <input :id="props.id" v-model="model" type="checkbox" class="opacity-0" />
    <label
      :for="props.id"
      class="absolute top-0 right-0 bottom-0 left-0 cursor-pointer rounded-full bg-gray-300 transition-all duration-300 checked:bg-[var(--SmartThemeQuoteColor)] focus:shadow-[0_0_1px_var(--SmartThemeQuoteColor)]"
    >
      <span
        class="absolute bottom-0.25 left-0.25 h-0.75 w-0.75 rounded-full bg-white transition-all duration-300 content-[''] checked:translate-x-1"
      ></span>
    </label>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
const props = defineProps<{ id: string }>();
</script>
