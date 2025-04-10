import { libraries_text } from '@/component/character_level/library';
import { extensionName, getSettingValue } from '@/index';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';

import {
  characters,
  eventSource,
  event_types,
  getThumbnailUrl,
  reloadCurrentChat,
  saveSettingsDebounced,
  this_chid,
  updateMessageBlock,
  user_avatar,
} from '@sillytavern/script';
import { extension_settings, getContext } from '@sillytavern/scripts/extensions';

let tampermonkeyMessageListener: ((event: MessageEvent) => void) | null = null;
let renderingOptimizeEnabled = false;

const iframeResizeObservers = new Map();

// 保存原始高亮方法
const originalHighlightElement = hljs.highlightElement;

const RENDER_MODES = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
};

export const partialRenderEvents = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
  event_types.MESSAGE_UPDATED,
  event_types.MESSAGE_SWIPED,
];

export const defaultIframeSettings = {
  auto_enable_character_regex: true,
  auto_disable_incompatible_options: true,
  tampermonkey_compatibility: false,
  process_depth: 0,
  rendering_optimize: false,
};

// 获取头像原图
export const charsPath = '/characters/';
export const getUserAvatarPath = () => `./User Avatars/${user_avatar}`;
export const getCharAvatarPath = () => {
  const thumbnailPath = getThumbnailUrl('avatar', characters[this_chid].avatar);
  const targetAvatarImg = thumbnailPath.substring(thumbnailPath.lastIndexOf('=') + 1);
  return charsPath + targetAvatarImg;
};

/**
 * 清理后，重新渲染所有iframe
 */
export async function clearAndRenderAllIframes() {
  await clearAllIframe();
  await reloadCurrentChat();
  await renderAllIframes();
}

/**
 * 渲染所有iframe
 */
export async function renderAllIframes() {
  await renderMessagesInIframes(RENDER_MODES.FULL);
  console.log('[Render] 渲染所有iframe');
}

/**
 * 渲染部分iframe
 * @param mesId 消息ID
 */
export const renderPartialIframes = (mesId: string) => {
  const processDepth = parseInt($('#process_depth').val() as string, 10);
  const context = getContext();
  const totalMessages = context.chat.length;

  if (processDepth > 0) {
    const depthOffset = totalMessages - processDepth;
    const messageIndex = parseInt(mesId, 10);

    if (messageIndex < depthOffset) {
      return;
    }
  }

  renderMessagesInIframes(RENDER_MODES.PARTIAL, mesId);

  console.log('[Render] 渲染' + mesId + '号消息的iframe');
};

/**
 * 使用了min-height:vh时，自动调整iframe高度
 */
export const viewport_adjust_script = `
$(window).on("message", function (event) {
    if (event.originalEvent.data.request === "updateViewportHeight") {
        const newHeight = event.originalEvent.data.newHeight;
        $("html").css("--viewport-height", newHeight + "px");
    }
});
`;

/**
 * 油猴脚本
 */
export const tampermonkey_script = `
class AudioManager {
  constructor() {
    this.currentlyPlaying = null;
  }
  handlePlay(audio) {
    if (this.currentlyPlaying && this.currentlyPlaying !== audio) {
      this.currentlyPlaying.pause();
    }
    window.parent.postMessage({
      type: 'audioPlay',
      iframeId: window.frameElement.id
    }, '*');

    this.currentlyPlaying = audio;
  }
  stopAll() {
    if (this.currentlyPlaying) {
      this.currentlyPlaying.pause();
      this.currentlyPlaying = null;
    }
  }
}
const audioManager = new AudioManager();
$('.qr-button').on('click', function() {
  const buttonName = $(this).text().trim();
  window.parent.postMessage({ type: 'buttonClick', name: buttonName }, '*');
});
$('.st-text').each(function() {
  $(this).on('input', function() {
    window.parent.postMessage({ type: 'textInput', text: $(this).val() }, '*');
  });
  $(this).on('change', function() {
    window.parent.postMessage({ type: 'textInput', text: $(this).val() }, '*');
  });
  const textarea = this;
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
        window.parent.postMessage({ type: 'textInput', text: $(textarea).val() }, '*');
      }
    });
  });
  observer.observe(textarea, { attributes: true });
});
$('.st-send-button').on('click', function() {
  window.parent.postMessage({ type: 'sendClick' }, '*');
});
$('.st-audio').on('play', function() {
  audioManager.handlePlay(this);
});
$(window).on('message', function(event) {
  if (event.originalEvent.data.type === 'stopAudio' &&
    event.originalEvent.data.iframeId !== window.frameElement.id) {
    audioManager.stopAll();
  }
});
`;

