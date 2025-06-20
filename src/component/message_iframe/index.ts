import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import { getCharAvatarPath, getSettingValue, getUserAvatarPath, saveSettingValue } from '@/util/extension_variables';

import { eventSource, event_types, reloadCurrentChat, updateMessageBlock, this_chid } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';

let isExtensionEnabled: boolean;
let tampermonkeyMessageListener: ((event: MessageEvent) => void) | null = null;
let isRenderEnabled: boolean;
let isRenderingOptimizeEnabled: boolean;
let isRenderingHideStyleEnabled: boolean;
let renderDepth: number;
let isTampermonkeyEnabled: boolean;

// 保存原始高亮方法
const originalHighlightElement = hljs.highlightElement;

const RENDER_MODES = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
};

// 扩展Window接口定义
declare global {
  interface Window {
    _sharedResizeObserver?: ResizeObserver;
    _observedElements?: Map<HTMLElement, { iframe: HTMLIFrameElement }>;
    gc?: () => void;
  }
}

export const partialRenderEvents = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
  event_types.MESSAGE_UPDATED,
  event_types.MESSAGE_SWIPED,
];

export const defaultIframeSettings = {
  render_enabled: true,
  tampermonkey_compatibility: false,
  render_depth: 0,
  render_optimize: false,
};

export async function handleRenderToggle(userInput: boolean = true, enable: boolean = true) {
  if (enable) {
    renderMessagesInIframes(RENDER_MODES.FULL);
  }
  if (userInput) {
    saveSettingValue('render.render_enabled', enable);
  }
}

/**
 * 清理后，重新渲染所有iframe
 */
