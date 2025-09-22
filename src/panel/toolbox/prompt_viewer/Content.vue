<template>
  <!-- prettier-ignore -->
  <div id="prompt-view-content" class="flex h-full flex-col overflow-hidden bg-(--SmartThemeBotMesBlurTintColor) p-1">
    <div class="z-1 flex-shrink-0">
      <div class="mb-0.75 flex items-center justify-between p-1">
        <div class="flex flex-col gap-0.25">
        <div
class="
  text-(length:--TH-FontSize)
  font-bold text-(--SmartThemeQuoteColor)
">总token数: 0</div>
        <div
class="
  text-(length:--TH-FontSizeSm)
  text-(--SmartThemeQuoteColor)
">共 0 条消息</div></div>
        <div
          id="prompt-view-status-fresh"
          :class="[
            `
              fa-solid fa-rotate-right cursor-pointer
              text-(length:--TH-FontSize)
              duration-200
            `,
            { 'animate-spin': isRefreshing }
          ]"
          title="刷新"
          @click="handleRefresh"
        ></div>
      </div>
      <div class="my-0.75 flex flex-col bg-(--grey5020a) px-0.5 py-1">
        <div class="flex items-center justify-between gap-0.5">
          <div
id="prompt-filter-icon" class="
  flex h-(--TH-FontSizeL) w-(--TH-FontSizeL) cursor-pointer items-center justify-center text-(--SmartThemeQuoteColor)
" title="筛选消息类型">
            <i class="fa-solid fa-filter"></i>
          </div>
          <div class="relative mr-1 flex-grow">
            <input
id="prompt-search" type="text" class="
  h-(--TH-FontSizeL) w-full rounded-sm border border-(--SmartThemeBorderColor) bg-transparent py-0.5 pr-8 pl-1
  text-(length:--TH-FontSize)
  text-(--mainTextColor)
" placeholder="搜索消息内容..." />
            <div
class="
  pointer-events-auto absolute top-[25%] right-1 flex items-center rounded-sm
  text-(length:--TH-FontSizeSm)
  whitespace-nowrap text-(--SmartThemeBodyColor)
">
              <input
id="prompt-search-compact-mode" type="checkbox"
                class="mr-0.25 mb-0 h-(--TH-FontSizeSm) w-(--TH-FontSizeSm)" />
              <label for="prompt-search-compact-mode">仅显示匹配</label>
            </div>
          </div>
        </div>
        <div id="prompt-filter-options" class="flex flex-wrap gap-1 pt-1 pr-1 pb-0 pl-0.5" style="display: none">
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
    <div class="relative hidden flex-1">
      <div class="h-full overflow-x-hidden overflow-y-auto">
        <div class="absolute inset-0 z-10 hidden text-center">
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { eventSource, event_types, Generate, online_status, stopGeneration } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';
import { chat_completion_sources, oai_settings } from '@sillytavern/scripts/openai';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';
import { onMounted, onUnmounted, ref } from 'vue';

interface PromptData {
  role: string;
  content: string;
  token: number;
}

const isRefreshing = ref<boolean>(false);
const promptViewUpdater: ((prompts: PromptData[], totalTokens: number) => void | Promise<void>) | null = null;
let isRefreshPromptViewCall = false;

/**
 * 检查当前API是否为 Chat Completion 类型
 * @returns {boolean} 如果 mainApi 在 chat_completion_sources 的值中则返回 true
 */
function isChatCompletion() {
  const mainApi = getContext().mainApi;
  return typeof mainApi === 'string' && Object.values(chat_completion_sources).includes(mainApi);
}

function onChatCompletionPromptReady(data: { chat: { role: string; content: string }[]; dryRun: boolean }): void {
  if (data.dryRun) {
    return;
  }

  if (!isChatCompletion()) {
    toastr.error('当前 API 不是聊天补全类型, 无法使用提示词查看器功能', '不支持的 API 类型');
    return;
  }

  if (isRefreshPromptViewCall) {
    stopGeneration();
    isRefreshPromptViewCall = false;
  }

  setTimeout(async () => {
    if (!promptViewUpdater) {
      return;
    }

    const prompts = await Promise.all(
      data.chat.map(async ({ role, content }) => {
        return {
          role,
          content: content,
          token: await getTokenCountAsync(content),
        };
      }),
    );
    const totalTokens = await getTokenCountAsync(prompts.map(prompt => prompt.content).join('\n'));
    await promptViewUpdater(prompts, totalTokens);
    isPostProcessing();
  });
}

/*
 * 检查是否经过了系统消息压缩或者后处理
 * 检查两个条件，如果都符合则插入两个警告条幅
 */
function isPostProcessing(): void {
  const $header = $('.prompt-view-header');
  if ($header.find('.prompt-view-process-warning').length > 0) {
    $header.find('.prompt-view-process-warning').remove();
  }

  const hasSquashMessages = oai_settings.squash_system_messages === true;

  const hasCustomPostProcessing = oai_settings.custom_prompt_post_processing != '';

  insertMessageMergeWarning($header, '💡 这个窗口打开时, 你也可以自己发送消息来刷新提示词发送情况');

  if (hasSquashMessages) {
    insertMessageMergeWarning($header, '⚠️ 本次提示词发送经过了预设中的“系统消息压缩”合并处理');
  }

  if (hasCustomPostProcessing) {
    insertMessageMergeWarning($header, '⚠️ 本次提示词发送经过了API中的“提示词后处理”合并处理');
  }
}

/**
 * 在顶部插入系统消息压缩/后处理的警告
 */
function insertMessageMergeWarning(scope: JQuery<HTMLElement>, message: string): void {
  const $warning = $('<div class="prompt-view-process-warning">');
  $warning.text(message);
  scope.prepend($warning);
}

/**
 * 停止事件监听
 */
function stopListening(): void {
  eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
}

/**
 * 处理刷新按钮点击事件
 */
function handleRefresh(): void {
  if (isRefreshing.value) {
    return;
  }
  isRefreshing.value = true;
  setTimeout(() => {
    isRefreshing.value = false;
  }, 2000);
  
  // 如果不是聊天补全，直接返回
  if (!isChatCompletion()) {
    toastr.error('当前 API 不是聊天补全类型, 无法使用提示词查看器功能', '不支持的 API 类型');
    return;
  }

  // 检查API连接状态，如果未连接则直接更新UI显示连接错误
  if (online_status === 'no_connection') {
    if (promptViewUpdater) {
      promptViewUpdater([], 0);
    }
    return;
  }

  isRefreshPromptViewCall = true;
  Generate('normal');
}

// 组件挂载时添加事件监听器
onMounted(() => {
  eventSource.on(event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
});

// 组件卸载时移除事件监听器（备用清理）
onUnmounted(() => {
  stopListening();
});
</script>
