<template>
  <div
    ref="container_ref"
    class="flex items-center justify-between gap-0.75"
    :class="[
      type === 'box' ? 'rounded-md border border-(--grey5050a) p-1' : 'items-center',
      { 'TH-collapsible flex-col items-center': has_detail, expanded: has_detail && is_expanded },
    ]"
  >
    <DefineNonDetailPart>
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- prettier-ignore-attribute -->
        <div class="TH-Item--title th-text-base font-bold">
          <slot name="title" />
        </div>
        <!-- prettier-ignore-attribute -->
        <div class="mt-0.25 th-text-sm opacity-70">
          <slot name="description" />
        </div>
      </div>
      <div class="flex-none shrink-0">
        <slot name="content" />
      </div>
    </DefineNonDetailPart>

    <template v-if="!has_detail">
      <NonDetailPart />
    </template>

    <template v-else>
      <div
        class="flex w-full flex-wrap items-center justify-between gap-0.75"
        :class="{
          'justify-between': has_content,
        }"
        @click="toggle"
      >
        <NonDetailPart />
      </div>
      <div ref="content_ref" class="TH-collapsible--content flex w-full flex-col flex-wrap gap-0.5">
        <Divider type="major" margin-y="my-0.25" weight="h-[0.75px]" />
        <slot name="detail" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core';

const [DefineNonDetailPart, NonDetailPart] = createReusableTemplate();

const is_expanded = defineModel<boolean>();

const props = withDefaults(
  defineProps<{
    type?: 'plain' | 'box';
    duration?: number;
  }>(),
  {
    type: 'plain',
    duration: 260,
  },
);

const slots = useSlots();
const has_content = computed(() => !!slots.content);
const has_detail = computed(() => !!slots.detail);

const is_animating = ref<boolean>(false);
const container_ref = useTemplateRef<HTMLDivElement>('container_ref');
const content_ref = useTemplateRef<HTMLDivElement>('content_ref');

function toggle() {
  if (is_animating.value) {
    return;
  }
  if (is_expanded.value) {
    collapse();
  } else {
    expand();
  }
}

function expand() {
  if (is_animating.value || is_expanded.value) {
    return;
  }
  const content = content_ref.value;
  const container = container_ref.value;
  if (!content || !container) {
    return;
  }

  is_animating.value = true;
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
  const full_height = content.scrollHeight;
  content.style.height = '0px';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
      content.style.transition = `height ${props.duration}ms ${easing}, opacity ${props.duration}ms ${easing}, transform ${props.duration}ms ${easing}`;
      content.style.visibility = '';
      content.style.height = `${full_height}px`;
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
        is_animating.value = false;
        is_expanded.value = true;
      }, props.duration);
    });
  });
}

function collapse() {
  if (is_animating.value || !is_expanded.value) {
    return;
  }
  const content = content_ref.value;
  const container = container_ref.value;
  if (!content || !container) {
    return;
  }

  is_animating.value = true;
  content.classList.add('animating');

  const full_height = content.scrollHeight;
  content.style.display = 'flex';
  content.style.overflow = 'hidden';
  content.style.height = `${full_height}px`;
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
        is_animating.value = false;
        is_expanded.value = false;
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

.TH-collapsible :deep(.TH-Item--title) {
  position: relative;
  cursor: pointer;
  padding-left: 15px;
}

.TH-collapsible :deep(.TH-Item--title::before) {
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

.TH-collapsible.expanded :deep(.TH-Item--title::before) {
  transform: translateY(-50%) rotate(90deg);
}

.TH-collapsible--content {
  display: none;
  transform-origin: top;
  overflow: hidden;
}

.TH-collapsible.expanded .TH-collapsible--content {
  display: flex;
}

.TH-collapsible--content.animating {
  display: flex;
}
</style>
