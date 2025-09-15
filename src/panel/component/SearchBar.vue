<template>
  <div class="width100p flex-container alignItemsCenter">
    <div style="position: relative; flex: 1 1 auto; min-width: 0">
      <input
        :value="input"
        :placeholder="placeholder"
        class="text_pole width100p"
        style="padding-right: 28px"
        type="text"
        @input="onInput"
      />
      <button
        v-if="clearable && input.length > 0"
        class="tavern-helper-SearchBar--clear_search alignItemsCenter justifyContentCenter flex"
        title="清除"
        @click="input = ''"
      >
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
    <i class="tavern-helper-SearchBar--search_icon fa-solid fa-search"></i>
  </div>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core';

const input = defineModel<string>({ required: true });
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
    input.value = (event.target as HTMLInputElement).value;
  },
  () => props.debounce,
);
</script>

<style lang="scss">
.tavern-helper-SearchBar--clear_search {
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  height: calc(var(--mainFontSize) * 1.5);
  width: calc(var(--mainFontSize) * 1.5);
  opacity: 0.8;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 2;
  color: var(--SmartThemeBodyColor);
}

.tavern-helper-SearchBar--search_icon {
  margin-left: 6px;
  color: var(--SmartThemeBodyColor);
  opacity: 0.6;
  cursor: pointer;
}
</style>
