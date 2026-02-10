<template>
  <StreamingOne
    v-for="runtime in runtimes"
    :key="runtime.message_id"
    :message-id="runtime.message_id"
    :html="runtime.html"
    @request-unmount="destroy(runtime.message_id)"
  />
</template>

<script setup lang="ts">
import StreamingOne from '@/panel/render/StreamingOne.vue';
import { calcToRender } from '@/store/iframe_runtimes/message';
import { useGlobalSettingsStore } from '@/store/settings';
import { containsFrontendElement } from '@/util/is_frontend';
import { chat, event_types } from '@sillytavern/script';

const props = defineProps<{ enableAllowStreaming: boolean }>();

const store = useGlobalSettingsStore();

type Runtime = { message_id: number; html: string };
const runtimes = ref<Runtime[]>([]);

const destroy = (message_id: number) => {
  _.remove(runtimes.value, runtime => runtime.message_id === message_id);
};

const destroyIfInvalid = (message_id: number): boolean => {
  const length = chat.length;
  const min_message_id = Math.max(
    Number($('#chat > .mes').first().attr('mesid')),
    store.settings.render.depth === 0 ? 0 : length - store.settings.render.depth,
  );
  // 查找 .mes_streaming 以兼容流式楼层界面: https://github.com/StageDog/tavern_helper_template/blob/main/util/streaming.ts
  if (
    $(`#chat > .mes[mesid="${message_id}"]`).find('.mes_streaming').length > 0 ||
    !_.inRange(message_id, min_message_id, length)
  ) {
    destroy(message_id);
    return true;
  }
  return false;
};

const destroyAllInvalid = () => {
  runtimes.value.forEach(({ message_id }) => destroyIfInvalid(message_id));
};

function renderOneMessage(message_id: number) {
  if (destroyIfInvalid(message_id)) {
    return;
  }

  const $mes_text = $(`.mes[mesid="${message_id}"]`).find('.mes_text');
  $mes_text.find('code[data-highlighted="yes"]').css('position', 'relative');
  if (
    $mes_text.length === 0 ||
    $mes_text.siblings('.mes_streaming').length > 0 ||
    !containsFrontendElement($mes_text[0])
  ) {
    return;
  }
  const html = $mes_text.html();

  const runtime = runtimes.value.find(runtime => runtime.message_id === message_id);
  if (runtime) {
    runtime.html = html;
  } else {
    runtimes.value.push({ message_id, html });
  }
}

async function renderAllMessages(options: { destroy_all?: boolean } = {}) {
  if (options.destroy_all) {
    runtimes.value = [];
    await nextTick();
  } else {
    destroyAllInvalid();
  }
  calcToRender(store.settings.render.depth).forEach(message_id => {
    renderOneMessage(message_id);
  });
}

watch(
  () => [props.enableAllowStreaming, store.settings.render.depth] as const,
  async ([new_enabled]) => {
    if (new_enabled) {
      await renderAllMessages();
    } else {
      runtimes.value = [];
    }
  },
  { immediate: true },
);

useEventSourceOn('chatLoaded', async () => {
  await renderAllMessages({ destroy_all: true });
});

useEventSourceOn(event_types.CHARACTER_MESSAGE_RENDERED, (message_id: number) => {
  destroyAllInvalid();
  renderOneMessage(message_id);
});

[event_types.MESSAGE_EDITED, event_types.MESSAGE_SWIPED].forEach(event => {
  useEventSourceOn(event, async (message_id: number) => {
    destroyAllInvalid();
    destroy(message_id);
    await nextTick();
    // 延迟以等待编辑后 mes_text 内 DOM 已经更新
    setTimeout(() => renderOneMessage(message_id));
  });
});

useEventSourceOn(event_types.STREAM_TOKEN_RECEIVED, () => {
  renderOneMessage(Number($('#chat').children('.mes.last_mes').attr('mesid')));
});

[event_types.MORE_MESSAGES_LOADED, event_types.MESSAGE_DELETED].forEach(event =>
  useEventSourceOn(event, () => {
    renderAllMessages();
  }),
);
</script>
