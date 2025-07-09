import {
  addToggleButtonToCodeBlock,
  removeCodeToggleButtonsByMesId,
} from '@/component/message_iframe/render_hide_style';
import { extractTextFromCode } from '@/component/message_iframe/utils';
import { script_url } from '@/script_url';
import third_party from '@/third_party.html';
import { getCharAvatarPath, getSettingValue, getUserAvatarPath, saveSettingValue } from '@/util/extension_variables';

import { eventSource, event_types, reloadCurrentChat, this_chid, updateMessageBlock } from '@sillytavern/script';
import { getContext } from '@sillytavern/scripts/extensions';

let tampermonkeyMessageListener: ((event: MessageEvent) => void) | null = null;

const RENDER_MODES = {
  FULL: 'FULL',
  PARTIAL: 'PARTIAL',
};

/**
 * 渲染消息到iframe
 * @param mode 渲染模式
 * @param specificMesId 指定消息ID
 */
async function renderMessagesInIframes(mode = RENDER_MODES.FULL, specificMesId: number | null = null) {
  if (!getSettingValue('enabled_extension') || !getSettingValue('render.render_enabled')) {
    return;
  }
  const context = getContext();
  const totalMessages = context.chat.length;
  const processDepth = getSettingValue('render.render_depth') ?? 0;
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
    if (getSettingValue('render.render_hide_style')) {
      const $mesTexts = $(
        `.mes[mesid="${messageId}"] .mes_block .mes_reasoning_details, .mes[mesid="${messageId}"] .mes_block .mes_text`,
      );
      $mesTexts.each(function () {
        const $codeBlock = $(this).find('pre');
        if ($codeBlock.length) {
          addToggleButtonToCodeBlock($codeBlock);
        }
      });
    }
  }

  for (const messageId of messagesToRenderIds) {
    const $messageElement = $(`.mes[mesid="${messageId}"]`);
    if (!$messageElement.length) {
      log.debug(`未找到 mesid: ${messageId} 对应的消息元素。`);
      continue;
    }

    const $codeElements = $messageElement.find('pre');
    if (!$codeElements.length) {
      continue;
    }

    let iframeCounter = 1;

    $codeElements.each(function () {
      let extractedText = extractTextFromCode(this);
      if (extractedText.includes('<body') && extractedText.includes('</body>')) {
        const disableLoading = /<!--\s*disable-default-loading\s*-->/.test(extractedText);
        const hasMinVh = /min-height:\s*[^;]*vh/.test(extractedText);
        const hasJsVhUsage = /\d+vh/.test(extractedText);

        if (hasMinVh || hasJsVhUsage) {
          extractedText = processAllVhUnits(extractedText);
        }
        const needsVhHandling = hasMinVh || hasJsVhUsage;

        let $wrapper = $('<div>').css({
          position: 'relative',
          width: '100%',
        });

        const $iframe = $('<iframe>')
          .attr({
            id: `message-iframe-${messageId}-${iframeCounter}`,
            loading: 'lazy',
          })
          .css({
            margin: '5px auto',
            border: 'none',
            width: '100%',
          }) as JQuery<HTMLIFrameElement>;

        iframeCounter++;

        if (needsVhHandling) {
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
              ${needsVhHandling ? `:root{--viewport-height:${window.innerHeight}px;}` : ``}
              html,body{margin:0;padding:0;overflow:hidden!important;max-width:100%!important;max-height:9999px!important;box-sizing:border-box}
              .user_avatar,.user-avatar{background-image:url('${getUserAvatarPath()}')}
              .char_avatar,.char-avatar{background-image:url('${getCharAvatarPath()}')}
              </style>
              ${third_party}
              <script src="${script_url.get('iframe_client')}"></script>
            </head>
            <body>
              ${extractedText}
              ${needsVhHandling ? `<script src="${script_url.get('viewport_adjust_script')}"></script>` : ``}

              ${
                getSettingValue('render.tampermonkey_compatibility')
                  ? `<script src="${script_url.get('tampermonkey_script')}"></script>`
                  : ``
              }
            </body>
            </html>
          `;

        const blob = new Blob([srcdocContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        $iframe.attr('src', url);

        $iframe.on('load', function () {
          URL.revokeObjectURL(url);

          observeIframeContent(this);

          $wrapper = $(this).parent();
          if ($wrapper.length) {
            const $loadingOverlay = $wrapper.find('.iframe-loading-overlay');
            if ($loadingOverlay.length) {
              $loadingOverlay.css('opacity', '0');
              setTimeout(() => $loadingOverlay.remove(), 300);
            }
          }

          if ($(this).attr('data-needs-vh') === 'true') {
            this.contentWindow?.postMessage(
              {
                request: 'updateViewportHeight',
                newHeight: window.innerHeight,
              },
              '*',
            );
          }

          eventSource.emitAndWait('message_iframe_render_ended', this.id);

          if (getSettingValue('render.render_hide_style')) {
            removeCodeToggleButtonsByMesId(messageId);
          }

          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
        });

        eventSource.emitAndWait('message_iframe_render_started', $iframe.attr('id'));
        $(this).replaceWith($wrapper);
      } else {
        addToggleButtonToCodeBlock($(this));
      }
    });
  }
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
 * 转换代码块中所有vh单位（包括JavaScript动态设置）
 * @param htmlContent 代码块内容
 * @returns 转换后的代码块内容
 */
function processAllVhUnits(htmlContent: string) {
  const viewportHeight = window.innerHeight;

  let processedContent = htmlContent.replace(
    /((?:document\.body\.style\.minHeight|\.style\.minHeight|setProperty\s*\(\s*['"]min-height['"])\s*[=,]\s*['"`])([^'"`]*?)(['"`])/g,
    (match, prefix, value, suffix) => {
      if (value.includes('vh')) {
        const convertedValue = value.replace(/(\d+(?:\.\d+)?)vh/g, (num: string) => {
          const numValue = parseFloat(num);
          if (numValue === 100) {
            return `var(--viewport-height, ${viewportHeight}px)`;
          } else {
            return `calc(var(--viewport-height, ${viewportHeight}px) * ${numValue / 100})`;
          }
        });
        return prefix + convertedValue + suffix;
      }
      return match;
    },
  );

  processedContent = processedContent.replace(/min-height:\s*([^;]*vh[^;]*);/g, expression => {
    const processedExpression = expression.replace(/(\d+(?:\.\d+)?)vh/g, num => {
      const numValue = parseFloat(num);
      if (numValue === 100) {
        return `var(--viewport-height, ${viewportHeight}px)`;
      } else {
        return `calc(var(--viewport-height, ${viewportHeight}px) * ${numValue / 100})`;
      }
    });
    return `${processedExpression};`;
  });

  processedContent = processedContent.replace(
    /style\s*=\s*["']([^"']*min-height:\s*[^"']*vh[^"']*?)["']/gi,
    (match, styleContent) => {
      const processedStyleContent = styleContent.replace(/min-height:\s*([^;]*vh[^;]*)/g, (expression: string) => {
        const processedExpression = expression.replace(/(\d+(?:\.\d+)?)vh/g, num => {
          const numValue = parseFloat(num);
          if (numValue === 100) {
            return `var(--viewport-height, ${viewportHeight}px)`;
          } else {
            return `calc(var(--viewport-height, ${viewportHeight}px) * ${numValue / 100})`;
          }
        });
        return processedExpression;
      });
      return match.replace(styleContent, processedStyleContent);
    },
  );

  return processedContent;
}

/**
 * 使用了min-height:vh时，更新iframe的viewport高度
 */
export function updateIframeViewportHeight() {
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
  }

  return window._sharedResizeObserver;
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

  const bodyHeight = doc.body.scrollHeight;
  const htmlHeight = doc.documentElement.scrollHeight;

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
    log.error('[Render] 设置 iframe 内容观察时出错:', error);
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
 * 处理油猴兼容性设置改变
 */
export async function handleTampermonkeyCompatibilityChange(enable: boolean, userInput: boolean = true) {
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
  log.info('[Render] 渲染所有iframe');
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

  log.info('[Render] 渲染' + mesId + '号消息的iframe');
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
      log.debug('[Render] 清理iframe内部事件时出错:', e);
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
      log.debug('[Render] 清理媒体元素时出错:', e);
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

        const currentSrc = $iframe.attr('src');
        if (currentSrc && currentSrc.startsWith('blob:')) {
          URL.revokeObjectURL(currentSrc);
        }

        $iframe.attr('src', 'about:blank');
      } catch (e) {
        log.debug('[Render] 清空iframe内容时出错:', e);
      }
    }

    // 从DOM中移除
    $iframe.remove();

    // 移除jQuery数据缓存
    try {
      $iframe.removeData();
    } catch (e) {
      log.debug('[Render] 移除jQuery数据缓存时出错:', e);
    }

    if (window._observedElements?.size === 0 && window._sharedResizeObserver) {
      window._sharedResizeObserver.disconnect();
      window._sharedResizeObserver = undefined;
      log.info('[Render] 所有iframe已移除，停止观察');
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
    log.debug('[Render] 清理事件监听器时出错:', e);
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
    log.debug('尝试触发垃圾回收时出错:', e);
  }
}

/**
 * 设置iframe移除监听器
 * @returns {MutationObserver} 观察器实例
 */
export function setupIframeRemovalListener(): MutationObserver {
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.removedNodes.length) {
        mutation.removedNodes.forEach(node => {
          if (node instanceof HTMLIFrameElement) {
            destroyIframe(node).catch(err => {
              log.error('[Render] 清理iframe时出错:', err);
            });
          } else if (node instanceof HTMLElement) {
            const iframes = node.querySelectorAll('iframe');
            if (iframes.length) {
              iframes.forEach(iframe => {
                destroyIframe(iframe).catch(err => {
                  log.error('[Render] 清理iframe时出错:', err);
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

export const handlePartialRender = (mesId: number) => {
  log.info('[Render] 触发局部渲染，消息ID:', mesId);
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
