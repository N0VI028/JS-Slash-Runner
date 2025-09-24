<template>
  <div class="relative inline-block h-1 w-2">
    <input :id="props.id" v-model="model" type="checkbox" class="peer sr-only" />
    <!-- prettier-ignore-attribute -->
    <label
      :for="props.id"
      class="
        absolute inset-0 cursor-pointer overflow-hidden rounded-full bg-gray-300 transition-all duration-300
        peer-checked:bg-[var(--SmartThemeQuoteColor)]
        peer-focus:shadow-[0_0_1px_var(--SmartThemeQuoteColor)]
        after:absolute after:top-1/2 after:left-[0.125rem] after:h-0.75 after:w-0.75 after:-translate-y-1/2
        after:rounded-full after:bg-white after:transition-all after:duration-300 after:content-['']
        peer-checked:after:right-[0.125rem] peer-checked:after:left-auto
      "
    >
    </label>
  </div>
</template>

<script setup lang="ts">
const model = defineModel<boolean>({ required: true });
const props = defineProps<{ id: string }>();
</script>
