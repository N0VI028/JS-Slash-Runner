<template>
  <div class="flex h-full flex-col overflow-hidden bg-(--SmartThemeBotMesBlurTintColor) p-1">
    <div class="z-1 flex-shrink-0 text-wrap">
      <div class="mb-0.75 flex items-center justify-between p-0.5">
        <div class="flex flex-col gap-0.25">
          <div class="text-base font-bold text-(--SmartThemeQuoteColor)">
            总token数: {{ filtered_prompts.reduce((result, prompt) => result + prompt.token, 0) }}
          </div>
          <div class="text-sm text-(--SmartThemeQuoteColor)">共 {{ filtered_prompts.length }} 条消息</div>
        </div>
        <div
          class="fa-solid fa-rotate-right cursor-pointer text-base duration-200"
          :class="{ 'animate-spin': is_refreshing }"
          title="刷新"
          @click="handleRefresh"
        ></div>
      </div>
      <div ref="filter_container" class="my-0.75 flex flex-col bg-(--grey5020a) p-0.5">
        <div class="flex items-center justify-between gap-0.5">
          <div
            class="flex h-2 w-2 cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)"
            @click="is_filter_opened = !is_filter_opened"
          >
            <i class="fa-solid fa-filter" />
          </div>
          <div class="relative mr-1 flex-grow">
            <!-- prettier-ignore-attribute -->
            <input
              type="text"
              class="
                h-2 w-full rounded-sm border border-(--SmartThemeBorderColor) bg-transparent py-0.5 pr-8 pl-1 text-base
                text-(--mainTextColor)
              "
              placeholder="搜索消息内容..."
            />
            <!-- prettier-ignore-attribute -->
            <div
              class="
                pointer-events-auto absolute top-[25%] right-1 flex items-center rounded-sm text-sm whitespace-nowrap
                text-(--SmartThemeBodyColor)
              "
            >
              <input type="checkbox" class="mr-0.25 mb-0 h-0.75 w-0.75" />
              <label for="prompt-search-compact-mode">仅显示匹配</label>
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
      </div>
    </div>
    <VirtList item-key="id" :list="filtered_prompts" :min-size="20" :item-gap="7">
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
              <span>{{ item_data.content }}</span>
            </div>
          </template>
        </div>
      </template>
    </VirtList>
  </div>
</template>

<script setup lang="ts">
import { event_types, Generate, main_api, online_status, stopGeneration } from '@sillytavern/script';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import { VirtList } from 'vue-virt-list';

const is_filter_opened = ref<boolean>(false);

export interface PromptData {
  id: number;
  role: string;
  content: string;
  token: number;
}

const roles_to_show = ref<string[]>(['system', 'user', 'assistant']);

const prompts = shallowRef<PromptData[]>([]);
const is_expanded = ref<boolean[]>([]);
const is_refreshing = ref<boolean>(false);

const filtered_prompts = computed(() => {
  return prompts.value.filter(prompt => roles_to_show.value.includes(prompt.role));
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

<style lang="scss" scoped></style>
