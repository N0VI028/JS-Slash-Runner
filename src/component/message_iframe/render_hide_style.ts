import { getSettingValue } from '@/util/extension_variables';

/**
 * 注入代码块隐藏样式
 */
export function injectCodeBlockHideStyles() {
  const styleId = 'hidden-code-block-styles';
  let style = document.getElementById(styleId);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('id', styleId);
    document.head.appendChild(style);
  }
  style.innerHTML = `
      pre {
        display: none;
      }
      .code-toggle-button {
        display: inline-block;
        margin: 5px 0;
        padding: 5px 10px;
        background-color: rgba(0, 0, 0, 0.1);
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9em;
        user-select: none;
        transition: background-color 0.3s;
      }
      .code-toggle-button:hover {
        background-color: rgba(0, 0, 0, 0.2);
      }
      .popup:has(#qr--modalEditor) .popup-content > #qr--modalEditor > #qr--main > .qr--modal-messageContainer > #qr--modal-messageHolder > #qr--modal-message {
        color: var(--SmartThemeEmColor) !important;
      }
    `;
}

/**
 * 移除代码块隐藏样式
 */
function removeCodeBlockHideStyles() {
  const styleId = 'hidden-code-block-styles';
  const style = document.getElementById(styleId);
  if (style) {
    style.remove();
  }
}

/**
 * 为单个代码块添加折叠按钮
 * @param $pre 代码块元素
 */
export function addToggleButtonToCodeBlock($pre: JQuery<HTMLElement>) {
  if (!getSettingValue('render.render_hide_style')) {
    return;
  }

  if ($pre.prev('.code-toggle-button').length > 0) {
    return;
  }

  const $toggleButton = $(
    '<div class="code-toggle-button" title="关闭[酒馆助手-渲染器-渲染优化]以取消此折叠功能">显示代码块</div>',
  );

  $toggleButton.on('click', function () {
    const isVisible = $pre.is(':visible');

    if (isVisible) {
      $pre.hide();
      $(this).text('显示代码块');
    } else {
      $pre.show();
      $(this).text('隐藏代码块');
    }
  });

  $pre.before($toggleButton);
}

/**
 * 为消息添加折叠控件
 * @param $mesText 消息文本元素
 */
function addToggleButtonsToMessage($mesText: JQuery<HTMLElement>) {
  if ($mesText.find('.code-toggle-button').length > 0 || $mesText.find('pre').length === 0) {
    return;
  }

  $mesText.find('pre').each(function (_index, element) {
    const $pre = $(element);
    const $code = $pre.find('code');
    if ($code.length) {
      addToggleButtonToCodeBlock($pre);
    }
  });
}

/**
 * 给所有消息添加折叠控件
 */
export function addCodeToggleButtonsToAllMessages() {
  if (!getSettingValue('render.render_hide_style') || getSettingValue('render.render_enabled')) {
    return;
  }
  const $chat = $('#chat');
  if (!$chat.length) {
    return;
  }

  $chat.find('.mes .mes_block .mes_text, .mes .mes_block .mes_reasoning_details').each(function (_index, element) {
    const $mesText = $(element);
    addToggleButtonsToMessage($mesText);
  });
}

/**
 * 根据mesId移除折叠控件
 * @param mesId 消息ID
 */
export function removeCodeToggleButtonsByMesId(mesId: number) {
  const $messageElement = $(`div[mesid="${mesId}"] .mes_text .code-toggle-button`);
  $messageElement.each(function () {
    $(this).off('click').remove();
  });
}

/**
 * 移除所有折叠控件
 */
export function removeAllCodeToggleButtons() {
  $('.code-toggle-button').each(function () {
    $(this).off('click').remove();
  });
  // 去掉所有pre的display:none
  $('pre').css('display', 'block');
}

/**
 * 添加代码块折叠设置
 */
export function addRenderingHideStyleSettings() {
  injectCodeBlockHideStyles();
  addCodeToggleButtonsToAllMessages();
}

/**
 * 移除代码块折叠设置
 */
export function removeRenderingHideStyleSettings() {
  removeCodeBlockHideStyles();
  removeAllCodeToggleButtons();
}
