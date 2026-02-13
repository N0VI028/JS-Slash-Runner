<template>
  <Teleport :to="$host[0]">
    <template v-for="(content, index) in contents" :key="index + content.type">
      <StreamingIframe
        v-if="content.type === 'iframe'"
        :id="`${props.messageId}--${index}`"
        :srcdoc="content.html"
        :use-blob-url="store.settings.render.use_blob_url"
      />
      <StreamingNestedIframe
        v-else-if="content.type === 'nested_iframe'"
        :id="`${props.messageId}--${index}`"
        :html="content.html"
        :use-blob-url="store.settings.render.use_blob_url"
      />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else v-html="content.html" />
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import StreamingIframe from '@/panel/render/StreamingIframe.vue';
import StreamingNestedIframe from '@/panel/render/StreamingNestedIframe.vue';
import { useGlobalSettingsStore } from '@/store/settings';
import { chunkBy } from '@/util/algorithm';
import { containsFrontendElement, isFrontendElement } from '@/util/is_frontend';

const props = defineProps<{ messageId: number; html: string }>();
const emits = defineEmits<{ 'request-unmount': [] }>();

const store = useGlobalSettingsStore();

const contents = computed(() => {
  return chunkBy(
    $(
      props.html
        .replaceAll('mes_text', 'TH-streaming')
        .replace(/<div class="TH-collapse-code-block-button">(?:显示|隐藏)(?:前端)?代码块<\/div>/g, ''),
    )
      .toArray()
      .map(element => ({
        element,
        type: isFrontendElement(element)
          ? 'iframe'
          : containsFrontendElement(element)
            ? 'nested_iframe'
            : $(element).is('details')
              ? 'details'
              : 'normal',
      })),
    (lhs, rhs) => {
      return lhs.type === 'normal' && lhs.type === rhs.type;
    },
  ).map(chunk => ({
    type: chunk[0].type,
    html:
      chunk[0].type === 'iframe'
        ? $(chunk[0].element).text()
        : $('<div>')
            .append(chunk.map(item => item.element))
            .html(),
  }));
});

let $host: JQuery;
let $mes_text: JQuery;
const textarea_observer = new MutationObserver(() => {
  const $edit_textarea = $('#chat').find('#curEditTextarea');
  if ($edit_textarea.parent().is($mes_text)) {
    $mes_text.removeClass('hidden!');
    $host.addClass('hidden!');
  } else if ($edit_textarea.length === 0) {
    $mes_text.addClass('hidden!');
    $host.removeClass('hidden!');
  }
});
const mes_streaming_observer = new MutationObserver(() => {
  const $mes_streaming = $mes_text.siblings('.mes_streaming');
  if ($mes_streaming.length > 0) {
    emits('request-unmount');
  }
});
onBeforeMount(() => {
  $mes_text = $(`.mes[mesid="${props.messageId}"]`).find('.mes_text').addClass('hidden!');
  $host = $('<div class="TH-streaming w-full">').insertAfter($mes_text);
  textarea_observer.observe($mes_text[0], { childList: true });
  mes_streaming_observer.observe($mes_text.parent()[0], { childList: true });
});
onUnmounted(() => {
  mes_streaming_observer.disconnect();
  textarea_observer.disconnect();
  $host.remove();
  if ($mes_text.siblings('.mes_streaming').length === 0) {
    $mes_text.removeClass('hidden!');
  }
});
</script>
