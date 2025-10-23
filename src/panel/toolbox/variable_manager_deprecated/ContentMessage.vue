<template>
  <div class="my-0.75 rounded-sm bg-(--SmartThemeQuoteColor) p-0.75 th-text-sm">
    <div class="flex flex-col gap-0.5">
      <div class="flex items-center justify-between gap-0.75">
        <div class="flex flex-1 items-center">
          <input
            v-model="from"
            type="number"
            class="TH-floor-input"
            :min="sync_bottom ? -chat.length : 0"
            :max="sync_bottom ? -1 : chat.length - 1"
          />
          <span class="mx-0.5 text-(--SmartThemeBodyColor)">~</span>
          <input
            v-model="to"
            type="number"
            class="TH-floor-input"
            :min="sync_bottom ? -chat.length : 0"
            :max="sync_bottom ? -1 : chat.length - 1"
          />
        </div>
        <!-- prettier-ignore-attribute -->
        <button
          class="
            flex items-center gap-0.5 rounded-sm border-none bg-(--SmartThemeQuoteColor) px-0.75 py-0.25 th-text-sm
            text-(--SmartThemeTextColor)
          "
        >
          <i class="fa-solid fa-check"></i>
          <span>确认</span>
        </button>
      </div>
      <div class="py-0.25 th-text-sm text-(--warning)">最大楼层不能小于最小楼层</div>
    </div>
  </div>

  <template v-for="(_varaibles, message_id) in variables_map" :key="message_id">
    <Editor
      v-model="variables_map[message_id]"
      :filters="props.filters"
      :current-view="props.currentView"
      :search-input="props.searchInput"
    />
  </template>
</template>

<script setup lang="ts">
import { get_variables_without_clone, replaceVariables } from '@/function/variables';
import Editor from '@/panel/toolbox/variable_manager/Editor.vue';
import type { FiltersState } from '@/panel/toolbox/variable_manager/filter';
import { fromBackwardMessageId, toBackwardMessageId } from '@/util/message';
import { chat } from '@sillytavern/script';

const props = defineProps<{
  filters: FiltersState;
  currentView: 'tree' | 'card' | 'text';
  searchInput: RegExp | null;
}>();

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

watchDebounced(
  variables_map,
  new_variables => {
    replaceVariables(toRaw(new_variables), { type: 'chat' });
  },
  { debounce: 1000 },
);
</script>

<style lang="scss" scoped>
@reference "tailwindcss";
.TH-floor-input {
  @apply w-full h-2 rounded-sm bg-(--SmartThemeQuoteColor) px-1 py-0.5 text-(--SmartThemeTextColor);
}
</style>