export async function clearAndRenderAllIframes() {
  await clearAllIframes();
  if (this_chid !== undefined) {
    await reloadCurrentChat();
    await renderAllIframes();
  }
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
export async function renderPartialIframes(mesId: number) {
  const processDepth = parseInt($('#render-depth').val() as string, 10);
  const context = getContext();
  const totalMessages = context.chat.length;

  if (processDepth > 0) {
    const depthOffset = totalMessages - processDepth;

    if (mesId < depthOffset) {
      return;
    }
  }

  await renderMessagesInIframes(RENDER_MODES.PARTIAL, mesId);

  console.log('[Render] 渲染' + mesId + '号消息的iframe');
}

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
async function renderMessagesInIframes(mode = RENDER_MODES.FULL, specificMesId: number | null = null) {
  if (isExtensionEnabled === undefined) {
    isExtensionEnabled = getSettingValue('enabled_extension');
  }
  if (!isExtensionEnabled || !isRenderEnabled) {
    return;
  }
  const context = getContext();
  const totalMessages = context.chat.length;
  const processDepth = renderDepth ?? 0;
  const depthLimit = processDepth > 0 ? processDepth : totalMessages;
  const depthLimitedMessageIds = [...Array(totalMessages).keys()].slice(-depthLimit);

  let messagesToRenderIds: number[] = [];
  const messagesToCancelIds: number[] = [...Array(totalMessages).keys()].filter(
    id => !depthLimitedMessageIds.includes(id),
  );

  if (mode === RENDER_MODES.FULL) {
    messagesToRenderIds = depthLimitedMessageIds;
  } else if (mode === RENDER_MODES.PARTIAL && specificMesId !== null) {
    if (depthLimitedMessageIds.includes(specificMesId)) {
      messagesToRenderIds = [specificMesId];
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
          await destroyIframe(iframe as HTMLIFrameElement);
        }),
      );
      updateMessageBlock(messageId, message);
    }
    if (isRenderingHideStyleEnabled) {
      const $mesText = $(
        `.mes[mesid="${messageId}"] .mes_block .mes_reasoning_details, .mes[mesid="${messageId}"] .mes_block .mes_text`,
      );
      addToggleButtonsToMessage($mesText);
    }
  }

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

      const shouldHaveButton = shouldHaveCodeToggle(this);
      const shouldRenderAsIframe = !shouldHaveButton;

      if (shouldHaveButton && isRenderingHideStyleEnabled) {
        const $pre = $(this);
        addToggleButtonToCodeBlock($pre);
      }

      if (shouldRenderAsIframe) {
        const disableLoading = /<!--\s*disable-default-loading\s*-->/.test(extractedText);
        const hasMinVh = /min-height:\s*[^;]*vh/.test(extractedText);
        extractedText = hasMinVh ? processVhUnits(extractedText) : extractedText;

        let $wrapper = $('<div>').css({
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
          </head>
          <body>
            ${extractedText}
            ${hasMinVh ? `<script src="${script_url.get('viewport_adjust_script')}"></script>` : ``}
            ${
              getSettingValue('render.tampermonkey_compatibility')
                ? `<script src="${script_url.get('tampermonkey_script')}"></script>`
                : ``
            }
          </body>
          </html>
        `;
        $iframe.attr('srcdoc', srcdocContent);

        $iframe.on('load', function () {
          observeIframeContent(this as HTMLIFrameElement);

          $wrapper = $(this).parent();
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

          if (isRenderingHideStyleEnabled) {
            removeCodeToggleButtonsByMesId(messageId);
          }

          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
        });

        eventSource.emitAndWait('message_iframe_render_started', $iframe.attr('id'));
        $(this).replaceWith($wrapper);
      }
    });
  }
}

/**
 * 获取或创建共享的ResizeObserver实例
 */
function getSharedResizeObserver(): ResizeObserver {
  if (!window._sharedResizeObserver) {
    window._observedElements = new Map();

    window._sharedResizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const element = entry.target;

        const data = window._observedElements?.get(element as HTMLElement);
        if (data) {
          const { iframe } = data;
          adjustIframeHeight(iframe);
        }
      }
    });

    console.log('Created shared ResizeObserver instance');
  }

  return window._sharedResizeObserver;
}

/**
 * 观察iframe内容用于自动调整高度
 * @param iframe iframe元素
 */
function observeIframeContent(iframe: HTMLIFrameElement) {
  const $iframe = $(iframe);
  if (!$iframe.length || !$iframe[0].contentWindow || !$iframe[0].contentWindow.document.body) {
    return;
  }
  try {
    const docBody = $iframe[0].contentWindow.document.body;

    const resizeObserver = getSharedResizeObserver();

    if (window._observedElements) {
      for (const [element, data] of window._observedElements.entries()) {
        if (data.iframe === iframe) {
          resizeObserver.unobserve(element);
          window._observedElements.delete(element);
          break;
        }
      }
    }

    window._observedElements?.set(docBody, { iframe });
    resizeObserver.observe(docBody);

    adjustIframeHeight(iframe);
  } catch (error) {
    console.error('[Render] 设置 iframe 内容观察时出错:', error);
  }
}

/**
 * 销毁iframe
 * @param iframe iframe元素
 */
export function destroyIframe(iframe: HTMLIFrameElement): Promise<void> {
  return new Promise(resolve => {
    const $iframe = $(iframe);

    if (!$iframe.length) {
      resolve();
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
      console.debug('[Render] 清理iframe内部事件时出错:', e);
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
      console.debug('[Render] 清理媒体元素时出错:', e);
    }

    if ($iframe[0].contentWindow && 'stop' in $iframe[0].contentWindow) {
      $iframe[0].contentWindow.stop();
    }

    // 如果有ResizeObserver实例和已观察元素的记录
    if (window._sharedResizeObserver && window._observedElements) {
      for (const [element, data] of window._observedElements.entries()) {
        if (data.iframe === iframe) {
          window._sharedResizeObserver.unobserve(element);
          window._observedElements.delete(element);
          break;
        }
      }
    }

    // 清空iframe内容
    if ($iframe[0].contentWindow) {
      try {
        if (iframeId && typeof eventSource.removeListener === 'function') {
          eventSource.removeListener('message_iframe_render_ended', iframeId as any);
          eventSource.removeListener('message_iframe_render_started', iframeId as any);
        }

        $iframe.attr('src', 'about:blank');
      } catch (e) {
        console.debug('[Render] 清空iframe内容时出错:', e);
      }
    }

    // 从DOM中移除
    $iframe.remove();

    // 移除jQuery数据缓存
    try {
      $iframe.removeData();
    } catch (e) {
      console.debug('[Render] 移除jQuery数据缓存时出错:', e);
    }

    if (window._observedElements?.size === 0 && window._sharedResizeObserver) {
      window._sharedResizeObserver.disconnect();
      window._sharedResizeObserver = undefined;
      console.log('[Render] 所有iframe已移除，停止观察');
    }

    // 确保所有清理操作都完成后再resolve
    setTimeout(() => {
      resolve();
    }, 0);
  });
}

/**
 * 清理所有iframe
 * @returns {Promise<void>}
 */
export async function clearAllIframes(): Promise<void> {
  const $iframes = $('iframe[id^="message-iframe"]');
  await Promise.all(
    $iframes.toArray().map(async iframe => {
      await destroyIframe(iframe as HTMLIFrameElement);
    }),
  );

  // 清理相关的事件监听器
  try {
    if (typeof eventSource.removeListener === 'function') {
      eventSource.removeListener('message_iframe_render_started', null as any);
      eventSource.removeListener('message_iframe_render_ended', null as any);
    }
  } catch (e) {
    console.debug('[Render] 清理事件监听器时出错:', e);
  }

  // 尝试主动触发垃圾回收
  try {
    let arr = [];
    for (let i = 0; i < 10; i++) {
      arr.push(new Array(1000000).fill(1));
    }
    arr = null as any;

    if (window.gc) {
      window.gc();
    }
  } catch (e) {
    console.debug('尝试触发垃圾回收时出错:', e);
  }
}

/**
 * 设置iframe移除监听器
 * @returns {MutationObserver} 观察器实例
 */
function setupIframeRemovalListener(): MutationObserver {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.removedNodes.length) {
        mutation.removedNodes.forEach(node => {
          if (node instanceof HTMLIFrameElement) {
            destroyIframe(node).catch(err => {
              console.error('[Render] 清理iframe时出错:', err);
            });
          } else if (node instanceof HTMLElement) {
            const iframes = node.querySelectorAll('iframe');
            if (iframes.length) {
              iframes.forEach(iframe => {
                destroyIframe(iframe).catch(err => {
                  console.error('[Render] 清理iframe时出错:', err);
                });
              });
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
  return observer;
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
function adjustIframeHeight(iframe: HTMLIFrameElement) {
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
export async function renderMessageAfterDelete(mesId: number) {
  const context = getContext();
  const processDepth = parseInt($('#render-depth').val() as string, 10);
  const totalMessages = context.chat.length;
  const maxRemainId = mesId - 1;

  const getMessage = (id: number) => {
    const message = context.chat[id] ?? {};
    return message;
  };

  const getIframe = (id: number) => {
    const $iframe = $('[id^="message-iframe-' + id + '-"]');
    return $iframe.length > 0 ? ($iframe.get(0) as HTMLIFrameElement) : null;
  };

  const checkCodeBlock = (message: any) => {
    return /```[\s\S]*?```/.test(message.mes);
  };
  // 考虑到高楼层的情况，深度为0时，只渲染最后一个消息
  if (processDepth === 0) {
    const message = getMessage(maxRemainId);
    const hasCodeBlock = checkCodeBlock(message);
    const iframe = getIframe(maxRemainId);

    if (!hasCodeBlock && !iframe) {
      return;
    }
    await destroyIframe(iframe as HTMLIFrameElement);
    updateMessageBlock(maxRemainId, message);
    renderPartialIframes(maxRemainId);
  } else {
    let startRenderIndex = totalMessages - processDepth;
    if (startRenderIndex < 0) {
      startRenderIndex = 0;
    }

    for (let i = startRenderIndex; i <= maxRemainId; i++) {
      const message = getMessage(i);
      const hasCodeBlock = checkCodeBlock(message);
      const iframe = getIframe(i);

      if (!hasCodeBlock && !iframe) {
        continue;
      }
      await destroyIframe(iframe as HTMLIFrameElement);
      updateMessageBlock(i, message);
      renderPartialIframes(i);
    }
  }
}

/**
 * 处理油猴兼容性设置改变
 */
async function handleTampermonkeyCompatibilityChange(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.tampermonkey_compatibility', enable);
  }

  if (!getSettingValue('enabled_extension')) {
    return;
  }

  if (enable) {
    if (!tampermonkeyMessageListener) {
      tampermonkeyMessageListener = handleTampermonkeyMessages;
      window.addEventListener('message', tampermonkeyMessageListener);
      createGlobalAudioManager();
    }
  } else if (tampermonkeyMessageListener) {
    window.removeEventListener('message', tampermonkeyMessageListener);
    tampermonkeyMessageListener = null;
  }

  await clearAndRenderAllIframes();
}

/**
 * 处理深度输入改变时
 */
async function onDepthInput(value: string) {
  const processDepth = parseInt(value, 10);
  renderDepth = processDepth;

  if (processDepth < 0) {
    toastr.warning('处理深度不能为负数');
    $('#render-depth').val(getSettingValue('render.render_depth'));
    return;
  }

  saveSettingValue('render.render_depth', processDepth);

  await clearAndRenderAllIframes();
}

export const handlePartialRender = (mesId: number) => {
  console.log('[Render] 触发局部渲染，消息ID:', mesId);
  const processDepth = parseInt($('#render-depth').val() as string, 10);
  const context = getContext();
  const totalMessages = context.chat.length;

  if (processDepth > 0) {
    const depthOffset = totalMessages - processDepth;

    if (mesId < depthOffset) {
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
function addToggleButtonToCodeBlock($pre: JQuery<HTMLElement>) {
  // 检查代码块是否已经有折叠按钮
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

  $mesText.find('pre').each(function () {
    const $pre = $(this);
    const $code = $pre.find('code');
    if ($code.length && shouldHaveCodeToggle($code[0])) {
      addToggleButtonToCodeBlock($pre);
    }
  });
}

/**
 * 给所有消息添加折叠控件
 */
export function addCodeToggleButtonsToAllMessages() {
  const $chat = $('#chat');
  if (!$chat.length) {
    return;
  }

  $chat.find('.mes .mes_block .mes_text, .mes .mes_block .mes_reasoning_details').each(function () {
    const $mesText = $(this);
    addToggleButtonsToMessage($mesText);
  });
}

/**
 * 从代码块中移除折叠按钮
 * @param $codeElement 代码元素
 */
function removeToggleButtonFromCodeBlock($codeElement: JQuery<HTMLElement>) {
  const $parent = $codeElement.parent();
  const $toggleButton = $parent.prev('.code-toggle-button');
  if ($toggleButton.length) {
    $toggleButton.off('click').remove();
  }
}

/**
 * 根据mesId移除折叠控件
 * @param mesId 消息ID
 */
function removeCodeToggleButtonsByMesId(mesId: number) {
  const $messageElement = $(`div[mesid="${mesId}"]`);
  const $codeElements = $messageElement.find('pre code');

  $codeElements.each(function () {
    const $codeElement = $(this);

    // 只有不应该有折叠按钮的代码块才移除按钮
    if (!shouldHaveCodeToggle(this)) {
      removeToggleButtonFromCodeBlock($codeElement);
    }
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
  hljs.highlightElement = function () {
    return;
  };
}

/**
 * 移除前端卡渲染优化设置
 */
export function removeRenderingOptimizeSettings() {
  hljs.highlightElement = originalHighlightElement;
}

/**
 * 处理重型前端卡渲染优化
 * @param enable 是否启用重型前端卡渲染优化
 * @param userInput 是否由用户手动触发
 */
async function handleRenderingOptimizationToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_optimize', enable);
    isRenderingOptimizeEnabled = enable;
  }

  if (enable) {
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
 * 添加代码块折叠设置
 */
export function addRenderingHideStyleSettings() {
  injectCodeBlockHideStyles();
}

/**
 * 移除代码块折叠设置
 */
export function removeRenderingHideStyleSettings() {
  removeCodeBlockHideStyles();
  removeAllCodeToggleButtons();
}

/**
 * 处理代码块折叠设置改变
 * @param enable 是否启用代码块折叠
 * @param userInput 是否由用户手动触发
 */
async function handleRenderingHideStyleToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_hide_style', enable);
    isRenderingHideStyleEnabled = enable;
  }

  if (enable) {
    addRenderingHideStyleSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  } else {
    removeRenderingHideStyleSettings();
    if (userInput) {
      await clearAndRenderAllIframes();
    }
  }
}

/**
 * 处理渲染器启用设置改变
 * @param enable 是否启用渲染器
 * @param userInput 是否由用户手动触发
 */
async function handleRenderEnableToggle(enable: boolean, userInput: boolean = true) {
  if (userInput) {
    saveSettingValue('render.render_enabled', enable);
    isRenderEnabled = enable;
  }
  if (enable) {
    $('#render-settings-content .extension-content-item').not(':first').css('opacity', 1);
    if (isRenderingOptimizeEnabled) {
      addRenderingOptimizeSettings();
    }
    if (isRenderingHideStyleEnabled) {
      addRenderingHideStyleSettings();
    }
    await renderAllIframes();
  } else {
    $('#render-settings-content .extension-content-item').not(':first').css('opacity', 0.5);
    if (isRenderingOptimizeEnabled) {
      removeRenderingOptimizeSettings();
    }
    if (isRenderingHideStyleEnabled) {
      removeRenderingHideStyleSettings();
    }
    await clearAllIframes();
    await reloadCurrentChat();
  }
}

/**
 * 添加前端渲染快速按钮
 */
function addRenderQuickButton() {
  const buttonHtml = $(`
  <div id="tavern-helper-render-container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      <span id="tavern-helper-render-text">${isRenderEnabled ? '关闭前端渲染' : '开启前端渲染'}</span>
  </div>`);
  buttonHtml.css('display', 'flex');
  $('#extensionsMenu').append(buttonHtml);
  $('#tavern-helper-render-container').on('click', async function () {
    $('#tavern-helper-render-text').text(!isRenderEnabled ? '关闭前端渲染' : '开启前端渲染');
    await handleRenderEnableToggle(!isRenderEnabled, true);
    $('#render-enable-toggle').prop('checked', isRenderEnabled);
  });
}

/**
 * 初始化iframe控制面板
 */
export async function initIframePanel() {
  // 处理重型前端卡渲染优化
  isRenderingOptimizeEnabled = getSettingValue('render.render_optimize');
  if (isRenderingOptimizeEnabled) {
    handleRenderingOptimizationToggle(true, false);
  }
  $('#render-optimize-toggle')
    .prop('checked', isRenderingOptimizeEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderingOptimizationToggle(event.target.checked, true));

  isRenderingHideStyleEnabled = getSettingValue('render.render_hide_style');
  if (isRenderingHideStyleEnabled) {
    handleRenderingHideStyleToggle(true, false);
  }
  $('#render-hide-style-toggle')
    .prop('checked', isRenderingHideStyleEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderingHideStyleToggle(event.target.checked, true));

  // 处理处理深度设置
  renderDepth = getSettingValue('render.render_depth');
  $('#render-depth')
    .val(renderDepth ?? defaultIframeSettings.render_depth)
    .on('blur', function (event) {
      onDepthInput((event.target as HTMLInputElement).value);
    });

  isRenderEnabled = getSettingValue('render.render_enabled');
  handleRenderEnableToggle(isRenderEnabled, false);
  $('#render-enable-toggle')
    .prop('checked', isRenderEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleRenderEnableToggle(event.target.checked, true));

  // 处理油猴兼容性设置
  isTampermonkeyEnabled = getSettingValue('render.tampermonkey_compatibility');
  if (isTampermonkeyEnabled) {
    handleTampermonkeyCompatibilityChange(true, false);
  }
  $('#tampermonkey-compatibility-toggle')
    .prop('checked', isTampermonkeyEnabled)
    .on('click', (event: JQuery.ClickEvent) => handleTampermonkeyCompatibilityChange(event.target.checked, true));

  $(window).on('resize', function () {
    if ($('iframe[data-needs-vh="true"]').length) {
      updateIframeViewportHeight();
    }
  });

  addRenderQuickButton();
  injectLoadingStyles();
  setupIframeRemovalListener();
}

/**
 * 判断代码块是否应该有折叠按钮
 * @param codeElement 代码块元素
 * @returns 是否应该有折叠按钮
 */
function shouldHaveCodeToggle(codeElement: HTMLElement): boolean {
  const extractedText = extractTextFromCode(codeElement);
  return !(extractedText.includes('<body') && extractedText.includes('</body>'));
}
