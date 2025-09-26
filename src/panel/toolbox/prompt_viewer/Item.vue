<template>
  <div class="mb-1 rounded-md border border-(--SmartThemeBorderColor) p-1 text-(--SmartThemeBodyColor)">
    <div
      class="flex cursor-pointer items-center justify-between rounded-md rounded-b-none"
      @click="is_expanded = !is_expanded"
    >
      <span>
        Role: <span>{{ prompt.role }}</span> | Token: <span>{{ prompt.token }}</span>
      </span>
      <div class="fa-solid fa-circle-chevron-down"></div>
    </div>
    <template v-if="is_expanded">
      <Divider />
      <!-- prettier-ignore-attribute -->
      <div
        class="
          mt-0.5 max-h-[40%] overflow-x-hidden overflow-y-auto rounded-b-md leading-[1.4] break-words
          whitespace-pre-wrap text-(--mainFontSize)
        "
      >
        <span>{{ prompt.content }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { PromptData } from '@/panel/toolbox/prompt_viewer/type';

defineProps<{ prompt: PromptData }>();

const is_expanded = ref<boolean>(false);
</script>