/**
 * 转换代码块中的min-height:vh
 * @param htmlContent 代码块内容
 * @returns 转换后的代码块内容
 */
function processVhUnits(htmlContent: string) {
  const hasMinVh = /min-height:\s*[^;]*vh/.test(htmlContent);

  if (!hasMinVh) {
    return htmlContent;
  }

  const viewportHeight = window.innerHeight;
  const processedContent = htmlContent.replace(/min-height:\s*([^;]*vh[^;]*);/g, expression => {
    const processedExpression = expression.replace(
      /(\d+)vh/g,
      `calc(var(--viewport-height, ${viewportHeight}px) * $1 / 100)`,
    );
    return `${processedExpression};`;
  });

  return processedContent;
}

/**
 * 使用了min-height:vh时，更新iframe的viewport高度
 */
function updateIframeViewportHeight() {
  $(window).on('resize', function () {
    if ($('iframe[data-needs-vh="true"]').length) {
      const viewportHeight = window.innerHeight;
      $('iframe[data-needs-vh="true"]').each(function () {
        const iframe = this as HTMLIFrameElement;
        if (iframe.contentWindow) {
          iframe.contentWindow.postMessage(
            {
              request: 'updateViewportHeight',
              newHeight: viewportHeight,
            },
            '*',
          );
        }
      });
    }
  });
}

/**
 * 渲染消息到iframe
 * @param mode 渲染模式
 * @param specificMesId 指定消息ID
 */
