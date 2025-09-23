<template>
  <div
    ref="containerRef"
    class="flex items-center justify-between gap-0.75"
    :class="[
      type === 'box' ? 'rounded-md border border-(--grey5050a) p-1' : 'items-center',
      { 'TH-collapsible flex-col items-center': has_detail, expanded: has_detail && isExpanded },
    ]"
  >
    <DefineTemplate>
      <div class="flex min-w-0 flex-1 flex-col">
        <div class="TH-Item-title font-bold text-(--mainFontSize)">
          <slot name="title" />
        </div>
        <!-- prettier-ignore-attribute -->
        <div
          class="
            mt-0.25
            text-(length:--TH-FontSize-sm)
            opacity-70
          "
        >
          <slot name="description" />
        </div>
      </div>
      <div class="flex-none shrink-0" style="max-width: 30%">
        <slot name="content" />
      </div>
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
        @click="onHeaderClick"
      >
        <ReuseTemplate />
      </div>
      <div ref="contentRef" class="TH-collapsible-content flex w-full flex-wrap gap-0.75">
        <slot name="detail" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core';

const [DefineTemplate, ReuseTemplate] = createReusableTemplate();

const props = withDefaults(
  defineProps<{
    type?: 'plain' | 'box';
    initiallyExpanded?: boolean;
    duration?: number;
  }>(),
  {
    type: 'plain',
    initiallyExpanded: false,
    duration: 260,
  },
);

const slots = useSlots();
const has_content = computed(() => !!slots.content);
const has_detail = computed(() => !!slots.detail);

const isExpanded = ref<boolean>(props.initiallyExpanded);
const isAnimating = ref<boolean>(false);
const containerRef = ref<HTMLDivElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);

function onHeaderClick(event: MouseEvent) {
  if (!has_detail.value) return;
  if (shouldIgnoreClick(event)) return;
  toggle();
}

function shouldIgnoreClick(event: MouseEvent): boolean {
  const target = event.target as HTMLElement;
  if (!target) return false;

  const $closest = (selector: string) => target.closest(selector);

  // 忽略内容区域中的所有点击
  if ($closest('.TH-collapsible-content')) {
    return true;
  }

  return false;
}

function toggle() {
  if (isAnimating.value) return;
  if (isExpanded.value) {
    collapse();
  } else {
    expand();
  }
}

function expand() {
  if (isAnimating.value || isExpanded.value) return;
  const content = contentRef.value;
  const container = containerRef.value;
  if (!content || !container) return;

  isAnimating.value = true;
  container.classList.add('expanded');
  content.classList.add('animating');

  content.style.visibility = 'hidden';
  content.style.display = 'flex';
  content.style.overflow = 'hidden';
  content.style.height = '';
  content.style.opacity = '0';
  content.style.transform = 'translateY(-6px) scaleY(0.98)';
  content.style.willChange = 'height, opacity, transform';
  void content.offsetHeight;
  const fullHeight = content.scrollHeight;
  content.style.height = '0px';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
      content.style.transition = `height ${props.duration}ms ${easing}, opacity ${props.duration}ms ${easing}, transform ${props.duration}ms ${easing}`;
      content.style.visibility = '';
      content.style.height = `${fullHeight}px`;
      content.style.opacity = '1';
      content.style.transform = 'translateY(0) scaleY(1)';

      window.setTimeout(() => {
        content.style.transitionProperty = 'none';
        content.style.height = '';
        content.style.opacity = '';
        content.style.transform = '';
        content.style.overflow = '';
        content.style.willChange = '';
        void content.offsetHeight;
        content.style.transitionProperty = '';
        content.classList.remove('animating');
        isAnimating.value = false;
        isExpanded.value = true;
      }, props.duration);
    });
  });
}

function collapse() {
  if (isAnimating.value || !isExpanded.value) return;
  const content = contentRef.value;
  const container = containerRef.value;
  if (!content || !container) return;

  isAnimating.value = true;
  content.classList.add('animating');

  const fullHeight = content.scrollHeight;
  content.style.display = 'flex';
  content.style.overflow = 'hidden';
  content.style.height = `${fullHeight}px`;
  content.style.opacity = '1';
  content.style.transform = 'translateY(0) scaleY(1)';
  content.style.willChange = 'height, opacity, transform';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
      content.style.transition = `height ${props.duration}ms ${easing}, opacity ${props.duration}ms ${easing}, transform ${props.duration}ms ${easing}`;
      content.style.height = '0px';
      content.style.opacity = '0';
      content.style.transform = 'translateY(-4px) scaleY(0.98)';

      window.setTimeout(() => {
        content.style.display = 'none';
        content.style.transitionProperty = 'none';
        content.style.height = '';
        content.style.opacity = '';
        content.style.transform = '';
        content.style.overflow = '';
        content.style.willChange = '';
        void content.offsetHeight;
        content.style.transitionProperty = '';
        content.classList.remove('animating');
        container.classList.remove('expanded');
        isAnimating.value = false;
        isExpanded.value = false;
      }, props.duration);
    });
  });
}
</script>

<style lang="scss" scoped>
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
