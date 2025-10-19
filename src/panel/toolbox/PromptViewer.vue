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
        <!-- TODO(4.0): 调整位置和样式 -->
        <div class="flex items-center gap-1">
          <div class="fa-solid fa-expand cursor-pointer" title="展开全部" @click="toggleAll(true)" />
          <div class="fa-solid fa-compress cursor-pointer" title="收起全部" @click="toggleAll(false)" />
          <div
            class="fa-solid fa-rotate-right cursor-pointer text-base duration-200"
            :class="{ 'animate-spin': is_refreshing }"
            title="刷新"
            @click="triggerRefresh"
          />
        </div>
      </div>
      <div class="my-0.75 flex flex-col gap-0.5 bg-(--grey5020a) p-0.5">
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
            class="grow rounded-sm bg-transparent text-base text-(--mainTextColor)"
            :placeholder="t`搜索消息内容...`"
          />
          <!-- prettier-ignore-attribute -->
          <div
            class="
              pointer-events-auto mr-0.5 flex flex-shrink-0 items-center rounded-sm text-sm whitespace-nowrap
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
        </Teleport>
      </div>
    </div>
    <template v-if="is_refreshing">
      <div class="mx-2 flex h-full items-center justify-center gap-1 opacity-70">
        <div class="TH-loading-spinner"></div>
        <span class="whitespace-normal">正在发送虚假生成请求, 从而获取最新提示词...</span>
      </div>
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
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';
import { version } from '@/util/tavern';
import { event_types, Generate, main_api, online_status, stopGeneration } from '@sillytavern/script';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import { compare } from 'compare-versions';
import { Teleport } from 'vue';
import { VirtList } from 'vue-virt-list';

const is_filter_opened = ref<boolean>(false);
const teleportTarget = useTemplateRef<HTMLElement>('teleportTarget');

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
</script>

<style scoped>
.TH-loading-spinner {
  width: var(--mainFontSize);
  height: var(--mainFontSize);
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
