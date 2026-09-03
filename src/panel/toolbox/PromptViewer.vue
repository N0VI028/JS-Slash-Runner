<template>
  <div class="flex h-full flex-col overflow-hidden p-1">
    <div class="z-1 mb-0.5 flex shrink-0 flex-col gap-0.75 text-wrap">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.25">
          <div class="th-text-base font-bold text-(--SmartThemeQuoteColor)">
            {{ t`总token数` }}: {{ filtered_prompts.reduce((result, prompt) => result + prompt.token, 0) }}
          </div>
          <div class="th-text-sm text-(--SmartThemeQuoteColor)">
            {{ t`${filtered_prompts.length}/${prompts.length} 条消息` }}
          </div>
        </div>
        <div class="flex items-center gap-1">
          <div class="fa-solid fa-expand cursor-pointer" title="展开全部" @click="toggleAll(true)" />
          <div class="fa-solid fa-compress cursor-pointer" title="收起全部" @click="toggleAll(false)" />
          <div class="fa-solid fa-copy cursor-pointer" title="复制全部" @click="copyAll" />
          <div
            class="fa-solid fa-rotate-right cursor-pointer th-text-base duration-200"
            :class="{ 'animate-spin': state === 'refreshing' }"
            title="刷新"
            @click="triggerRefresh"
          />
        </div>
      </div>
      <div class="flex flex-col gap-0.5 bg-(--grey5020a) p-0.5">
        <div class="flex items-center gap-0.5">
          <div
            class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
            @click="is_filter_opened = !is_filter_opened"
          >
            <i class="fa-solid fa-filter" />
          </div>
          <!-- prettier-ignore-attribute -->
          <SearchBar
            v-model="search_input"
            class="grow rounded-sm bg-transparent th-text-base text-(--mainTextColor)"
            :placeholder="t`搜索消息内容...`"
          />
          <!-- prettier-ignore-attribute -->
          <div
            class="
              pointer-events-auto mr-0.5 flex shrink-0 items-center rounded-sm th-text-sm whitespace-nowrap
              text-(--SmartThemeBodyColor)
            "
          >
            <input v-model="matched_only" type="checkbox" class="mr-0.25 mb-0 h-0.75 w-0.75" />
            <label for="prompt-search-compact-mode">{{ t`仅显示匹配` }}</label>
          </div>
        </div>
        <div v-if="is_filter_opened" ref="teleportTarget" class="flex items-center gap-0.5"></div>
        <Teleport v-if="teleportTarget" :to="teleportTarget">
          <div class="flex gap-1">
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="system" />
              ⚙️ system
            </div>
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="user" />
              👤 user
            </div>
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="assistant" />
              🤖 assistant
            </div>
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="tool" />
              🔧 tool
            </div>
          </div>
        </Teleport>
      </div>
      <div class="flex items-center justify-between gap-1 border-b border-(--SmartThemeBorderColor) py-0.25">
        <span class="overflow-hidden th-text-sm text-ellipsis whitespace-nowrap">{{ t`模型` }}: {{ model }}</span>
        <span class="overflow-hidden th-text-sm text-ellipsis whitespace-nowrap">{{ t`预设` }}: {{ preset }}</span>
      </div>
    </div>
    <template v-if="state !== 'idle'">
      <div class="mx-2 flex h-full items-center justify-center gap-1 opacity-70">
        <div class="TH-loading-spinner"></div>
        <span class="whitespace-normal">{{ hint_text }}</span>
      </div>
    </template>
    <template v-else>
      <div ref="virt_list_container" class="flex-1 overflow-hidden">
        <VirtList ref="virt_list" item-key="id" :list="filtered_prompts" :item-gap="7" :buffer="10">
          <template #default="{ itemData: item_data }">
            <div class="rounded-md border border-(--SmartThemeBorderColor) p-0.5 text-(--SmartThemeBodyColor)">
              <div
                class="flex cursor-pointer items-center justify-between rounded-md rounded-b-none"
                @click="is_expanded[item_data.id] = !is_expanded[item_data.id]"
              >
                <span>
                  Role:
                  <span> {{ roleIcons[item_data.role] }} {{ item_data.role }} </span>
                  <!-- tool 消息显示关联 ID -->
                  <template v-if="item_data.role === 'tool' && item_data.tool_call_id">
                    | Tool Call ID: <code class="tool-call-id-code">{{ item_data.tool_call_id }}</code>
                  </template>
                  | Tokens: <span>{{ item_data.token }}</span>
                </span>
                <div class="flex items-center gap-0.5">
                  <div
                    class="fa-solid fa-copy cursor-pointer"
                    title="复制"
                    @click.stop="copyPrompt(item_data.content)"
                  />
                  <div class="fa-solid fa-chevron-down duration-200" :class="{ 'rotate-180': is_expanded[item_data.id] }" />
                </div>
              </div>
              <!-- tool_calls 结构化折叠展示 -->
              <details
                v-if="item_data.tool_calls?.length"
                class="mt-0.5 rounded-sm border border-(--SmartThemeBorderColor) p-0.5"
                :open="is_tool_calls_expanded[item_data.id]"
                @toggle="handleToolCallsToggle(item_data.id, $event)"
              >
                <summary class="cursor-pointer font-semibold text-(--SmartThemeQuoteColor) select-none">
                  🔧 Tool Calls ({{ item_data.tool_calls.length }})
                </summary>
                <div class="mt-0.5 flex flex-col gap-0.5 pl-1">
                  <div
                    v-for="(tc, tc_index) in item_data.tool_calls"
                    :key="tc.id || tc_index"
                    class="border-t border-(--SmartThemeBorderColor)/50 pt-0.5 first:border-t-0 first:pt-0"
                  >
                    <div class="font-mono text-xs text-(--SmartThemeQuoteColor)">
                      #{{ Number(tc_index) + 1 }} {{ tc.function.name }}
                      <span v-if="tc.id" class="opacity-60">({{ tc.id }})</span>
                    </div>
                    <pre class="mt-0.25 overflow-x-auto rounded-xs bg-(--grey5020a) p-0.5 font-mono text-xs">{{
                      formatToolArguments(tc.function.arguments)
                    }}</pre>
                  </div>
                </div>
              </details>
              <template v-if="is_expanded[item_data.id]">
                <div class="my-0.5 border-t border-(--SmartThemeBorderColor)" />
                <div :style="expanded_content_style">
                  <ImageGallery v-if="item_data.images.length > 0" :images="item_data.images" />
                  <Content
                    :content="item_data.content"
                    :search-input="search_input"
                    :matched-only="matched_only"
                    :marks="wiMarksOf(item_data.id)"
                  />
                </div>
              </template>
            </div>
          </template>
        </VirtList>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SendingMessage } from '@/function/event';
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';
import ImageGallery from '@/panel/toolbox/prompt_viewer/ImageGallery.vue';
import { toWiMarks, type WiMark } from '@/panel/toolbox/prompt_viewer/wi_tracer/marks';
import { createPromptData, type PromptData } from '@/panel/toolbox/prompt_viewer/prompt_data';
import { setupWorldInfoTracer, wi_trace_report } from '@/panel/toolbox/prompt_viewer/wi_tracer/trace';
import { usePresetSettingsStore } from '@/store/settings';
import { copyText } from '@/util/compatibility';
import {
  event_types,
  eventSource,
  Generate,
  is_send_press,
  main_api,
  online_status,
  stopGeneration,
} from '@sillytavern/script';
import { getChatCompletionModel } from '@sillytavern/scripts/openai';
import { useLocalStorage, useResizeObserver, useThrottleFn } from '@vueuse/core';
import _ from 'lodash';
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, Teleport, toRef, useTemplateRef, watch } from 'vue';
import { VirtList } from 'vue-virt-list';

