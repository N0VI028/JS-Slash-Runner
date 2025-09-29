<template>
  <div class="flex w-full flex-wrap items-center gap-0.5">
    <div class="relative flex min-w-0 flex-1">
      <input :placeholder="placeholder" class="text_pole w-full pr-2! pl-2!" type="text" @input="onInput" />
      <!-- prettier-ignore-attribute -->
      <i
        class="
          fa-solid fa-search pointer-events-none absolute top-1/2 left-0.5 z-1 -translate-y-[50%]
          text-(--SmartThemeBodyColor) opacity-60
        "
      ></i>
      <!-- prettier-ignore-attribute -->
      <button
        v-if="clearable && input !== ''"
        class="
          absolute top-1/2 right-0.5 z-2 flex h-1.5 w-1.5 -translate-y-[50%] cursor-pointer border-none bg-transparent
          text-(--SmartThemeBodyColor) opacity-80
        "
        title="清除"
        @click="input = ''"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { regexFromString } from '@sillytavern/scripts/utils';

const input = defineModel<string | RegExp>({ required: true });
const props = withDefaults(
  defineProps<{
    placeholder?: string;
    debounce?: number;
    clearable?: boolean;
  }>(),
  {
    placeholder: '请输入文本...',
    debounce: 300,
    clearable: true,
  },
);

const onInput = useDebounceFn(
  (event: Event) => {
    const result = (event.target as HTMLInputElement).value;
    input.value = result.startsWith('/') ? (regexFromString(result) ?? result) : result;
  },
  () => props.debounce,
);
</script>

<style lang="scss" scoped>
.fa-xmark:before {
  vertical-align: sub;
}
</style>
