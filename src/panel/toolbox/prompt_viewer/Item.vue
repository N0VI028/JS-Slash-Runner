<template>
  <!-- prettier-ignore -->
  <div class="mb-1 rounded-md border border-(--SmartThemeBorderColor) p-1 text-(--SmartThemeBodyColor)">
    <div class="flex cursor-pointer items-center justify-between rounded-md rounded-b-none">
      <span>
        Role: <span>{{ role }}</span> | Token: <span>{{ token }}</span>
      </span>
      <div class="fa-solid fa-circle-chevron-down"></div>
    </div>
    <Divider class="hidden" />
    <div
      class="
        mt-0.5 hidden max-h-[40%] overflow-x-hidden overflow-y-auto rounded-b-md leading-[1.4] break-words
        whitespace-pre-wrap text-(--mainFontSize)
      "
    >
      <span>{{ content }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  role: string;
  token: number;
  content: string;
}>();
</script>