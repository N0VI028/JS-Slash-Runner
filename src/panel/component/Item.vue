<template>
  <div
    class="flex items-center justify-between gap-0.75"
    :class="[
      type === 'collapsible' ? 'rounded-md border border-(--grey5050a) p-1' : 'items-center',
      { 'TH-collapsible flex-col items-center': has_detail },
    ]"
  >
    <DefineTemplate>
      <div class="flex flex-col">
        <div class="TH-Item-title font-bold text-(--mainFontSize)">
          <slot name="title" />
        </div>
        <div class="mt-0.25 text-(length:--TH-FontSizeSm) opacity-70">
          <slot name="description" />
        </div>
      </div>
      <slot name="content" />
    </DefineTemplate>

    <template v-if="!has_detail">
      <ReuseTemplate />
    </template>

    <template v-else>
      <div
        class="TH-collapsible-header flex w-full flex-wrap items-center justify-between gap-0.75"
        :class="{
          'justify-between': has_content,
        }"
      >
        <ReuseTemplate />
      </div>
      <div class="TH-collapsible-content flex w-full flex-wrap gap-0.75">
        <slot name="detail" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core';

const [DefineTemplate, ReuseTemplate] = createReusableTemplate();

withDefaults(
  defineProps<{
    type?: 'plain' | 'collapsible';
  }>(),
  { type: 'plain' },
);

const slots = useSlots();
const has_content = computed(() => !!slots.content);
const has_detail = computed(() => !!slots.detail);
</script>

<style scoped>
/* 可折叠组件样式 */
.TH-collapsible > div:first-child {
  cursor: pointer;
}

.TH-collapsible :deep(.TH-Item-title) {
  position: relative;
  cursor: pointer;
  padding-left: 15px;
}

.TH-collapsible :deep(.TH-Item-title::before) {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 0;
  height: 0;
  border-style: solid;
  border-width: calc(var(--mainFontSize) * 0.35) 0 calc(var(--mainFontSize) * 0.35) calc(var(--mainFontSize) * 0.5);
  border-color: transparent transparent transparent currentColor;
  transition: transform 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
  transform-origin: center;
}

.TH-collapsible.expanded :deep(.TH-Item-title::before) {
  transform: translateY(-50%) rotate(90deg);
}

.TH-collapsible-content {
  display: none;
  transform-origin: top;
  overflow: hidden;
}

.TH-collapsible.expanded .TH-collapsible-content {
  display: flex;
}

.TH-collapsible-content.animating {
  display: flex;
}

.TH-collapsible .flex.flex-col {
  cursor: pointer;
}
</style>
