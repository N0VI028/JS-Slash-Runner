<template>
  <DefineEntry>
    <template #default="{ title, description, buttonId, buttonText }">
      <div class="flex w-full items-center justify-between" style="cursor: pointer">
        <div class="flex flex-col">
          <div class="font-bold text-(--TH-FontSize)">{{ title }}</div>
          <div class="mt-0.25 text-(length:--TH-FontSizeSm) opacity-70">{{ description }}</div>
        </div>
        <div :id="buttonId" class="TH-button">{{ buttonText }}</div>
      </div>
    </template>
  </DefineEntry>

  <div class="flex flex-col gap-1">
    <div class="rounded-md border border-(--grey5050a) p-1">
      <ReuseEntry
        :title="t`提示词查看器`"
        :description="t`查看提示词发送情况`"
        button-id="open-prompt-view"
        :button-text="t`打开`"
      />
    </div>

    <div class="rounded-md border border-(--grey5050a) p-1">
      <ReuseEntry
        :title="t`变量管理器`"
        :description="t`查看和管理变量`"
        button-id="open-variable-manager"
        :button-text="t`打开`"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core';

const [DefineEntry, ReuseEntry] = createReusableTemplate<{
  title: string;
  description: string;
  buttonId: string;
  buttonText: string;
}>();
</script>

<style scoped></style>
