<template>
  <div class="flex h-full flex-col overflow-hidden bg-(--SmartThemeBotMesBlurTintColor) p-1">
    <div class="z-1 flex-shrink-0 text-wrap">
      <div class="mb-0.75 flex items-center justify-between p-0.5">
        <div class="flex flex-col gap-0.25">
          <div class="text-base font-bold text-(--SmartThemeQuoteColor)">
            {{ t`总token数` }}: {{ filtered_prompts.reduce((result, prompt) => result + prompt.token, 0) }}
          </div>
          <div class="text-sm text-(--SmartThemeQuoteColor)">
            {{ t`${filtered_prompts.length}/${prompts.length} 条消息` }}
          </div>
        </div>
        <div
          class="fa-solid fa-rotate-right cursor-pointer text-base duration-200"
          :class="{ 'animate-spin': is_refreshing }"
          title="刷新"
          @click="triggerRefresh"
        />
        <div class="fa-solid fa-question" title="使用说明" @click="showHelp" />
      </div>
      <div class="my-0.75 flex flex-col bg-(--grey5020a) p-0.5">
        <div class="flex items-center justify-between gap-0.5">
          <div
            class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
            @click="is_filter_opened = !is_filter_opened"
          >
            <i class="fa-solid fa-filter" />
          </div>
          <div class="relative mr-1 flex-grow">
            <!-- prettier-ignore-attribute -->
            <SearchBar
              v-model="search_input"
              class="
                h-2 w-full rounded-sm border border-(--SmartThemeBorderColor) bg-transparent py-0.5 pr-8 pl-1 text-base
                text-(--mainTextColor)
              "
              :placeholder="t`搜索消息内容...`"
            />
            <!-- prettier-ignore-attribute -->
            <div
              class="
                pointer-events-auto absolute top-[25%] right-1 flex items-center rounded-sm text-sm whitespace-nowrap
                text-(--SmartThemeBodyColor)
              "
            >
              <input v-model="matched_only" type="checkbox" class="mr-0.25 mb-0 h-0.75 w-0.75" />
              <label for="prompt-search-compact-mode">{{ t`仅显示匹配` }}</label>
            </div>
          </div>
        </div>
        <template v-if="is_filter_opened">
          <div class="mx-0.5 mt-0.5 flex gap-1">
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="system" />
              system
            </div>
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="user" />
              user
            </div>
            <div class="flex items-center gap-0.5">
              <input v-model="roles_to_show" type="checkbox" value="assistant" />
              assistant
            </div>
          </div>
        </template>
        <!-- TODO: 调整位置和样式 -->
        <div class="fa-solid fa-expand" title="展开全部" @click="toggleAll(true)" />
        <div class="fa-solid fa-compress" title="收起全部" @click="toggleAll(false)" />
      </div>
    </div>
    <template v-if="is_refreshing">
      <!-- TODO: 调整样式 -->
      正在发送虚假生成请求, 从而获取最新提示词...
    </template>
    <template v-else>
      <VirtList ref="virt_list" item-key="id" :list="filtered_prompts" :min-size="20" :item-gap="7">
        <template #default="{ itemData: item_data }">
          <div class="rounded-md border border-(--SmartThemeBorderColor) p-0.5 text-(--SmartThemeBodyColor)">
            <div
              class="flex cursor-pointer items-center justify-between rounded-md rounded-b-none"
              @click="is_expanded[item_data.id] = !is_expanded[item_data.id]"
            >
              <span>
                Role: <span>{{ item_data.role }}</span> | Token: <span>{{ item_data.token }}</span>
              </span>
              <div class="fa-solid fa-circle-chevron-down"></div>
            </div>
            <template v-if="is_expanded[item_data.id]">
              <Divider />
              <!-- prettier-ignore-attribute -->
              <div
                class="
                  mt-0.5 max-h-[40%] overflow-x-hidden overflow-y-auto rounded-b-md leading-[1.4] break-words
                  whitespace-pre-wrap text-(--mainFontSize)
                "
              >
                <Content :content="item_data.content" :search-input="search_input" :matched-only="matched_only" />
              </div>
            </template>
          </div>
        </template>
      </VirtList>
    </template>
  </div>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';
import help_en from '@/panel/toolbox/prompt_viewer/help_en.md?raw';
import help_zh from '@/panel/toolbox/prompt_viewer/help_zh.md?raw';
import { version } from '@/util/tavern';
import { event_types, Generate, main_api, online_status, stopGeneration } from '@sillytavern/script';
import { getCurrentLocale } from '@sillytavern/scripts/i18n';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import { compare } from 'compare-versions';
import { marked } from 'marked';
import { VirtList } from 'vue-virt-list';

const is_filter_opened = ref<boolean>(false);

export interface PromptData {
  id: number;
  role: string;
  content: string;
  token: number;
}

const virt_list_ref = useTemplateRef('virt_list');

const prompts = shallowRef<PromptData[]>([]);
const roles_to_show = ref<string[]>(['system', 'user', 'assistant']);
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
function toggleAll(should_expand: boolean) {
  is_expanded.value = _.times(prompts.value.length, _.constant(should_expand));
  should_expand_by_default.value = should_expand;
}

const is_refreshing = ref<boolean>(false);
triggerRefresh();
function triggerRefresh(): void {
  if (is_refreshing.value) {
    return;
  }

  if (main_api !== 'openai') {
    toastr.error(t`当前 API 不是聊天补全, 无法使用提示词查看器功能`);
    return;
  }

  if (online_status === 'no_connection') {
    toastr.error(t`未连接到 API, 提示词查看器将无法获取数据`);
    return;
  }

  is_refreshing.value = true;
  Generate('normal');
}
function collectPrompts(data: { role: string; content: string }[], dry_run: boolean) {
  if (dry_run) {
    return;
  }

  if (is_refreshing.value) {
    stopGeneration();
    is_refreshing.value = false;
  }

  setTimeout(async () => {
    prompts.value = await Promise.all(
      data.map(async ({ role, content }, index) => {
        return {
          id: index,
          role,
          content: content,
          token: await getTokenCountAsync(content),
        };
      }),
    );
    is_expanded.value = _.times(data.length, _.constant(should_expand_by_default.value));
    virt_list_ref.value?.forceUpdate();
  });
}

if (compare(version, '1.13.4', '<=')) {
  useEventSourceOn(
    event_types.CHAT_COMPLETION_PROMPT_READY,
    (data: { chat: { role: string; content: string }[]; dryRun: boolean }) => {
      collectPrompts(data.chat, data.dryRun);
    },
  );
} else {
  useEventSourceOn(
    event_types.GENERATE_AFTER_DATA,
    (data: { prompt: { role: string; content: string }[] }, dry_run: boolean) => {
      collectPrompts(data.prompt, dry_run);
    },
  );
}

const { open: showHelp } = useModal({
  component: Popup,
  slots: {
    default: marked.parse(getCurrentLocale().includes('zh') ? help_zh : help_en),
  },
});
</script>
