<template>
  <!-- prettier-ignore -->
  <div
    class="
      relative mb-1 flex flex-col gap-0.25 overflow-hidden rounded-sm bg-(--SmartThemeChatTintColor) p-0.5
      text-(length:--TH-FontSize-sm)
    "
  >
    <div class="flex items-center justify-between gap-0.5">
      <div class="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
        <i class="fa-regular fa-code flex-shrink-0"></i>
        <input
          type="text"
          class="
            min-w-0 flex-1 border-none! bg-transparent!
            text-(length:--TH-FontSize-sm)!
            font-bold text-(--SmartThemeBodyColor)!
          "
          value="{{name}}"
        />
      </div>
      <div class="flex flex-shrink-0 gap-0.75">
        <div class="cursor-pointer border-none bg-none" title="{{t`保存`}}">
          <i class="fa-regular fa-save"></i>
        </div>
        <div class="cursor-pointer border-none bg-none" title="{{t`删除`}}">
          <i class="fa-regular fa-trash-can"></i>
        </div>
      </div>
    </div>
    <input :value="content" class="text-(length:--TH-FontSize-sm)!" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(
  defineProps<{
    name: string;
    content: string;
  }>(),
  {
    name: '{{t`未命名变量`}}',
    content: '{{t`暂无变量值`}}',
  },
);

const name = ref(props.name);
const content = ref(props.content);
</script>
