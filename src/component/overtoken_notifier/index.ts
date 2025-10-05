import tip from '@/component/overtoken_notifier/tip.md';
import { tavern_events } from '@/function/event';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { chat, eventSource } from '@sillytavern/script';
import { callGenericPopup, POPUP_TYPE } from '@sillytavern/scripts/popup';
import { getTokenCountAsync } from '@sillytavern/scripts/tokenizers';

export const defaultOvertokenNotifierSettings = {
  threshold: 80,
};

export async function initOvertokenNotifierPanel() {
  let threshold = getSettingValue('overtoken_notifier.threshold') ?? defaultOvertokenNotifierSettings.threshold;
  $('#overtoken-notifier-threshold')
    .val(threshold)
    .on('change', function (event) {
      threshold = Number($(event.target).val());
      saveSettingValue('overtoken_notifier.threshold', threshold);
    });

  const onChatCompletionPromptReady = () => {
    if (threshold === 0) {
      return;
    }
    const computed_threshold = threshold * 1000;

    setTimeout(async () => {
      // 依次计算 toekn 从而利用酒馆对 token 的缓存
      const tokens = await Promise.all(
        chat.map(async message => {
          return await getTokenCountAsync(message.content);
        }),
      );
      const total_tokens = tokens.reduce((result, current) => result + current, 0);
      if (total_tokens > computed_threshold) {
        toastr.warning(
          `<u>点击查看如何减少 token</u><br>如果不想被提醒，请通过 '酒馆助手-工具箱' 关闭此功能`,
          `token 数 (${total_tokens}) 超过建议 (${computed_threshold})`,
          {
            escapeHtml: false,
            onclick: () => {
              callGenericPopup(tip, POPUP_TYPE.TEXT, '', {
                allowHorizontalScrolling: true,
                leftAlign: true,
              });
            },
          },
        );
      }
    });
  };

  eventSource.on(tavern_events.CHAT_COMPLETION_PROMPT_READY, _.debounce(onChatCompletionPromptReady, 1000));
}
