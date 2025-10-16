<template>
  <div class="mx-0.75 mb-0.5 flex flex-wrap items-center gap-0.5 rounded-sm bg-(--grey5020a) p-0.25 text-sm">
    <div class="mr-1 flex grow flex-wrap items-center gap-0.5 text-sm">
      <button
        class="flex h-2 cursor-pointer items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75 py-0.25 text-sm! text-(--SmartThemeBodyColor)!"
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
          type="number"
          class="TH-floor-input"
          :min="sync_bottom ? -chat.length : 0"
          :max="sync_bottom ? -1 : chat.length - 1"
        />
        楼
        <span class="text-(--SmartThemeBodyColor)">~</span>
        <input
          v-model="to"
          type="number"
          class="TH-floor-input"
          :min="sync_bottom ? -chat.length : 0"
          :max="sync_bottom ? -1 : chat.length - 1"
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
  <template v-for="(_varaibles, message_id) in variables_map" :key="message_id">
    <JsonEditor v-model="variables_map[message_id]" />
  </template>
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import { fromBackwardMessageId, toBackwardMessageId } from '@/util/message';
import { chat } from '@sillytavern/script';

const from = ref(-1);
const to = ref(-1);

const sync_bottom = ref(true);
watch(sync_bottom, () => {
  if (sync_bottom.value) {
    from.value = toBackwardMessageId(from.value);
    to.value = toBackwardMessageId(to.value);
  } else {
    from.value = fromBackwardMessageId(from.value);
    to.value = fromBackwardMessageId(to.value);
  }
});

const message_range = computed(() => {
  if (!sync_bottom.value && from.value > to.value) {
    toastr.error('最大楼层不能小于最小楼层', '输入错误');
    return [];
  }
  if (from.value > to.value) {
    return _.range(to.value, from.value + 1);
  }
  return _.range(from.value, to.value + 1);
});
function get_variables_array() {
  return Object.fromEntries(
    message_range.value.map(message_id => [message_id, get_variables_without_clone({ type: 'message', message_id })]),
  );
}
watchDebounced(
  message_range,
  () => {
    variables_map.value = get_variables_array();
  },
  { debounce: 1000 },
);

const variables_map = shallowRef<{ [message_id: string]: Record<string, any> }>(get_variables_array());
useIntervalFn(() => {
  const new_variables_array = get_variables_array();
  if (!_.isEqual(variables_map.value, new_variables_array)) {
    variables_map.value = new_variables_array;
  }
}, 2000);

watch(variables_map, new_variables => {
  Object.entries(new_variables).forEach(([message_id, variables]) => {
    replaceVariables(toRaw(variables), { type: 'message', message_id: Number(message_id) });
  });
});
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-floor-input {
  @apply rounded-sm h-2 bg-(--SmartThemeBlurTintColor) grow min-w-0 px-0.5 cursor-pointer text-(--SmartThemeBodyColor) border-none! text-sm!;
}
</style>
