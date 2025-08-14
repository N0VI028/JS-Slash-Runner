import { insertMessageMergeWarning } from '@/component/prompt_view/view';
import { Generate, online_status, stopGeneration } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';
import { chat_completion_sources, oai_settings } from '@sillytavern/scripts/openai';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';

interface PromptData {
  role: string;
  content: string;
  token: number;
}

let promptViewUpdater: ((prompts: PromptData[], totalTokens: number) => void | Promise<void>) | null = null;

let isRefreshPromptViewCall = false;

/**
 * 设置提示词查看器更新函数
 * @param updater 更新函数
 */
export function setPromptViewUpdater(
  updater: ((prompts: PromptData[], totalTokens: number) => void | Promise<void>) | null,
): void {
  promptViewUpdater = updater;
}

/**
 * 检查当前API是否为 Chat Completion 类型
 * @returns {boolean} 如果 mainApi 在 chat_completion_sources 的值中则返回 true
 */
function isChatCompletion() {
  const mainApi = getContext().mainApi;
  return typeof mainApi === 'string' && Object.values(chat_completion_sources).includes(mainApi);
}

/**
 * 更新提示词查看器
 * @param data 聊天数据
 */
export function onChatCompletionPromptReady(data: Parameters<ListenerType['chat_completion_prompt_ready']>[0]) {
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

/**
 * 触发一次生成请求以手动刷新 UI, 将会在 onChatCompletionPromptReady 时拦截生成以停止生成
 */
export function refreshPromptView() {
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

/*
 * 检查是否经过了系统消息压缩或者后处理
 * 检查两个条件，如果都符合则插入两个警告条幅
 */
function isPostProcessing() {
  const $header = $('.prompt-view-header');
  if ($header.find('.prompt-view-process-warning').length > 0) {
    $header.find('.prompt-view-process-warning').remove();
  }

  const hasSquashMessages = oai_settings.squash_system_messages === true;

  const hasCustomPostProcessing = oai_settings.custom_prompt_post_processing != '';

  if (hasSquashMessages) {
    insertMessageMergeWarning($header, 'squash');
  }

  if (hasCustomPostProcessing) {
    insertMessageMergeWarning($header, 'post-processing');
  }
}
