<template>
  <div class="my-0.75 rounded-sm bg-(--SmartThemeQuoteColor) p-0.75 text-(length:--TH-FontSize-sm)">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-between gap-0.75">
        <div class="flex flex-1 items-center">
          <input v-model="min_message_id" type="number" class="TH-floor-input" min="0" :max="chat.length - 1" />
          <span class="mx-0.5 text-(--SmartThemeBodyColor)">~</span>
          <input v-model="max_message_id" type="number" class="TH-floor-input" min="0" :max="chat.length - 1" />
        </div>
        <!-- prettier-ignore-attribute -->
        <button
          id="floor-filter-btn"
          class="
            flex items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75 py-0.25
            text-(length:--TH-FontSize-sm)
            text-(--SmartThemeTextColor)
          "
        >
          <i class="fa-solid fa-check"></i>
          <span>确认</span>
        </button>
      </div>
      <div id="floor-filter-error" class="py-0.25 text-(length:--TH-FontSize-sm) text-(--warning)">
        最大楼层不能小于最小楼层
      </div>
    </div>
  </div>

  <template v-for="message_id in message_range" :key="message_id">
    <!-- TODO: 从 message_id 获取 variables -->
    <Editor v-model="variables" />
  </template>
</template>

<script setup lang="ts">
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import { chat } from '@sillytavern/script';

const min_message_id = ref(0);
const max_message_id = ref(0);
const message_range = computed(() => _.range(min_message_id.value, max_message_id.value + 1));

const variables = ref<Record<string, any>>({
  字符串: '字符串',
  数值: 123,
  布尔: true,
  对象: {
    a: 1,
    b: 2,
  },
  数组: [1, 2, 3],
});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-floor-input {
  @apply w-full h-2 rounded-sm bg-(--SmartThemeQuoteColor) px-1 py-0.5 text-(--SmartThemeTextColor);
}
</style>