async function renderMessagesInIframes(mode = RENDER_MODES.FULL, specificMesId: string | null = null) {
  if (!getSettingValue('activate_setting')) {
    return;
  }

  const context = getContext();
  const totalMessages = context.chat.length;
  const processDepth = parseInt($('#process_depth').val() as string, 10) || 0;
  const depthLimit = processDepth > 0 ? processDepth : totalMessages;
  const depthLimitedMessageIds = [...Array(totalMessages).keys()].slice(-depthLimit);

  let messagesToRenderIds: number[] = [];
  let messagesToCancelIds: number[] = [...Array(totalMessages).keys()].filter(
    id => !depthLimitedMessageIds.includes(id),
  );

  if (mode === RENDER_MODES.FULL) {
    messagesToRenderIds = depthLimitedMessageIds;
  } else if (mode === RENDER_MODES.PARTIAL && specificMesId !== null) {
    const specificIdNum = parseInt(specificMesId, 10);

    if (depthLimitedMessageIds.includes(specificIdNum)) {
      messagesToRenderIds = [specificIdNum];
    } else {
      return;
    }
  }

  for (const messageId of messagesToCancelIds) {
    const message = context.chat[messageId];
    const $iframes = $(`[id^="message-iframe-${messageId}-"]`);
    if ($iframes.length > 0) {
      await Promise.all(
        $iframes.toArray().map(async iframe => {
          destroyIframe(iframe as HTMLIFrameElement);
        }),
      );
      updateMessageBlock(messageId, message);
      addCodeToggleButtons(messageId);
    }
  }

  const renderedMessages = [];
  for (const messageId of messagesToRenderIds) {
    const $messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!$messageElement.length) {
      console.debug(`未找到 mesid: ${messageId} 对应的消息元素。`);
      continue;
    }

    const $codeElements = $messageElement.find('pre');
    if (!$codeElements.length) {
      continue;
    }

    let iframeCounter = 1;

    $codeElements.each(function () {
      let extractedText = extractTextFromCode(this);
      if (!extractedText.includes('<body') || !extractedText.includes('</body>')) {
        if (renderingOptimizeEnabled) {
          addCodeToggleButtons(messageId);
        }
        return;
      }
      const disableLoading = /<!--\s*disable-default-loading\s*-->/.test(extractedText);
      const hasMinVh = /min-height:\s*[^;]*vh/.test(extractedText);
      extractedText = hasMinVh ? processVhUnits(extractedText) : extractedText;

      const $wrapper = $('<div>').css({
        position: 'relative',
        width: '100%',
      });

      const $iframe = $('<iframe>')
        .attr({
          id: `message-iframe-${messageId}-${iframeCounter}`,
          srcdoc: '',
          loading: 'lazy',
        })
        .css({
          margin: '5px auto',
          border: 'none',
          width: '100%',
        });

      iframeCounter++;

      if (hasMinVh) {
        $iframe.attr('data-needs-vh', 'true');
      }

      let loadingTimeout: NodeJS.Timeout | null = null;
      if (!disableLoading) {
        const $loadingOverlay = $('<div>').addClass('iframe-loading-overlay').html(`
            <div class="iframe-loading-content">
              <i class="fa-solid fa-spinner fa-spin"></i>
              <span class="loading-text">Loading...</span>
            </div>`);

        loadingTimeout = setTimeout(() => {
          const $loadingText = $loadingOverlay.find('.loading-text');
          if ($loadingText.length) {
            $loadingText.text('如加载时间过长，请检查网络');
          }
        }, 10000);

        $wrapper.append($loadingOverlay);
      }

      $wrapper.append($iframe);

      const srcdocContent = `
        <html>
        <head>
          <style>
          ${hasMinVh ? `:root{--viewport-height:${window.innerHeight}px;}` : ``}
          html,body{margin:0;padding:0;overflow:hidden;max-width:100%!important;box-sizing:border-box}
          .user_avatar,.user-avatar{background-image:url('${getUserAvatarPath()}')}
          .char_avatar,.char-avatar{background-image:url('${getCharAvatarPath()}')}
          </style>
          ${third_party}
          <script src="${script_url.get('iframe_client')}"></script>
          ${libraries_text}
        </head>
        <body>
          ${extractedText}
          ${hasMinVh ? `<script src="${script_url.get('viewport_adjust_script')}"></script>` : ``}
          ${
            extension_settings[extensionName].render.tampermonkey_compatibility
              ? `<script src="${script_url.get('tampermonkey_script')}"></script>`
              : ``
          }
        </body>
        </html>
      `;
      $iframe.attr('srcdoc', srcdocContent);

      $iframe.on('load', function () {
        observeIframeContent(this as HTMLIFrameElement);

        const $wrapper = $(this).parent();
        if ($wrapper.length) {
          const $loadingOverlay = $wrapper.find('.iframe-loading-overlay');
          if ($loadingOverlay.length) {
            $loadingOverlay.css('opacity', '0');
            setTimeout(() => $loadingOverlay.remove(), 300);
          }
        }

        if ($(this).attr('data-needs-vh') === 'true') {
          const iframe = this as HTMLIFrameElement;
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                request: 'updateViewportHeight',
                newHeight: window.innerHeight,
              },
              '*',
            );
          }
        }

        eventSource.emitAndWait('message_iframe_render_ended', this.id);

        if (renderingOptimizeEnabled) {
          removeCodeToggleButtonsByMesId(messageId);
        }

        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
        }
      });

      eventSource.emitAndWait('message_iframe_render_started', $iframe.attr('id'));
      $(this).replaceWith($wrapper);
    });

    renderedMessages.push(messageId);
  }
}

/**
 * 观察iframe内容用于自动调整高度
 * @param iframe iframe元素
 */