const is_filter_opened = ref<boolean>(false);
const teleportTarget = useTemplateRef<HTMLElement>('teleportTarget');

const roleIcons: Record<string, string> = {
  system: '⚙️',
  user: '👤',
  assistant: '🤖',
  tool: '🔧',
};

const virt_list_ref = useTemplateRef('virt_list');
const virt_list_container_ref = useTemplateRef<HTMLElement>('virt_list_container');

const container_height = ref(0);

useResizeObserver(
  virt_list_container_ref,
  useThrottleFn(entries => {
    const entry = entries[0];
    if (entry) {
      container_height.value = entry.contentRect.height;
      // 触发虚拟列表重算，避免滚动位置错位
      nextTick(() => {
        virt_list_ref.value?.forceUpdate();
      });
    }
  }, 16),
);

const expanded_content_style = computed(() => {
  if (container_height.value <= 0) {
    return { maxHeight: '40vh', overflowY: 'auto' as const, overflowX: 'hidden' as const };
  }
  return {
    maxHeight: `${container_height.value * 0.7}px`,
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
  };
});

const model = ref<string>(getChatCompletionModel());
useEventSourceOn(event_types.CHATCOMPLETION_MODEL_CHANGED, () => {
  model.value = getChatCompletionModel();
});

const preset = toRef(() => usePresetSettingsStore().name);

// 接线世界书与预设条目追溯：仅在提示词查看器存活期间监听事件，结果经 wi_trace_report 在 UI 内联标注
setupWorldInfoTracer();

/** 世界书与预设内联标注：消息 index → 标记数组（报告发布/清空时自动重算） */
const wi_marks = computed(() => {
  const report = wi_trace_report.value;
  if (!report?.segments.length) return new Map<number, WiMark[]>();
  const groups = Map.groupBy(report.segments, segment => segment.messageIndex);
  return new Map([...groups].map(([index, segments]) => [index, toWiMarks(segments)]));
});

/** 取某条消息的世界书/预设标记（无标记时为 undefined，传给 Content） */
function wiMarksOf(id: number): WiMark[] | undefined {
  return wi_marks.value.get(id);
}

