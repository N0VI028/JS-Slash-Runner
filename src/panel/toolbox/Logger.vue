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
          <i class="fa-solid fa-ban" />
        </div>
      </div>
      <div v-if="is_filter_opened" ref="teleportTarget" class="flex items-center gap-0.5"></div>
      <Teleport v-if="teleportTarget" :to="teleportTarget">
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
      ref="logContainer"
      class="flex flex-1 flex-col gap-(--log-gap) overflow-y-auto"
      style="--log-gap: calc(var(--mainFontSize) * 0.5)"
    >
      <template v-if="selected_iframe_id === 'all_iframes'">
        <div
          v-for="(item, index) in all_logs"
          v-show="level_filters[item.log.level]"
          :key="item.iframeId + '-' + index"
          class="TH-log-item"
          :class="{
            'TH-normal': item.log.level === 'info' || item.log.level === 'debug',
            'TH-warn': item.log.level === 'warn',
            'TH-error': item.log.level === 'error',
          }"
        >
          【{{ formatIframeLabel(item.iframeId) }}】：
          <Highlighter :query="search_input">{{ item.log.message }}</Highlighter>
        </div>
      </template>

      <template v-else>
        <div
          v-for="(log, index) in filterLogs(store.iframe_logs[selected_iframe_id])"
          v-show="level_filters[log.level]"
          :key="selected_iframe_id + '-' + index"
          class="TH-log-item"
          :class="{
            'TH-normal': log.level === 'info' || log.level === 'debug',
            'TH-warn': log.level === 'warn',
            'TH-error': log.level === 'error',
          }"
        >
          <Highlighter :query="search_input">{{ log.message }}</Highlighter>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useIframeLogsStore, type Log, type LogLevel } from '@/store/iframe_logs';
import Highlighter from '@/panel/component/Highlighter.vue';
import { ref } from 'vue';

const teleportTarget = useTemplateRef<HTMLElement>('teleportTarget');
const logContainer = useTemplateRef<HTMLElement>('logContainer');

const search_input = ref<RegExp | null>(null);
const level_filters = ref<Record<LogLevel, boolean>>({
  debug: false,
  info: true,
  warn: true,
  error: true,
});
const is_filter_opened = ref<boolean>(false);

const store = useIframeLogsStore();

const selected_iframe_id = ref<string>('all_iframes');

const iframe_ids = computed(() => Object.keys(store.iframe_logs));

/**
 * 所有 iframe 日志按时间排序后的列表
 * - 当选择“所有日志”时使用
 */
const all_logs = computed(() => {
  const merged: { iframeId: string; log: Log }[] = [];
  Object.entries(store.iframe_logs).forEach(([iframeId, logs]) => {
    logs.forEach(log => {
      merged.push({ iframeId, log });
    });
  });
  if (search_input.value !== null) {
    return merged
      .filter(item => search_input.value!.test(item.log.message))
      .sort((a, b) => a.log.timestamp - b.log.timestamp);
  }
  return merged.sort((a, b) => a.log.timestamp - b.log.timestamp);
});

/**
 * 根据搜索内容过滤日志
 */
const filterLogs = (logs?: Log[]) => {
  if (!logs || logs.length === 0) {
    return [];
  }
  if (search_input.value === null) {
    return logs;
  }
  return logs.filter(log => search_input.value!.test(log.message));
};

const { proxy } = getCurrentInstance()!;
const t = proxy!.t as (strings: TemplateStringsArray, ...values: any[]) => string;
/**
 * 将 iframeId 转换为更友好的显示文本
 * 例：TH-script-测试-b677a17a-933c-40e8-b4b8-6e229f382f52
 * 显示为：脚本 | 测试
 */
const formatIframeLabel = (rawId: string | number): string => {
  if (typeof rawId === 'number') {
    return rawId.toString();
  }

  const parts = rawId.split('--');
  if (parts.length <= 1) return rawId;

  const type = parts[0];
  let name = '';
  let prefix = '';
  if (type === 'TH-script') {
    prefix = t`脚本` + ' | ';
    name = parts[1];
  } else if (type === 'TH-message') {
    prefix = t`消息` + ' | ';
    const floor = parts[1];
    const index = parseInt(parts[2]) + 1;
    name = t`第${floor}楼-第${index}个界面`;
  }

  return `${prefix}${name}`;
};

const clearLogs = () => {
  if (selected_iframe_id.value === 'all_iframes') {
    store.clearAll();
  } else {
    store.clear(selected_iframe_id.value);
  }
};
</script>

<style scoped>
.TH-log-item {
  position: relative;
  border-radius: 3px;
  padding: 3px 5px;
  white-space: pre-wrap;
}

/* 仅普通条目之间：在两条之间的间隙中线居中 */
.TH-log-item.TH-normal + .TH-log-item.TH-normal::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: calc(-1 * var(--log-gap) / 2);
  height: 1px;
  background: var(--grey5020a);
  pointer-events: none;
}

/* 级别底色 */
.TH-log-item.TH-warn {
  background: rgba(255, 208, 0, 0.4);
}
.TH-log-item.TH-error {
  background: var(--crimson-hover);
}
</style>