function observeIframeContent(iframe) {
  const $iframe = $(iframe);
  if (!$iframe.length || !$iframe[0].contentWindow || !$iframe[0].contentWindow.document.body) {
    return;
  }
  const docBody = $iframe[0].contentWindow.document.body;
  const iframeId = $iframe.attr('id');

  let resizeObserver = null;

  adjustIframeHeight(iframe);

  try {
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        adjustIframeHeight(iframe);
      });
      resizeObserver.observe(docBody);

      if (iframeId) {
        iframeResizeObservers.set(iframeId, resizeObserver);
      }
    }
  } catch (e) {
    console.error('ResizeObserver初始化错误:', e);
  }

  iframe.cleanup = () => {
    if (resizeObserver) {
      resizeObserver.disconnect();
      if (iframeId) {
        iframeResizeObservers.delete(iframeId);
      }
    }
  };
}

/**
 * 销毁iframe
 * @param iframe iframe元素
 */
function destroyIframe(iframe) {
  const $iframe = $(iframe);

  if (!$iframe.length) {
    return;
  }

  const iframeId = $iframe.attr('id');

  $iframe.off();

  try {
    if ($iframe[0].contentWindow) {
      const iframeDoc = $iframe[0].contentWindow.document;
      if (iframeDoc) {
        $(iframeDoc).find('*').off();
        $(iframeDoc).off();
      }
    }
  } catch (e) {
    console.debug('清理iframe内部事件时出错:', e);
  }

  try {
    const $mediaElements = $iframe.contents().find('audio, video');
    $mediaElements.each(function () {
      if (this instanceof HTMLMediaElement) {
        this.pause();
        this.src = '';
        this.load();
        $(this).off();
      }
    });
  } catch (e) {
    console.debug('清理媒体元素时出错:', e);
  }

  if ($iframe[0].contentWindow && 'stop' in $iframe[0].contentWindow) {
    $iframe[0].contentWindow.stop();
  }

  // 清空iframe内容
  if ($iframe[0].contentWindow) {
    try {
      if (iframeId && typeof eventSource.removeListener === 'function') {
        eventSource.removeListener('message_iframe_render_ended', iframeId);
        eventSource.removeListener('message_iframe_render_started', iframeId);
      }

      $iframe.attr('src', 'about:blank');
    } catch (e) {
      console.debug('清空iframe内容时出错:', e);
    }
  }

  // 断开ResizeObserver连接
  if (iframe.cleanup && typeof iframe.cleanup === 'function') {
    iframe.cleanup();
  } else if (iframeId && iframeResizeObservers.has(iframeId)) {
    const observer = iframeResizeObservers.get(iframeId);
    observer.disconnect();
    iframeResizeObservers.delete(iframeId);
  }

  // 从DOM中移除并清除引用
  const $clone = $iframe.clone(false);
  if ($iframe.parent().length) {
    $iframe.replaceWith($clone);
  }
  if ($clone.parent().length) {
    $clone.remove();
  }

  // 移除jQuery数据缓存
  try {
    $iframe.removeData();
  } catch (e) {
    console.debug('移除jQuery数据缓存时出错:', e);
  }

  // 清空iframe的属性
  for (let prop in iframe) {
    if (iframe.hasOwnProperty(prop)) {
      try {
        iframe[prop] = null;
      } catch (e) {}
    }
  }

  return null;
}

/**
 * 清理所有iframe
 * @returns {Promise<void>}
 */
export async function clearAllIframe(): Promise<void> {
  const $iframes = $('iframe[id^="message-iframe"]');
  $iframes.each(function () {
    destroyIframe(this);
  });

  // 清理相关的事件监听器
  try {
    if (typeof eventSource.removeAllListeners === 'function') {
      eventSource.removeListener('message_iframe_render_started');
      eventSource.removeListener('message_iframe_render_ended');
    }
  } catch (e) {
    console.debug('清理事件监听器时出错:', e);
  }

  // 清理全局缓存
  try {
    $.cache = {};
  } catch (e) {}

  // 尝试主动触发垃圾回收
  try {
    let arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(new Array(1000000).fill(1));
    }
    arr = null;

    if (window.gc) {
      window.gc();
    }
  } catch (e) {
    console.debug('尝试触发垃圾回收时出错:', e);
  }
}

/**
 * 处理油猴脚本兼容模式传来的消息
 * @param event 消息事件
 */
