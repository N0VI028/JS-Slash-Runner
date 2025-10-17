<template>
  <div class="mx-0.75 mb-0.5 flex flex-wrap items-center gap-0.5 rounded-sm bg-(--grey5020a) p-0.25 text-sm">
    <div class="mr-1 flex grow flex-wrap items-center gap-0.5 text-sm">
      <!-- prettier-ignore-attribute -->
      <button
        class="
          flex h-2 cursor-pointer items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75
          py-0.25 text-sm! text-(--SmartThemeBodyColor)!
        "
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
    <div class="flex items-center gap-0.25">
      <button class="menu_button interactable m-0! h-2 gap-[5px] text-sm!">
        <i class="fa-solid fa-plus"></i>
        <span>新建</span>
      </button>
      <button class="menu_button interactable m-0! h-2 gap-[5px] text-sm!">
        <i class="fa-solid fa-trash"></i>
        <span>清空</span>
      </button>
    </div>
  </div>
  <template v-for="message_id in message_range" :key="message_id">
    <MessageItem
      :message-id="message_id"
      :normalized-message-id="sync_bottom ? chat_length + message_id : message_id"
    />
  </template>
</template>

<script setup lang="ts">
import MessageItem from '@/panel/toolbox/variable_manager/MessageItem.vue';
import { chat, event_types } from '@sillytavern/script';

const sync_bottom = ref(true);

const chat_length = ref(chat.length);
const from = ref(Math.max(0, chat.length - 5));
const to = ref(Math.max(0, chat.length - 1));
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
    if (sync_bottom.value) {
      from.value = Math.max(0, chat.length - 5);
      to.value = Math.max(0, chat.length - 1);
    }
  },
);

const message_range = computed(() => {
  if (chat_length.value === 0) {
    return [];
  }
  const result = from.value > to.value ? _.range(to.value, from.value + 1) : _.range(from.value, to.value + 1);
  if (sync_bottom.value) {
    return result.map(value => value - chat_length.value).toReversed();
  }
  return result;
});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-floor-input {
  @apply rounded-sm h-2 bg-(--SmartThemeBlurTintColor) grow min-w-0 px-0.5 cursor-pointer text-(--SmartThemeBodyColor) border-none! text-sm!;
}
</style>
