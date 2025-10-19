<template>
  <div class="mb-0.5 flex flex-wrap items-center gap-0.5 rounded-sm bg-(--grey5020a) p-0.25 text-sm">
    <div class="mr-1 flex grow flex-wrap items-center gap-0.5 text-sm">
      <!-- prettier-ignore-attribute -->
      <button
        class="
          flex h-2 cursor-pointer items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75
          py-0.25 text-sm!
        "
        :style="{ color: text_color }"
        @click="sync_bottom = !sync_bottom"
      >
        <i
          class="fa-solid"
          :class="{ 'fa-arrow-up-short-wide': sync_bottom, 'fa-arrow-down-short-wide': !sync_bottom }"
        ></i>
        <span>{{ sync_bottom ? `追踪最新` : `正序显示` }}</span>
      </button>
      <div class="flex items-center gap-0.5">
        <input
          v-model="from"
          :disabled="sync_bottom"
          type="number"
          class="TH-floor-input"
          :min="0"
          :max="chat_length - 1"
        />
        楼
        <span class="text-(--SmartThemeBodyColor)">~</span>
        <input
          v-model="to"
          :disabled="sync_bottom"
          type="number"
          class="TH-floor-input"
          :min="0"
          :max="chat_length - 1"
        />
        楼
      </div>
    </div>
    <div class="mr-0.5">最新楼层号: {{ chat_length - 1 }}</div>
  </div>
  <!-- TODO(4.0): 调整好样式 (能够正常滑动、页面高度刚好能显示两个左右) 后再调整 min-size -->
  <VirtList ref="virt_list" item-key="message_id" :list="messages" :min-size="1000" :item-gap="7">
    <template #default="{ itemData: item_data }">
      <MessageItem :chat-length="chat_length" :message-id="item_data.message_id" :refresh-key="refresh_key" />
    </template>
  </VirtList>
</template>

<script setup lang="ts">
import MessageItem from '@/panel/toolbox/variable_manager/MessageItem.vue';
import { getSmartThemeQuoteTextColor } from '@/util/color';
import { chat, event_types } from '@sillytavern/script';
import { VirtList } from 'vue-virt-list';
const text_color = getSmartThemeQuoteTextColor();

const virt_list_ref = useTemplateRef('virt_list');

const chat_length = ref(chat.length);
useEventSourceOn(
  [
    event_types.CHAT_CHANGED,
    event_types.MESSAGE_DELETED,
    event_types.MESSAGE_RECEIVED,
    event_types.MESSAGE_SENT,
    event_types.MESSAGE_UPDATED,
    event_types.CHARACTER_MESSAGE_RENDERED,
    event_types.USER_MESSAGE_RENDERED,
  ],
  () => {
    chat_length.value = chat.length;
  },
);

const sync_bottom = ref(true);
watch(sync_bottom, () => {
  virt_list_ref.value?.forceUpdate();
});

const from = ref(Math.max(0, chat_length.value - 3));
const to = ref(Math.max(0, chat_length.value - 1));
watch([sync_bottom, chat_length], ([new_sync_bottom, new_chat_length], [old_sync_bottom]) => {
  if (new_sync_bottom) {
    from.value = Math.max(0, new_chat_length - 3);
    to.value = Math.max(0, new_chat_length - 1);
    if (new_sync_bottom === old_sync_bottom) {
      refresh_key.value = Symbol();
    }
  }
});

const refresh_key = ref<symbol>(Symbol());
useIntervalFn(() => {
  refresh_key.value = Symbol();
}, 2000);

const messages = computed(() => {
  if (chat_length.value === 0) {
    return [];
  }
  const range = from.value > to.value ? _.range(to.value, from.value + 1) : _.range(from.value, to.value + 1);
  const result = sync_bottom.value ? range.toReversed() : range;
  return result.map(value => ({
    message_id: sync_bottom.value ? value - chat_length.value : value,
  }));
});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-floor-input {
  @apply rounded-sm h-2 bg-(--SmartThemeBlurTintColor)! grow min-w-0 px-0.5 cursor-pointer text-(--SmartThemeBodyColor) border-none! text-sm!;
}
</style>