function handleTampermonkeyMessages(event: MessageEvent): void {
  if (event.data.type === 'buttonClick') {
    const buttonName = event.data.name;
    $('.qr--button.menu_button').each(function () {
      if ($(this).find('.qr--button-label').text().trim() === buttonName) {
        $(this).trigger('click');
        return false;
      }
    });
  } else if (event.data.type === 'textInput') {
    const $sendTextarea = jQuery('#send_textarea');
    if ($sendTextarea.length) {
      $sendTextarea.val(event.data.text).trigger('input').trigger('change');
    }
  } else if (event.data.type === 'sendClick') {
    const $sendButton = jQuery('#send_but');
    if ($sendButton.length) {
      $sendButton.trigger('click');
    }
  }
}

/**
 * 油猴兼容模式-创建全局音频管理器
 */
function createGlobalAudioManager() {
  let currentPlayingIframeId: string | null = null;

  window.addEventListener('message', function (event) {
    if (event.data.type === 'audioPlay') {
      const newIframeId = event.data.iframeId;

      if (currentPlayingIframeId && currentPlayingIframeId !== newIframeId) {
        $('iframe').each(function () {
          const iframe = this as HTMLIFrameElement;
          if (iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              {
                type: 'stopAudio',
                iframeId: newIframeId,
              },
              '*',
            );
          }
        });
      }

      currentPlayingIframeId = newIframeId;
    }
  });
}

/**
 * 调整iframe高度
 * @param iframe iframe元素
 */
function adjustIframeHeight(iframe) {
  const $iframe = $(iframe);
  if (!$iframe.length || !$iframe[0].contentWindow || !$iframe[0].contentWindow.document.body) {
    return;
  }

  const doc = $iframe[0].contentWindow.document;

  const bodyHeight = doc.body.offsetHeight;
  const htmlHeight = doc.documentElement.offsetHeight;

  const newHeight = Math.max(bodyHeight, htmlHeight);
  const currentHeight = parseFloat($iframe.css('height')) || 0;

  if (Math.abs(currentHeight - newHeight) > 5) {
    $iframe.css('height', newHeight + 'px');

    if ($iframe.attr('data-needs-vh') === 'true' && iframe.contentWindow) {
      iframe.contentWindow.postMessage(
        {
          request: 'updateViewportHeight',
          newHeight: window.innerHeight,
        },
        '*',
      );
    }
  }
}

/**
 * 提取代码块中的文本
 * @param codeElement 代码块元素
 * @returns 提取的文本
 */
function extractTextFromCode(codeElement: HTMLElement) {
  let textContent = '';

  $(codeElement)
    .contents()
    .each(function () {
      if (this.nodeType === Node.TEXT_NODE) {
        textContent += this.textContent;
      } else if (this.nodeType === Node.ELEMENT_NODE) {
        textContent += extractTextFromCode(this as HTMLElement);
      }
    });

  return textContent;
}

/**
 * 删除消息后重新渲染
 * @param mesId 消息ID
 */
export async function renderMessageAfterDelete(mesId: string) {
  const context = getContext();
  const processDepth = parseInt($('#process_depth').val() as string, 10);
  const totalMessages = context.chat.length;
  const maxRemainId = parseInt(mesId, 10) - 1;
  // 考虑到高楼层的情况，深度为0时，只渲染最后一个消息
  if (processDepth === 0) {
    const message = context.chat[maxRemainId];

    const hasCodeBlock = $(`div[mesid="${mesId}"] .mes_block .mes_text`).find('pre').length > 0;
    const $iframe = $('[id^="message-iframe-' + maxRemainId + '-"]');

    if (!hasCodeBlock && $iframe.length === 0) {
      return;
    }
    destroyIframe($iframe);
    updateMessageBlock(maxRemainId.toString(), message);
    await renderPartialIframes(maxRemainId);
  } else {
    const startRenderIndex = totalMessages - processDepth;
    for (let i = startRenderIndex; i <= maxRemainId; i++) {
      const message = context.chat[i];
      const hasCodeBlock = $(`div[mesid="${i}"] .mes_block .mes_text`).find('pre').length > 0;
      const $iframe = $('[id^="message-iframe-' + i + '-"]');

      if (!hasCodeBlock && $iframe.length === 0) {
        continue;
      }
      destroyIframe($iframe);
      updateMessageBlock(i.toString(), message);
      await renderPartialIframes(i.toString());
    }
  }
}

