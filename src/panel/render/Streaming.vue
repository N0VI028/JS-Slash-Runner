<template>
  <StreamingOne
    v-for="runtime in runtimes"
    :key="runtime.message_id"
    :message-id="runtime.message_id"
    :html="runtime.html"
  />
</template>

<script setup lang="ts">
import { useGlobalSettingsStore } from '@/store/settings';
import { chat, event_types } from '@sillytavern/script';
import StreamingOne from './StreamingOne.vue';

const props = defineProps<{ enableAllowStreaming: boolean }>();

const store = useGlobalSettingsStore();

type Runtime = { message_id: number; html: string };
const runtimes = ref<Runtime[]>([]);

const destroyIfInvalid = (message_id: number): boolean => {
  const length = chat.length;
  const min_message_id = Math.max(
    Number($('#chat > .mes').first().attr('mesid')),
    store.settings.render.depth === 0 ? 0 : length - store.settings.render.depth,
  );
  if (!_.inRange(message_id, min_message_id, length)) {
    _.remove(runtimes.value, runtime => runtime.message_id === message_id);
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

  const runtime = runtimes.value.find(runtime => runtime.message_id === message_id);

  const $mes_text = $(`.mes[mesid="${message_id}"]`).find('.mes_text');
  $mes_text.find('code[data-highlighted="yes"]').css('position', 'relative');
  const html = $mes_text.html();

  if (runtime) {
    runtime.html = html;
  } else {
    runtimes.value.push({ message_id, html });
  }
}

function renderAllMessages() {
  destroyAllInvalid();
  $('#chat')
    .children(".mes[is_user='false'][is_system='false']")
    .each((_index, node) => {
      const message_id = Number($(node).attr('mesid') ?? 'NaN');
      if (!isNaN(message_id) && !destroyIfInvalid(message_id)) {
        renderOneMessage(message_id);
      }
    });
}

watch(
  () => [props.enableAllowStreaming, store.settings.render.depth] as const,
  ([new_enabled]) => {
    if (new_enabled) {
      renderAllMessages();
    } else {
      runtimes.value = [];
    }
  },
  { immediate: true },
);

useEventSourceOn('chatLoaded', () => {
  renderAllMessages();
});

useEventSourceOn(event_types.CHARACTER_MESSAGE_RENDERED, (message_id: number) => {
  destroyAllInvalid();
  renderOneMessage(message_id);
});

[event_types.MESSAGE_EDITED, event_types.MESSAGE_SWIPED].forEach(event => {
  useEventSourceOn(event, async (message_id: number) => {
    destroyAllInvalid();
    _.remove(runtimes.value, runtime => runtime.message_id === message_id);
    setTimeout(() => renderOneMessage(message_id));
  });
});

useEventSourceOn(event_types.STREAM_TOKEN_RECEIVED, () => {
  renderOneMessage(Number($('#chat').children('.mes.last_mes').attr('mesid')));
});

useEventSourceOn(event_types.MESSAGE_DELETED, () => {
  renderAllMessages();
});
</script>
