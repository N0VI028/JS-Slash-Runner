<template>
  <div class="flex h-full flex-col overflow-hidden bg-(--SmartThemeBotMesBlurTintColor) p-1">
    <div class="z-1 flex-shrink-0">
      <Transition>
        <template v-if="!is_tips_hide">
          <div class="TH-prompt-view-tips">💡 这个窗口打开时, 你也可以自己发送消息来刷新提示词发送情况</div>
          <div v-if="oai_settings.squash_system_messages === true" class="TH-prompt-view-tips">
            ⚠️ 本次提示词发送经过了预设中的“系统消息压缩”合并处理
          </div>
        </template>
      </Transition>
      <div class="mb-0.75 flex items-center justify-between p-0.75">
        <div class="flex flex-col gap-0.25">
          <div class="text-(length:--TH-FontSize-base) font-bold text-(--SmartThemeQuoteColor)">
            总token数: {{ filtered_prompts.reduce((result, prompt) => result + prompt.token, 0) }}
          </div>
          <div class="text-(length:--TH-FontSize-sm) text-(--SmartThemeQuoteColor)">
            共 {{ filtered_prompts.length }} 条消息
          </div>
        </div>
        <div
          class="fa-solid fa-rotate-right cursor-pointer text-(length:--TH-FontSize-base) duration-200"
          :class="{ 'animate-spin': is_refreshing }"
          title="刷新"
          @click="handleRefresh"
        ></div>
      </div>
      <div class="my-0.75 flex flex-col bg-(--grey5020a) p-0.5">
        <div class="flex items-center justify-between gap-0.5">
          <!-- prettier-ignore-attribute -->
          <div
            class="
              flex h-(--TH-FontSize-xl) w-(--TH-FontSize-xl) cursor-pointer items-center justify-center
              text-(--SmartThemeQuoteColor)
            "
            title="筛选消息类型"
          >
            <i class="fa-solid fa-filter"></i>
          </div>
          <div class="relative mr-1 flex-grow">
            <!-- prettier-ignore-attribute -->
            <input
              type="text"
              class="
                h-(--TH-FontSize-xl) w-full rounded-sm border border-(--SmartThemeBorderColor) bg-transparent py-0.5
                pr-8 pl-1
                text-(length:--TH-FontSize-base)
                text-(--mainTextColor)
              "
              placeholder="搜索消息内容..."
            />
            <!-- prettier-ignore-attribute -->
            <div
              class="
                pointer-events-auto absolute top-[25%] right-1 flex items-center rounded-sm
                text-(length:--TH-FontSize-sm)
                whitespace-nowrap text-(--SmartThemeBodyColor)
              "
            >
              <input type="checkbox" class="mr-0.25 mb-0 h-(--TH-FontSize-sm) w-(--TH-FontSize-sm)" />
              <label for="prompt-search-compact-mode">仅显示匹配</label>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-1 pt-1 pr-1 pb-0 pl-0.5" style="display: none">
          <div class="flex items-center gap-0.5">
            <input id="filter-system" type="checkbox" data-role="system" checked />
            <label for="filter-system">system</label>
          </div>
          <div class="flex items-center gap-0.5">
            <input id="filter-user" type="checkbox" data-role="user" checked />
            <label for="filter-user">user</label>
          </div>
          <div class="flex items-center gap-0.5">
            <input id="filter-assistant" type="checkbox" data-role="assistant" checked />
            <label for="filter-assistant">assistant</label>
          </div>
        </div>
      </div>
    </div>
    <VirtList item-key="id" :list="filtered_prompts" :min-size="20">
      <template #default="{ itemData }">
        <div class="rounded-md border border-(--SmartThemeBorderColor) p-0.5 text-(--SmartThemeBodyColor)">
          <div
            class="flex cursor-pointer items-center justify-between rounded-md rounded-b-none"
            @click="is_expanded[itemData.id] = !is_expanded[itemData.id]"
          >
            <span>
              Role: <span>{{ itemData.role }}</span> | Token: <span>{{ itemData.token }}</span>
            </span>
            <div class="fa-solid fa-circle-chevron-down"></div>
          </div>
          <template v-if="is_expanded[itemData.id]">
            <Divider />
            <!-- prettier-ignore-attribute -->
            <div
              class="
                mt-0.5 max-h-[40%] overflow-x-hidden overflow-y-auto rounded-b-md leading-[1.4] break-words
                whitespace-pre-wrap text-(--mainFontSize)
              "
            >
              <span>{{ itemData.content }}</span>
            </div>
          </template>
        </div>
      </template>
    </VirtList>
  </div>
</template>

<script setup lang="ts">
import { event_types, Generate, main_api, online_status, stopGeneration } from '@sillytavern/script';
import { oai_settings } from '@sillytavern/scripts/openai';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import { VirtList } from 'vue-virt-list';

export interface PromptData {
  id: number;
  role: string;
  content: string;
  token: number;
}

const prompts = shallowRef<PromptData[]>([]);
const is_expanded = ref<boolean[]>([]);
const is_refreshing = ref<boolean>(false);

const is_tips_hide = useTimeout(5000);

const filtered_prompts = computed(() => {
  // TODO: 处理身份筛选和搜索
  return prompts.value;
});

function handleRefresh(): void {
  if (is_refreshing.value) {
    return;
  }

  if (main_api !== 'openai') {
    toastr.error('当前 API 不是聊天补全类型, 无法使用提示词查看器功能', '不支持的 API 类型');
    return;
  }

  if (online_status === 'no_connection') {
    toastr.error('未连接到 API, 提示词查看器将无法获取数据', '未连接到 API');
    return;
  }

  is_refreshing.value = true;
  Generate('normal');
}
handleRefresh();

useEventSourceOn(
  event_types.CHAT_COMPLETION_PROMPT_READY,
  (data: { chat: { role: string; content: string }[]; dryRun: boolean }) => {
    if (data.dryRun) {
      return;
    }

    if (is_refreshing.value) {
      stopGeneration();
      is_refreshing.value = false;
    }

    setTimeout(async () => {
      prompts.value = await Promise.all(
        data.chat.map(async ({ role, content }, index) => {
          return {
            id: index,
            role,
            content: content,
            token: await getTokenCountAsync(content),
          };
        }),
      );
      is_expanded.value = _.times(data.chat.length, _.constant(false));
    });
  },
);
</script>

<style scoped>
@reference 'tailwindcss';

.TH-prompt-view-tips {
  background-color: rgba(248, 211, 0, 0.5);
  @apply text-(--black90a) text-(length:--TH-FontSize-xs) mb-0.25 rounded-sm p-0.25;
}

.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-leave-to {
  opacity: 0;
}
</style>
