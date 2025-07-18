import { extensionFolderPath } from '@/util/extension_variables';
import { FloatingDialog } from '@/util/floating_dialog';

import { eventSource, event_types } from '@sillytavern/script';


import log from 'loglevel';

const templatePath = `${extensionFolderPath}/src/component/prompt_view/public`;

interface PromptData {
  role: string;
  content: string;
  token: number;
}

interface ChatCompletionEvent {
  dryRun: boolean;
  chat: Array<{ role: string; content: string }>;
}

/**
 * 存储事件监听器引用，用于清理
 */
let chatCompletionPromptReadyHandler: ((event: ChatCompletionEvent) => void) | null = null;

/**
 * 处理聊天完成提示词准备事件
 * @param event 聊天完成事件数据
 */
function handleChatCompletionPromptReady(event: ChatCompletionEvent): void {
  if (event.dryRun || SillyTavern.mainApi !== 'openai') {
    return;
  }

  setTimeout(async () => {
    const promptData: PromptData[] = await Promise.all(
      event.chat.map(async ({ role, content }) => ({
        role,
        content,
        token: await SillyTavern.getTokenCountAsync(content),
      })),
    );

    localStorage.setItem('prompt_inspector_data', JSON.stringify(promptData));
    localStorage.setItem(
      'prompt_inspector_token',
      String(await SillyTavern.getTokenCountAsync(promptData.map(item => item.content).join('\n'))),
    );
  });
}

/**
 * 转义HTML内容
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 打开提示词查看器浮窗
 */
async function openPromptViewDialog(): Promise<void> {
  const promptDataStr = localStorage.getItem('prompt_inspector_data') ?? '[]';
  const totalTokens = localStorage.getItem('prompt_inspector_token') ?? '0';

  let promptData: PromptData[];
  try {
    promptData = JSON.parse(promptDataStr);
  } catch (error) {
    log.error('[PromptView] 解析提示词数据失败:', error);
    promptData = [];
  }

  // 创建浮窗
  const dialog = FloatingDialog.create({
    id: 'prompt-view-dialog',
    title: '提示词发送情况',
    width: 900,
    height: 700,
    minWidth: 500,
    minHeight: 400,
    resizable: true,
    draggable: true,
    collapsible: true,
    onClose: () => {
      cleanupPromptViewEvents();
    },
  });

  if (!dialog) {
    // 浮窗已存在，直接返回
    return;
  }

  // 重新绑定事件监听器
  rebindPromptViewEvents();

  const content = dialog.render();

  // 构建内容
  const $contentHtml = $(`
    <div class="prompt-view-content" style="padding: 15px; height: 100%; overflow-y: auto;">
      <div class="prompt-view-header" style="margin-bottom: 20px; padding: 10px; background: var(--SmartThemeBodyColor); border-radius: 5px;">
        <div style="font-size: 16px; font-weight: bold; color: var(--SmartThemeQuoteColor);">
          总提示词数: ${totalTokens}
        </div>
        <div style="font-size: 12px; color: var(--SmartThemeQuoteColor); margin-top: 5px;">
          共 ${promptData.length} 条消息
        </div>
      </div>
      <div class="prompt-list">
        ${promptData
          .map(
            (item, index) => `
          <div class="inline-drawer completion_prompt_manager_prompt" data-index="${index}" style="margin-bottom: 10px; border: 1px solid var(--SmartThemeBorderColor); border-radius: 5px;">
            <div class="inline-drawer-toggle inline-drawer-header" style="padding: 12px; cursor: pointer; background: var(--SmartThemeBlurTintColor); border-radius: 5px 5px 0 0;">
              <span style="font-weight: bold; color: var(--SmartThemeQuoteColor);">
                身份: <span style="color: var(--SmartThemeChatTintColor);">${escapeHtml(item.role)}</span> | 
                提示词数: <span style="color: var(--SmartThemeChatTintColor);">${item.token}</span>
              </span>
              <div class="fa-solid inline-drawer-icon interactable down fa-circle-chevron-down" tabindex="0" style="float: right; margin-top: 2px;"></div>
            </div>
            <div class="inline-drawer-content monospace" style="white-space: pre-wrap; display: none; padding: 15px; background: var(--SmartThemeBodyColor); border-radius: 0 0 5px 5px; max-height: 400px; overflow-y: auto; font-size: 13px; line-height: 1.4;">
              ${escapeHtml(item.content)}
            </div>
          </div>
        `,
          )
          .join('')}
      </div>
      ${
        promptData.length === 0
          ? '<div style="text-align: center; color: var(--SmartThemeQuoteColor); margin-top: 50px;">暂无提示词数据</div>'
          : ''
      }
    </div>
  `);

  content.append($contentHtml);

  // 绑定折叠/展开事件
  content.find('.inline-drawer-toggle').on('click', function () {
    const $this = $(this);
    const $content = $this.siblings('.inline-drawer-content');
    const $icon = $this.find('.inline-drawer-icon');

    $content.slideToggle(300);
    $icon.toggleClass('down up');
    $icon.toggleClass('fa-circle-chevron-down fa-circle-chevron-up');
  });
}

/**
 * 重新绑定提示词查看器事件
 */
function rebindPromptViewEvents(): void {
  // 先清理旧的事件监听器
  cleanupPromptViewEvents();

  // 重新绑定事件监听器
  chatCompletionPromptReadyHandler = handleChatCompletionPromptReady;
  eventSource.makeLast(event_types.CHAT_COMPLETION_PROMPT_READY, chatCompletionPromptReadyHandler);


  log.debug('[PromptView] 事件监听器已重新绑定');
}

/**
 * 清理提示词查看器事件监听器
 */
function cleanupPromptViewEvents(): void {
  if (chatCompletionPromptReadyHandler) {
    eventSource.removeListener(event_types.CHAT_COMPLETION_PROMPT_READY, chatCompletionPromptReadyHandler);
    chatCompletionPromptReadyHandler = null;
    log.debug('[PromptView] 事件监听器已清理');
  }
}

/**
 * 添加变量管理快速按钮
 */
function addPromptViewQuickButton() {
  const buttonHtml = $(`
  <div id="tavern-helper-prompt-view-container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-bug-slash extensionsMenuExtensionButton" /></div>
      <span id="tavern-helper-variable-text">提示词查看器</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#tavern-helper-prompt-view-container').on('click', async function () {
    await openPromptViewDialog();
  });
}

/**
 * 初始化提示词查看器
 */
export function initPromptView(): void {
  // 绑定 open-prompt-view 按钮点击事件
  $(document).on('click', '#open-prompt-view', () => {
    openPromptViewDialog();
  });

  addPromptViewQuickButton();
  const $button = $('#open-prompt-view');
  if ($button.length) {
    $button.on('click', async () => {
      await openPromptViewDialog();
    });
  }

  // 初始绑定事件监听器
  rebindPromptViewEvents();
}

/**
 * 页面卸载时清理所有事件监听器
 */
$(window).on('unload', () => {
  cleanupPromptViewEvents();
});
