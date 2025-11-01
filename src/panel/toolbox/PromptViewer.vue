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
          <div
            class="fa-solid fa-rotate-right cursor-pointer th-text-base duration-200"
            :class="{ 'animate-spin': is_refreshing }"
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
      <div class="flex items-center justify-between gap-1 border-b border-(--SmartThemeBorderColor) py-0.25">
        <span class="overflow-hidden th-text-sm text-ellipsis whitespace-nowrap">{{ t`模型` }}: {{ model }}</span
        ><span class="overflow-hidden th-text-sm text-ellipsis whitespace-nowrap">{{ t`预设` }}: {{ preset }}</span>
      </div>
    </div>
    <template v-if="during_generation_when_opening">
      <div class="mx-2 flex h-full items-center justify-center gap-1 opacity-70">
        <div class="TH-loading-spinner"></div>
        <span class="whitespace-normal">{{ t`等待已有生成请求完成... (或用刷新按钮强制取消它)` }}</span>
      </div>
    </template>
    <template v-if="is_refreshing">
      <div class="mx-2 flex h-full items-center justify-center gap-1 opacity-70">
        <div class="TH-loading-spinner"></div>
        <span class="whitespace-normal">{{ t`正在发送虚假生成请求, 从而获取最新提示词...` }}</span>
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
                  mt-0.5 max-h-[40%] overflow-x-hidden overflow-y-auto rounded-b-md leading-[1.4] wrap-break-word
                  whitespace-pre-wrap text-(--mainFontSize)
                "
              >
                <Content :content="item_data.content" :search-input="search_input" :matched-only="matched_only" />
                <ImageGallery v-if="item_data.images && item_data.images.length" :images="item_data.images" />
              </div>
            </template>
          </div>
        </template>
      </VirtList>
    </template>
  </div>
</template>

<script setup lang="ts">
import { SendingMessage } from '@/function/event';
import Content from '@/panel/toolbox/prompt_viewer/Content.vue';
import ImageGallery from '@/panel/toolbox/prompt_viewer/ImageGallery.vue';
import { usePresetSettingsStore } from '@/store/settings';
import { getImageTokenCost, getVideoTokenCost, version } from '@/util/tavern';
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
  images?: { url: string }[];
  token: number;
}

const virt_list_ref = useTemplateRef('virt_list');

const model = ref<string>(getChatCompletionModel());
useEventSourceOn(event_types.CHATCOMPLETION_MODEL_CHANGED, () => {
  model.value = getChatCompletionModel();
});

const preset = toRef(usePresetSettingsStore(), 'name');

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
const during_generation_when_opening = ref<boolean>(false);
if (is_send_press) {
  during_generation_when_opening.value = true;
  const triggerRefreshIfNoPrompts = () => {
    during_generation_when_opening.value = false;
    if (prompts.value.length !== 0) {
      return;
    }
    triggerRefresh();
  };
  eventSource.on(event_types.GENERATION_ENDED, triggerRefreshIfNoPrompts);
  onBeforeUnmount(() => eventSource.removeListener(event_types.GENERATION_ENDED, triggerRefreshIfNoPrompts));
} else {
  triggerRefresh();
}
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

function collectPrompts(data: SendingMessage[], dry_run: boolean) {
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
        if (typeof content === 'string') {
          return {
            id: index,
            role,
            content,
            images: [],
            token: await getTokenCountAsync(content),
          } as PromptData;
        }

        const parsed = parseJsonContent(content as any);
        return {
          id: index,
          role,
          content: parsed.text,
          images: parsed.images,
          token: _.sum(
            await Promise.all(
              content.map(async item => {
                switch (item.type) {
                  case 'text':
                    return await getTokenCountAsync(item.text);
                  case 'image_url':
                    return await getImageTokenCost(item.image_url.url, item.image_url.detail);
                  case 'video_url':
                    // TODO： 用户附加的视频文件似乎根本不计入？content中没有，AI回复的视频未知
                    return await getVideoTokenCost(item.video_url.url);
                }
              }),
            ),
          ),
        } as PromptData;
      }),
    );
    is_expanded.value = _.times(data.length, _.constant(should_expand_by_default.value));
    virt_list_ref.value?.forceUpdate();
  });
}

/**
 * 解析多模态内容
 * @param content 内容
 * @returns 纯文本和图片列表
 */
function parseJsonContent(content: any): { text: string; images: { url: string }[] } {
  try {
    const text_parts: string[] = [];
    const images: { url: string }[] = [];
    for (const item of content) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      switch (item.type) {
        case 'text': {
          const text = item.text ?? '';
          text_parts.push(String(text));
          break;
        }
        case 'image_url': {
          const url: string = _.get(item, 'image_url.url', '');
          if (!url) {
            break;
          }
          images.push({ url });
          break;
        }
        case 'video_url': {
          // TODO: 视频如何处理？
          const url: string = _.get(item, 'video_url.url', '');
          if (url) {
            text_parts.push(`[Video] ${url}`);
          }
          break;
        }
        default: {
          text_parts.push(JSON.stringify(item));
        }
      }
    }
    // TODO: 有没有必要严格按照显示的顺序图文穿插显示？目前把图片全部放在最后了
    return { text: text_parts.join('\n\n'), images };
  } catch (e) {
    return { text: JSON.stringify(content, null, 2), images: [] };
  }
}

if (compare(version, '1.13.4', '<=')) {
  useEventSourceOn(event_types.CHAT_COMPLETION_PROMPT_READY, (data: { chat: any; dryRun: boolean }) => {
    collectPrompts(data.chat, data.dryRun);
  });
} else {
  useEventSourceOn(event_types.GENERATE_AFTER_DATA, (data: { prompt: any }, dry_run: boolean) => {
    collectPrompts(data.prompt, dry_run);
  });
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
