<template>
  <StreamingOne
    v-for="runtime in runtimes"
    :key="runtime.mount_key"
    :message-id="runtime.message_id"
    :html="runtime.html"
    :during-streaming="runtime.during_streaming"
    @request-unmount="destroy(runtime.message_id)"
  />
</template>

<script setup lang="ts">
import { registerMessageRenderer } from '@/panel/render/message_recovery';
import type { RenderContext } from '@/util/message_render_coordinator';
import StreamingOne from '@/panel/render/StreamingOne.vue';
import { calcToRender } from '@/store/iframe_runtimes/message';
import { useGlobalSettingsStore } from '@/store/settings';
import { containsFrontendElement } from '@/util/is_frontend';
import { chat } from '@sillytavern/script';

const props = defineProps<{ enableAllowStreaming: boolean }>();

const store = useGlobalSettingsStore();

type Runtime = {
  message_id: number;
  html: string;
  during_streaming: boolean;
  element: HTMLElement;
  source_element: HTMLElement;
  mount_key: number;
};
let mount_key = 0;
const runtimes = ref<Runtime[]>([]);

const destroy = (message_id: number) => {
  _.remove(runtimes.value, runtime => runtime.message_id === message_id);
};

const destroyIfInvalid = (message_id: number): boolean => {
  const min_showed_message_id = Number($('#chat > .mes').first().attr('mesid'));
  const begin_message_id =
    store.settings.render.depth === 0
      ? min_showed_message_id
      : Math.max(min_showed_message_id, chat.length - store.settings.render.depth);

  // 查找 .mes_streaming 以兼容流式楼层界面: https://github.com/StageDog/tavern_helper_template/blob/main/util/streaming.ts
  if (
    $(`#chat > .mes[mesid="${message_id}"]`).find('.mes_streaming').length > 0 ||
    // 虽然两路可以合并，但是还是拆开，这样 !ignore_hidden 时性能应好一些
    (!store.settings.render.depth_ignore_hidden && !_.inRange(message_id, begin_message_id, chat.length)) ||
    (store.settings.render.depth_ignore_hidden &&
      !calcToRender(store.settings.render.depth, store.settings.render.depth_ignore_hidden).includes(message_id))
  ) {
    destroy(message_id);
    return true;
  }
  return false;
};

const destroyAllInvalid = () => {
  runtimes.value.forEach(({ message_id }) => destroyIfInvalid(message_id));
};

function renderOneMessage(element: HTMLElement, during_streaming: boolean = false) {
  const message_id = Number(element.getAttribute('mesid'));
  if (destroyIfInvalid(message_id)) {
    return;
  }

  const $mes_text = $(element).find('.mes_text');
  $mes_text.find('code[data-highlighted="yes"]').css('position', 'relative');
  if (
    $mes_text.length === 0 ||
    $mes_text.siblings('.mes_streaming').length > 0 ||
    (!during_streaming && !containsFrontendElement($mes_text[0]))
  ) {
    destroy(message_id);
    return;
  }
  const html = $mes_text.html();

  const runtime = runtimes.value.find(runtime => runtime.message_id === message_id);
  if (
    runtime &&
    runtime.element === element &&
    runtime.source_element === $mes_text[0] &&
    $mes_text.siblings('.TH-streaming').length > 0
  ) {
    runtime.html = html;
    runtime.during_streaming = during_streaming;
  } else {
    destroy(message_id);
    runtimes.value.push({
      message_id,
      html,
      during_streaming,
      element,
      source_element: $mes_text[0],
      mount_key: ++mount_key,
    });
  }
}

registerMessageRenderer({
  order: 40,
  streaming: true,
  isAttached: element => {
    const id = Number(element.getAttribute('mesid'));
    if (
      !props.enableAllowStreaming ||
      !calcToRender(store.settings.render.depth, store.settings.render.depth_ignore_hidden).includes(id)
    )
      return true;
    const text = element.querySelector<HTMLElement>('.mes_text');
    if (!text || element.querySelector('.mes_streaming') || !containsFrontendElement(text)) return true;
    return (
      runtimes.value.some(runtime => runtime.element === element) &&
      !!element.querySelector('.TH-streaming iframe[id^="TH-message--"]')
    );
  },
  audit: () => {
    runtimes.value = runtimes.value.filter(runtime => runtime.element.isConnected);
    destroyAllInvalid();
  },
  revision: element =>
    calcToRender(store.settings.render.depth, store.settings.render.depth_ignore_hidden).includes(
      Number(element.getAttribute('mesid')),
    ),
  reset: () => {
    runtimes.value = [];
  },
  render: async (element: HTMLElement, context: RenderContext, during_streaming: boolean) => {
    if (!props.enableAllowStreaming || !context.isCurrent()) return;
    // Keep the existing post-edit/swipe delay inside the reserved transaction.
    await nextTick();
    if (!context.isCurrent() || !(await context.delay())) return;
    destroyAllInvalid();
    if (!context.isCurrent()) return;
    renderOneMessage(element, during_streaming);
    context.acceptChanges();
    await nextTick();
  },
});
</script>
