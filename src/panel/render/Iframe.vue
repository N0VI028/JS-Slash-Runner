<template>
  <iframe :id="`TH-message-${id}`" ref="iframe_ref" loading="lazy" v-bind="src_prop" class="w-full" frameborder="0" />
</template>

<script setup lang="ts">
import { createSrcContent } from '@/panel/render/iframe';

const props = defineProps<{
  id: string;
  element: HTMLElement;
  useBlobUrl: boolean;
}>();

const $element = $(props.element);

const iframe_ref = useTemplateRef<HTMLIFrameElement>('iframe');

/**
 * 调整指定 iframe 的高度
 * @param target
 */
function adjustIframeHeight(target: HTMLIFrameElement) {
  const doc = target.contentWindow?.document as Document | undefined;
  const body = doc?.body as HTMLElement | undefined;
  const html = doc?.documentElement as HTMLElement | undefined;
  if (!doc || !body || !html) return;

  const bodyHeight = body.offsetHeight || 0;
  const htmlHeight = html.offsetHeight || 0;
  const newHeight = Math.max(bodyHeight, htmlHeight);
  if (!Number.isFinite(newHeight) || newHeight <= 0) {
    return;
  }

  const last = (window as any)._TH_lastHeights as WeakMap<HTMLIFrameElement, number> | undefined;
  if (!last) {
    (window as any)._TH_lastHeights = new WeakMap();
  }
  const map = (window as any)._TH_lastHeights as WeakMap<HTMLIFrameElement, number>;
  const previousHeight = map.get(target) || 0;
  if (Math.abs(previousHeight - newHeight) > 1) {
    target.style.height = `${newHeight}px`;
    map.set(target, newHeight);
  }
}

/**
 * 获取或创建共享的 ResizeObserver（避免为每个 iframe 创建新实例）
 * @returns 共享的 ResizeObserver
 */
function getSharedResizeObserver(): ResizeObserver {
  // 使用全局缓存，避免重复实例化
  const win = window as unknown as {
    _TH_sharedRO?: ResizeObserver;
    _TH_observed?: Map<Element, { iframe: HTMLIFrameElement }>;
    _TH_queue?: Set<HTMLIFrameElement>;
    _TH_sched?: boolean;
  };
  if (!win._TH_observed) {
    win._TH_observed = new Map();
  }
  if (!win._TH_queue) {
    win._TH_queue = new Set();
  }
  if (!win._TH_sharedRO) {
    win._TH_sharedRO = new ResizeObserver(entries => {
      // 合并在同一帧处理：加入队列并在 rAF 内批量调整高度
      for (const entry of entries) {
        const data = win._TH_observed!.get(entry.target);
        if (data?.iframe) win._TH_queue!.add(data.iframe);
      }
      if (!win._TH_sched) {
        win._TH_sched = true;
        requestAnimationFrame(() => {
          for (const f of win._TH_queue!) {
            adjustIframeHeight(f);
          }
          win._TH_queue!.clear();
          win._TH_sched = false;
        });
      }
    });
  }
  return win._TH_sharedRO!;
}

/**
 * 观察指定 iframe 的子文档主体
 * @param target
 */
function observeIframeContent(target: HTMLIFrameElement) {
  const win = window as unknown as {
    _TH_sharedRO?: ResizeObserver;
    _TH_observed?: Map<Element, { iframe: HTMLIFrameElement }>;
  };
  const ro = getSharedResizeObserver();
  const doc = target.contentWindow?.document;
  const body = doc?.body || doc?.documentElement;
  if (!doc || !body) return;

  for (const [el, meta] of win._TH_observed!) {
    if (meta.iframe === target) {
      ro.unobserve(el);
      win._TH_observed!.delete(el);
    }
  }

  // 建立新观察
  win._TH_observed!.set(body, { iframe: target });
  ro.observe(body);
  adjustIframeHeight(target);
}

const onMessage = (event: MessageEvent) => {
  const data = (event && event.data) || {};
  if (data?.type === 'TH_DOM_CONTENT_LOADED' && data.iframe_name === iframe_ref.value?.id) {
    observeIframeContent(iframe_ref.value!);
  }
};
onMounted(() => {
  window.addEventListener('message', onMessage, { once: true });
});
onBeforeUnmount(() => {
  const win = window as unknown as {
    _TH_sharedRO?: ResizeObserver;
    _TH_observed?: Map<Element, { iframe: HTMLIFrameElement }>;
  };
  const ro = win._TH_sharedRO;
  if (ro && win._TH_observed && iframe_ref.value) {
    for (const [el, meta] of win._TH_observed) {
      if (meta.iframe === iframe_ref.value) {
        ro.unobserve(el);
        win._TH_observed.delete(el);
      }
    }
  }
});

const src_prop = computed((old_src_prop?: { srcdoc?: string; src?: string }) => {
  if (old_src_prop?.src) {
    URL.revokeObjectURL(old_src_prop.src);
  }

  const content = createSrcContent($element.find('code').text(), props.useBlobUrl);
  if (!props.useBlobUrl) {
    return { srcdoc: content };
  }
  return { src: URL.createObjectURL(new Blob([content], { type: 'text/html' })) };
});
onUnmounted(() => {
  if (src_prop.value.src) {
    URL.revokeObjectURL(src_prop.value.src);
  }
});

// TODO: 应该有更好的办法处理和折叠代码块的兼容性
onMounted(() => {
  $element
    .children()
    .filter((_index, child) => !$(child).is('iframe'))
    .hide();
});
onBeforeUnmount(() => {
  const $button = $element.children('.TH-collapse-code-block-button');
  if ($button.length === 0) {
    $element.children('code').show();
  } else {
    $button.text('显示代码块').show();
  }
});
</script>
