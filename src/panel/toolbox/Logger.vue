<template>
  <div class="flex h-full flex-col gap-1 overflow-hidden p-1 text-(--SmartThemeBodyColor)">
    <select v-model="selected_iframe_id">
      <option value="all_iframes">{{ t`所有日志` }}</option>
      <option v-for="id in iframe_ids" :key="id" :value="id">
        {{ formatIframeLabel(id) }}
      </option>
    </select>

    <div class="flex flex-col gap-0.5 bg-(--grey5020a) p-0.5">
      <div class="flex items-center gap-0.5">
        <div
          class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
          :title="t`过滤`"
          @click="is_filter_opened = !is_filter_opened"
        >
          <i class="fa-solid fa-filter" />
        </div>
        <SearchBar
          v-model="search_input"
          class="grow rounded-sm bg-transparent th-text-base text-(--mainTextColor)"
          :placeholder="t`搜索日志内容...`"
        />
        <div class="flex h-2 w-2 cursor-pointer items-center justify-center" :title="t`清除日志`" @click="clearLogs">
          <i class="fa-solid fa-brush" />
        </div>
      </div>
      <div v-if="is_filter_opened" ref="filter_icon" class="flex items-center gap-0.5"></div>
      <Teleport v-if="filter_icon_ref" :to="filter_icon_ref">
        <div class="flex gap-1">
          <div class="flex items-center gap-0.5">
            <input v-model="level_filters.debug" type="checkbox" />
            {{ t`详细` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input v-model="level_filters.info" type="checkbox" />
            {{ t`信息` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input v-model="level_filters.warn" type="checkbox" />
            {{ t`警告` }}
          </div>
          <div class="flex items-center gap-0.5">
            <input v-model="level_filters.error" type="checkbox" />
            {{ t`错误` }}
          </div>
        </div>
      </Teleport>
    </div>
    <div
      class="flex flex-1 flex-col gap-(--TH-log--gap) overflow-y-auto"
      style="--TH-log--gap: calc(var(--mainFontSize) * 0.5)"
    >
      <VirtList item-key="timestamp" :list="logs" :min-size="10" item-class="TH-log--item" item-style="">
        <template #default="{ itemData: item_data }">
          <div
            :class="{
              'TH-log--normal': item_data.level === 'info' || item_data.level === 'debug',
              'TH-log--warn': item_data.level === 'warn',
              'TH-log--error': item_data.level === 'error',
            }"
          >
            {{ selected_iframe_id === 'all_iframes' ? `【${formatIframeLabel(item_data.iframe_id)}】:` : '' }}
            <Highlighter :query="search_input">{{ item_data.message }}</Highlighter>
          </div>
        </template>
      </VirtList>
    </div>
  </div>
</template>

<script setup lang="ts">
import Highlighter from '@/panel/component/Highlighter.vue';
import { useIframeLogsStore, type Log, type LogLevel } from '@/store/iframe_logs';
import { VirtList } from 'vue-virt-list';

const search_input = ref<RegExp | null>(null);
const level_filters = ref<Record<LogLevel, boolean>>({
  debug: false,
  info: true,
  warn: true,
  error: true,
});
const filter_icon_ref = useTemplateRef<HTMLElement>('filter_icon');
const is_filter_opened = ref<boolean>(false);

const store = useIframeLogsStore();

const selected_iframe_id = ref<string>('all_iframes');

const iframe_ids = computed(() => [...store.iframe_logs.keys()].toSorted());

function computeLogs(
  iframe_logs: [string, Log[]][],
): { iframe_id: string; level: LogLevel; timestamp: number; message: string }[] {
  let result = _(iframe_logs)
    .flatMap(([iframe_id, logs]) => logs.map(log => ({ iframe_id, ...log })))
    .sortBy(item => item.timestamp);
  if (search_input.value !== null) {
    result = result.filter(item => search_input.value!.test(item.message));
  }
  return result.value();
}
const logs = computed(() => {
  if (selected_iframe_id.value === 'all_iframes') {
    return computeLogs([...store.iframe_logs.entries()]);
  }
  return computeLogs([[selected_iframe_id.value, store.iframe_logs.get(selected_iframe_id.value) ?? []]]);
});

/**
 * 将 iframe_id 转换为更友好的显示文本
 * 例：TH-script-测试-b677a17a-933c-40e8-b4b8-6e229f382f52
 * 显示为：脚本 | 测试
 */
const formatIframeLabel = (id: string): string => {
  const regex = /TH-(script|message)--(.*)--(.*)/;
  const match = id.match(regex);
  if (!match) {
    return id;
  }
  if (match[1] === 'script') {
    return t`脚本` + ` | ${match[2]}`;
  }
  return t`消息` + ` | 第${match[2]}楼-第${match[3]}个界面`;
};

const clearLogs = () => {
  if (selected_iframe_id.value === 'all_iframes') {
    store.iframe_logs.forEach(logs => {
      logs.length = 0;
    });
  } else {
    store.iframe_logs.set(selected_iframe_id.value, []);
  }
};
</script>

<style>
.TH-log--item {
  position: relative;
  border-radius: 3px;
  padding: 3px 5px;
  white-space: pre-wrap;
}

/* 仅普通条目之间：在两条之间的间隙中线居中 */
.TH-log--item:has(.TH-log--normal) + .TH-log--item:has(.TH-log--normal)::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(calc(var(--mainFontSize) * 0.5)) / 2);
  height: 1px;
  background: var(--grey5020a);
  pointer-events: none;
}

/* 级别底色 */
.TH-log--item > .TH-log--warn {
  background: rgba(255, 208, 0, 0.4);
}
.TH-log--item > .TH-log--error {
  background: var(--crimson-hover);
}
</style>