const prompts = shallowRef<PromptData[]>([]);
const roles_to_show = ref<string[]>(['system', 'user', 'assistant', 'tool']);
const search_input = ref<RegExp | null>(null);
const matched_only = useLocalStorage<boolean>('TH-PromptViewer:matched_only', false);
const filtered_prompts = computed(() => {
  return _(prompts.value)
    .filter(prompt => roles_to_show.value.includes(prompt.role))
    .filter(prompt => search_input.value === null || search_input.value.test(prompt.content))
    .value();
});

const should_expand_by_default = useLocalStorage<boolean>('TH-PromptViewer:should_expand_by_default', false);
const is_expanded = ref<boolean[]>([]);
const is_tool_calls_expanded = ref<boolean[]>([]);
function toggleAll(should_expand: boolean) {
  is_expanded.value = _.times(prompts.value.length, _.constant(should_expand));
  is_tool_calls_expanded.value = _.times(prompts.value.length, _.constant(should_expand));
  should_expand_by_default.value = should_expand;
}

function handleToolCallsToggle(id: number, event: Event) {
  const details = event.target as HTMLDetailsElement;
  is_tool_calls_expanded.value[id] = details.open;
}

watch(
  () => [filtered_prompts, is_expanded, wi_marks],
  () => {
    virt_list_ref.value?.forceUpdate();
  },
);

const state = ref<'idle' | 'past_loading' | 'refreshing' | 'loading'>('idle');
const hint_text = computed(() => {
  switch (state.value) {
    case 'past_loading':
      return t`等待已有生成请求完成... (或用刷新按钮强制取消它)`;
    case 'refreshing':
      return t`正在发送虚假生成请求, 从而获取最新提示词...`;
    case 'loading':
      return t`正在获取生成请求中的提示词...`;
    case 'idle':
    default:
      return '';
  }
});

if (is_send_press) {
  state.value = 'past_loading';
  // 在打开提示词查看器时已经进行的生成结束后, 如果提示词查看器仍为空, 则触发刷新
  const triggerRefreshIfNoPrompts = () => {
    if (prompts.value.length === 0) {
      triggerRefresh();
    }
  };
  eventSource.on(event_types.GENERATION_ENDED, triggerRefreshIfNoPrompts);
  onBeforeUnmount(() => eventSource.removeListener(event_types.GENERATION_ENDED, triggerRefreshIfNoPrompts));
} else {
  triggerRefresh();
}

function triggerRefresh(): void {
  if (state.value === 'refreshing') {
    return;
  }

  if (main_api !== 'openai') {
    toastr.error(t`当前 API 不是聊天补全, 无法使用提示词查看器功能`, t`提示词查看器`);
    return;
  }

  if (online_status === 'no_connection') {
    toastr.error(t`未连接到 API, 提示词查看器将无法获取数据`, t`提示词查看器`);
    return;
  }

  state.value = 'refreshing';
  Generate('normal');
}

/** 格式化 tool_calls 的 arguments 参数字符串为易读的 JSON 文本 */
function formatToolArguments(raw_args: string): string {
  try {
    const parsed = JSON.parse(raw_args);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return raw_args;
  }
}

function collectPrompts(data: SendingMessage[]) {
  if (state.value === 'refreshing') {
    stopGeneration();
  }

  setTimeout(async () => {
    prompts.value = await Promise.all(
      data.map(({ role, content, tool_calls, tool_call_id }, index) =>
        createPromptData(index, role, content, tool_calls, tool_call_id),
      ),
    );
    is_expanded.value = _.times(data.length, _.constant(should_expand_by_default.value));
    is_tool_calls_expanded.value = _.times(data.length, _.constant(should_expand_by_default.value));
    state.value = 'idle';
  });
}

useEventSourceOn(event_types.GENERATION_STARTED, (_type, _option, dry_run) => {
  if (!dry_run && state.value === 'idle') {
    state.value = 'loading';
  }
});
useEventSourceOn(event_types.CHAT_COMPLETION_SETTINGS_READY, completion => {
  collectPrompts(completion.messages);
});

function copyAll() {
  const content = _(filtered_prompts.value)
    .map(prompt => {
      const tool_calls_text = prompt.tool_calls?.length
        ? `\nTool Calls:\n${JSON.stringify(prompt.tool_calls, null, 2)}`
        : '';
      return `${prompt.role}:\n${prompt.content}${tool_calls_text}`;
    })
    .join('\n\n');
  copyText(content);
  toastr.success(t`已复制全部提示词到剪贴板`);
}

/**
 * 复制单个提示词内容到剪贴板
 * @param content 提示词内容
 */
function copyPrompt(content: string) {
  copyText(content);
  toastr.success(t`已复制提示词到剪贴板`);
}
</script>

<style scoped>
@reference '../../global.css';

.wrap-break-word {
  overflow-wrap: break-word;
  word-break: break-word;
}
</style>
