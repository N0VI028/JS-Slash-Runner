<template>
  <div
    ref="container_ref"
    class="flex"
    :style="{ gap: `calc(var(--spacing) * ${gap})` }"
    :class="[
      type === 'box' ? 'relative rounded-md border border-(--grey5050a) p-1' : '',
      type === 'box' && has_legend ? 'mt-1' : '',
      type === 'divider' ? 'relative border-t border-(--grey5050a) pt-0.75' : '',
      type === 'divider' && has_legend ? 'mt-0.5' : '',
      has_default ? 'flex-col' : 'items-center justify-between',
      { 'TH-collapsible flex-col items-center': has_detail, expanded: has_detail && is_expanded },
    ]"
  >
    <!-- prettier-ignore-attribute -->
    <div
      v-if="type === 'box' && has_legend"
      class="
        absolute top-0 left-0.5 flex -translate-y-1/2 items-center justify-center gap-0.25
        bg-(--SmartThemeBlurTintColor) px-0.5 th-text-xs! leading-none text-(--grey50)
      "
    >
      <slot name="legend" />
    </div>
    <!-- prettier-ignore-attribute -->
    <div
      v-if="type === 'divider' && has_legend"
      class="
        absolute top-0 left-0 flex -translate-y-1/2 items-center justify-center gap-0.25 bg-(--SmartThemeBlurTintColor)
        px-0.5 th-text-xs! leading-none text-(--grey50)
      "
    >
      <slot name="legend" />
    </div>
    <DefineNonDetailPart>
      <div class="flex min-w-0 flex-1 flex-col">
        <!-- prettier-ignore-attribute -->
        <div class="TH-Item--title" :class="title_class">
          <slot name="title" />
        </div>
        <!-- prettier-ignore-attribute -->
        <div v-if="has_description" class="mt-0.25 th-text-xs opacity-70">
          <slot name="description" />
        </div>
      </div>
      <div class="flex-none shrink-0">
        <slot name="content" />
      </div>
    </DefineNonDetailPart>

    <template v-if="has_default">
      <slot />
    </template>

    <template v-else-if="!has_detail">
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
    type?: 'plain' | 'box' | 'divider';
    duration?: number;
    titleSize?: 'xs' | 'sm' | 'base' | 'lg';
    titleBold?: boolean;
    gap?: string;
  }>(),
  {
    type: 'plain',
    duration: 260,
    titleSize: 'base',
    titleBold: true,
    gap: '0.75',
  },
);

const title_class = computed(() => {
  const size_map = { xs: 'th-text-xs', sm: 'th-text-sm', base: 'th-text-base', lg: 'th-text-lg' };
  return [size_map[props.titleSize], props.titleBold && 'font-bold'];
});

provide(
  'item-size',
  computed(() => props.titleSize),
);

const slots = useSlots();
const has_content = computed(() => !!slots.content);
const has_detail = computed(() => !!slots.detail);
const has_legend = computed(() => !!slots.legend);
const has_default = computed(() => !!slots.default);
const has_description = computed(() => !!slots.description);

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
/* legend 内图标对齐：约束为 1em 方盒并居中字形 */
.TH-legend :deep(i) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
}

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