/**
 * 处理油猴兼容性设置改变
 */
async function onTampermonkeyCompatibilityChange() {
  const isEnabled = Boolean($('#tampermonkey_compatibility').prop('checked'));
  extension_settings[extensionName].render.tampermonkey_compatibility = isEnabled;
  saveSettingsDebounced();

  if (!getSettingValue('activate_setting')) {
    return;
  }

  if (isEnabled) {
    if (!tampermonkeyMessageListener) {
      tampermonkeyMessageListener = handleTampermonkeyMessages;
      window.addEventListener('message', tampermonkeyMessageListener);
      createGlobalAudioManager();
    }
  } else {
    if (tampermonkeyMessageListener) {
      window.removeEventListener('message', tampermonkeyMessageListener);
      tampermonkeyMessageListener = null;
    }
  }
  await clearAndRenderAllIframes();
}

/**
 * 处理深度输入改变时
 */
async function onDepthInput() {
  const processDepth = parseInt($('#process_depth').val() as string, 10);

  if (processDepth < 0) {
    toastr.warning('处理深度不能为负数');
    $('#process_depth').val(extension_settings[extensionName].render.process_depth);
    return;
  }

  extension_settings[extensionName].render.process_depth = processDepth;

  await clearAndRenderAllIframes();

  saveSettingsDebounced();
}

export const handlePartialRender = (mesId: string) => {
  console.log('[Render] PARTIAL render event triggered for message ID:', mesId);
  const processDepth = parseInt($('#process_depth').val() as string, 10);
  const context = getContext();
  const totalMessages = context.chat.length;

  if (processDepth > 0) {
    const depthOffset = totalMessages - processDepth;
    const messageIndex = parseInt(mesId, 10);

    if (messageIndex < depthOffset) {
      return;
    }
  }

  setTimeout(() => {
    renderMessagesInIframes(RENDER_MODES.PARTIAL, mesId);
  }, 100);
};

/**
 * 注入加载样式
 */
export function injectLoadingStyles() {
  if ($('#iframe-loading-styles').length) return;

  const styleSheet = $('<style>', {
    id: 'iframe-loading-styles',
    text: `
      .iframe-loading-overlay{
        position:absolute;
        top:0;
        left:0;
        right:0;
        bottom:0;
        background:rgba(0,0,0,.7);
        display:flex;
        justify-content:center;
        align-items:center;
        z-index:1000;
        transition:opacity .3s ease
      }
      .iframe-loading-content{
        color:#fff;
        display:flex;
        align-items:center;
        gap:10px;
        font-size:16px
      }
      .iframe-loading-content i{
        font-size:20px
      }
      .loading-text {
        transition: opacity 0.3s ease;
      }`,
  });

  $('head').append(styleSheet);
}

/**
 * 注入代码块隐藏样式
 */
