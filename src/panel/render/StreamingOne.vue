<template>
  <Teleport :to="$host[0]">
    <template v-for="(content, index) in contents" :key="index + content.type">
      <StreamingIframe
        v-if="content.type === 'iframe'"
        :id="`streaming--${props.messageId}--${index}`"
        :srcdoc="content.data"
        :use-blob-url="store.settings.render.use_blob_url"
      />
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div v-else v-html="content.data" />
    </template>
  </Teleport>
</template>

<script setup lang="ts">
import StreamingIframe from '@/panel/render/StreamingIframe.vue';
import { useGlobalSettingsStore } from '@/store/settings';
import { chunkBy } from '@/util/algorithm';
import { isFrontend } from '@/util/is_frontend';

const props = defineProps<{ messageId: number; html: string }>();

const store = useGlobalSettingsStore();

const contents = computed(() => {
  const is_frontend = (element: HTMLElement) => {
    return $(element).is('pre') && isFrontend($(element).text());
  };

  return chunkBy($(props.html.replaceAll('mes_text', 'TH-streaming')).toArray(), (lhs, rhs) => {
    return !is_frontend(lhs) && !is_frontend(rhs);
  }).map(elements => {
    if (elements.length === 1 && is_frontend(elements[0])) {
      return {
        type: 'iframe',
        data: $(elements[0]).text(),
      };
    }
    return {
      type: 'normal',
      data: $('<div>').append(elements).html(),
    };
  });
});

let $host: JQuery;
let $mes_text: JQuery;
const observer = new MutationObserver(() => {
  const $edit_textarea = $('#chat').find('#curEditTextarea');
  if ($edit_textarea.parent().is($mes_text)) {
    $mes_text.removeClass('hidden!');
    $host.addClass('hidden!');
  } else if ($edit_textarea.length === 0) {
    $mes_text.addClass('hidden!');
    $host.removeClass('hidden!');
  }
});
onBeforeMount(() => {
  $mes_text = $(`.mes[mesid="${props.messageId}"]`).find('.mes_text').addClass('hidden!');
  $host = $('<div class="TH-streaming w-full">').insertAfter($mes_text);
  observer.observe($mes_text[0] as HTMLElement, { childList: true });
});
onUnmounted(() => {
  observer.disconnect();
  $host.remove();
  $mes_text.removeClass('hidden!');
});
</script>
