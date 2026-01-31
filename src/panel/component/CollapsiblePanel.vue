<template>
  <div class="mt-0.5 flex flex-col">
    <!-- prettier-ignore-attribute -->
    <div
      class="
        flex cursor-pointer items-center gap-0.5 bg-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_10%,transparent)]
        px-0.75 py-0.5 select-none
      "
      :class="is_expanded ? 'rounded-t-md' : 'rounded-md'"
      @click="toggle"
    >
      <div class="flex min-w-0 flex-1 items-center gap-0.5">
        <i v-if="icon" :class="icon" class="flex-none" />
        <span class="min-w-0 flex-1 truncate font-bold">{{ title }}</span>
      </div>
      <i
        class="fa-solid fa-chevron-right flex-none text-xs transition-transform duration-300"
        :class="{ 'rotate-90': is_expanded }"
      />
    </div>

    <!-- prettier-ignore-attribute -->
    <div
      ref="content_ref"
      :class="is_expanded ? 'block' : 'hidden'"
      class="
        rounded-b-md border-x-2 border-b-2 border-[color-mix(in_srgb,var(--SmartThemeQuoteColor)_10%,transparent)]
        px-0.75 py-0.5
      "
    >
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 可折叠面板组件
 * 包含header(图标+标题+折叠三角)和内容区域
 */
const props = withDefaults(
  defineProps<{
    title: string;
    icon?: string;
    duration?: number;
  }>(),
  { icon: 'fa-solid fa-chevron-right',
    duration: 260,
  },
);

const is_expanded = defineModel<boolean>({ default: false });

const is_animating = ref<boolean>(false);
const content_ref = useTemplateRef<HTMLDivElement>('content_ref');

/**
 * 切换展开/折叠状态
 */
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

/**
 * 展开内容
 */
function expand() {
  if (is_animating.value || is_expanded.value) {
    return;
  }
  const content = content_ref.value;
  if (!content) {
    return;
  }

  is_animating.value = true;
  content.classList.add('animating');

  content.style.visibility = 'hidden';
  content.style.display = 'block';
  content.style.overflow = 'hidden';
  content.style.height = '';
  content.style.opacity = '0';
  content.style.transform = 'translateY(-6px)';
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
      content.style.transform = 'translateY(0)';

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

/**
 * 折叠内容
 */
function collapse() {
  if (is_animating.value || !is_expanded.value) {
    return;
  }
  const content = content_ref.value;
  if (!content) {
    return;
  }

  is_animating.value = true;
  content.classList.add('animating');

  const full_height = content.scrollHeight;
  content.style.display = 'block';
  content.style.overflow = 'hidden';
  content.style.height = `${full_height}px`;
  content.style.opacity = '1';
  content.style.transform = 'translateY(0)';
  content.style.willChange = 'height, opacity, transform';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const easing = 'cubic-bezier(0.25, 0.1, 0.25, 1)';
      content.style.transition = `height ${props.duration}ms ${easing}, opacity ${props.duration}ms ${easing}, transform ${props.duration}ms ${easing}`;
      content.style.height = '0px';
      content.style.opacity = '0';
      content.style.transform = 'translateY(-4px)';

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
        is_animating.value = false;
        is_expanded.value = false;
      }, props.duration);
    });
  });
}
</script>