export function injectCodeBlockHideStyles() {
  var styleId = 'hidden-code-block-styles';
  var style = document.getElementById(styleId);
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
  `;
}

/**
 * 移除代码块隐藏样式
 */
function removeCodeBlockHideStyles() {
  var styleId = 'hidden-code-block-styles';
  var style = document.getElementById(styleId);
  if (style) {
    style.remove();
  }
}

/**
 * 为消息添加折叠控件
 * @param $mesText 消息文本元素
 */
function addToggleButtonsToMessage($mesText) {
  if ($mesText.find('.code-toggle-button').length > 0 || $mesText.find('pre').length === 0) {
    return;
  }

  $mesText.find('pre').each(function () {
    const $pre = $(this);
    const $toggleButton = $('<div class="code-toggle-button">显示代码块</div>');
    const $tooltip = $(
      '<div style="display: none; font-size: 0.8em; opacity: 0.8;">取消选中前端助手的‘前端卡渲染优化’选项以关闭此折叠功能</div>',
    );

    $toggleButton.on('click', function () {
      const isVisible = $pre.is(':visible');

      if (isVisible) {
        $pre.hide();
        $(this).text('显示代码块');
        $tooltip.hide();
      } else {
        $pre.show();
        $(this).text('隐藏代码块');
        $tooltip.show();
      }
    });

    $pre.before($toggleButton);
    $toggleButton.after($tooltip);
  });
}

/**
 * 给所有消息添加折叠控件
 */
export function addCodeToggleButtonsToAllMessages() {
  if (!extension_settings[extensionName].render.rendering_optimize) {
    return;
  }

  const $chat = $('#chat');
  if (!$chat.length) {
    return;
  }

  $chat.find('.mes .mes_block .mes_text').each(function () {
    const $mesText = $(this);
    addToggleButtonsToMessage($mesText);
  });
}

/**
 * 根据mesId为消息添加折叠控件
 * @param mesId 消息ID
 */
function addCodeToggleButtons(mesId: string) {
  const $chat = $('#chat');
  if (!$chat.length) {
    return;
  }
  const $mesText = $chat.find(`div[mesid="${mesId}"] .mes_block .mes_text`);
  addToggleButtonsToMessage($mesText);
}

/**
 * 根据mesId移除折叠控件
 * @param mesId 消息ID
 */
function removeCodeToggleButtonsByMesId(mesId: string) {
  $(`div[mesid="${mesId}"] .code-toggle-button`).each(function () {
    $(this).off('click').remove();
  });
}

/**
 * 移除所有折叠控件
 */
function removeAllCodeToggleButtons() {
  $('.code-toggle-button').each(function () {
    $(this).off('click').remove();
  });
  // 去掉所有pre的display:none
  $('pre').css('display', 'block');
}

/**
 * 添加前端卡渲染优化设置
 */
export function addRenderingOptimizeSettings() {
  injectCodeBlockHideStyles();
  hljs.highlightElement = function (element) {};
  addCodeToggleButtonsToAllMessages();
}

/**
 * 移除前端卡渲染优化设置
 */
export function removeRenderingOptimizeSettings() {
  hljs.highlightElement = originalHighlightElement;
  removeCodeBlockHideStyles();
  removeAllCodeToggleButtons();
}

/**
 * 处理重型前端卡渲染优化
 * @param userInput 是否由用户手动触发
 */
async function renderingOptimizationChange(userInput: boolean = true) {
  const isEnabled = Boolean($('#rendering_optimize').prop('checked'));
  if (userInput) {
    extension_settings[extensionName].render.rendering_optimize = isEnabled;
    renderingOptimizeEnabled = isEnabled;
    saveSettingsDebounced();
  }

  if (!getSettingValue('activate_setting')) {
    return;
  }

  if (isEnabled) {
    addRenderingOptimizeSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  } else {
    removeRenderingOptimizeSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  }
}

/**
 * 初始化iframe控制面板
 */
export const initIframePanel = () => {
  // 处理重型前端卡渲染优化
  const renderingOptimizeEnabled = getSettingValue('render.rendering_optimize');
  $('#rendering_optimize')
    .prop('checked', renderingOptimizeEnabled)
    .on('click', () => renderingOptimizationChange(true));

  if (renderingOptimizeEnabled) {
    renderingOptimizationChange(false);
  }

  // 处理油猴兼容性设置
  const tampermonkeyEnabled = extension_settings[extensionName].render.tampermonkey_compatibility;
  $('#tampermonkey_compatibility').prop('checked', tampermonkeyEnabled).on('click', onTampermonkeyCompatibilityChange);

  if (tampermonkeyEnabled) {
    onTampermonkeyCompatibilityChange();
  }

  // 处理处理深度设置
  $('#process_depth')
    .val(extension_settings[extensionName].render.process_depth || defaultIframeSettings.process_depth)
    .on('input', onDepthInput);

  $(window).on('resize', function () {
    if ($('iframe[data-needs-vh="true"]').length) {
      updateIframeViewportHeight();
    }
  });
  injectLoadingStyles();
};
