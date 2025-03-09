// @ts-nocheck
import { eventSource, event_types, saveSettingsDebounced, updateMessageBlock, user_avatar, messageFormatting, reloadCurrentChat, getThumbnailUrl, characters, this_chid, } from '../../../../../../script.js';
import { extensionName } from '../index.js';
import { extension_settings, getContext } from '../../../../../extensions.js';
import { script_url } from '../script_url.js';
import { third_party } from '../third_party.js';
import { libraries_text } from './character_level/library.js';
let tampermonkeyMessageListener = null;
const RENDER_MODES = {
    FULL: 'FULL',
    PARTIAL: 'PARTIAL',
};
export const fullRenderEvents = [event_types.CHAT_CHANGED, event_types.MESSAGE_DELETED];
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
export const renderPartialIframes = (mesId) => {
    const processDepth = parseInt($('#process_depth').val(), 10);
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
function processVhUnits(htmlContent) {
    const hasMinVh = /min-height:\s*[^;]*vh/.test(htmlContent);
    if (!hasMinVh) {
        return htmlContent;
    }
    const viewportHeight = window.innerHeight;
    const processedContent = htmlContent.replace(/min-height:\s*([^;]*vh[^;]*);/g, expression => {
        const processedExpression = expression.replace(/(\d+)vh/g, `calc(var(--viewport-height, ${viewportHeight}px) * $1 / 100)`);
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
                const iframe = this;
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        request: 'updateViewportHeight',
                        newHeight: viewportHeight,
                    }, '*');
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
async function renderMessagesInIframes(mode = RENDER_MODES.FULL, specificMesId = null) {
    if (!$('#activate_setting').prop('checked')) {
        return;
    }
    const context = getContext();
    const totalMessages = context.chat.length;
    const processDepth = parseInt($('#process_depth').val(), 10) || 0;
    const depthLimit = processDepth > 0 ? processDepth : totalMessages;
    const depthLimitedMessageIds = [...Array(totalMessages).keys()].slice(-depthLimit);
    let messagesToRenderIds = [];
    let messagesToCancelIds = [...Array(totalMessages).keys()].filter(id => !depthLimitedMessageIds.includes(id));
    if (mode === RENDER_MODES.FULL) {
        messagesToRenderIds = depthLimitedMessageIds;
    }
    else if (mode === RENDER_MODES.PARTIAL && specificMesId !== null) {
        const specificIdNum = parseInt(specificMesId, 10);
        if (depthLimitedMessageIds.includes(specificIdNum)) {
            messagesToRenderIds = [specificIdNum];
        }
        else {
            return;
        }
    }
    for (const messageId of messagesToCancelIds) {
        const message = context.chat[messageId];
        const $iframes = $(`[id^="message-iframe-${messageId}-"]`);
        if ($iframes.length > 0) {
            await Promise.all($iframes.toArray().map(async (iframe) => {
                destroyIframe(iframe);
            }));
            updateMessageBlock(messageId, message);
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
            let loadingTimeout = null;
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
          ${extension_settings[extensionName].render.tampermonkey_compatibility
                ? `<script src="${script_url.get('tampermonkey_script')}"></script>`
                : ``}
        </body>
        </html>
      `;
            $iframe.attr('srcdoc', srcdocContent);
            $iframe.on('load', function () {
                observeIframeContent(this);
                const $wrapper = $(this).parent();
                if ($wrapper.length) {
                    const $loadingOverlay = $wrapper.find('.iframe-loading-overlay');
                    if ($loadingOverlay.length) {
                        $loadingOverlay.css('opacity', '0');
                        setTimeout(() => $loadingOverlay.remove(), 300);
                    }
                }
                if ($(this).attr('data-needs-vh') === 'true') {
                    const iframe = this;
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            request: 'updateViewportHeight',
                            newHeight: window.innerHeight,
                        }, '*');
                    }
                }
                eventSource.emitAndWait('message_iframe_render_ended', this.id);
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
 * 销毁iframe
 * @param iframe iframe元素
 */
function destroyIframe(iframe) {
    const $iframe = $(iframe);
    const $mediaElements = $iframe.contents().find('audio, video');
    $mediaElements.each(function () {
        if (this instanceof HTMLMediaElement) {
            this.pause();
            this.src = '';
            this.load();
        }
    });
    if ($iframe[0].contentWindow && 'stop' in $iframe[0].contentWindow) {
        $iframe[0].contentWindow.stop();
    }
    if ($iframe[0].contentWindow) {
        $iframe.attr('src', 'about:blank');
    }
    const $clone = $iframe.clone(false);
    if ($iframe.parent().length) {
        $iframe.replaceWith($clone);
    }
    if ($clone.parent().length) {
        $clone.remove();
    }
    return null;
}
/**
 * 处理油猴脚本兼容模式传来的消息
 * @param event 消息事件
 */
function handleTampermonkeyMessages(event) {
    if (event.data.type === 'buttonClick') {
        const buttonName = event.data.name;
        $('.qr--button.menu_button').each(function () {
            if ($(this).find('.qr--button-label').text().trim() === buttonName) {
                $(this).trigger('click');
                return false;
            }
        });
    }
    else if (event.data.type === 'textInput') {
        const $sendTextarea = jQuery('#send_textarea');
        if ($sendTextarea.length) {
            $sendTextarea.val(event.data.text).trigger('input').trigger('change');
        }
    }
    else if (event.data.type === 'sendClick') {
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
    let currentPlayingIframeId = null;
    window.addEventListener('message', function (event) {
        if (event.data.type === 'audioPlay') {
            const newIframeId = event.data.iframeId;
            if (currentPlayingIframeId && currentPlayingIframeId !== newIframeId) {
                $('iframe').each(function () {
                    const iframe = this;
                    if (iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'stopAudio',
                            iframeId: newIframeId,
                        }, '*');
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
    const newHeight = doc.documentElement.offsetHeight;
    const currentHeight = parseFloat($iframe.css('height')) || 0;
    if (Math.abs(currentHeight - newHeight) > 1) {
        $iframe.css('height', newHeight + 'px');
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
    let mutationTimeout = null;
    adjustIframeHeight(iframe);
    const mutationObserver = new MutationObserver(() => {
        if (mutationTimeout) {
            clearTimeout(mutationTimeout);
        }
        mutationTimeout = setTimeout(() => {
            adjustIframeHeight(iframe);
        }, 100);
    });
    mutationObserver.observe(docBody, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true,
    });
    const $mesTextParent = $iframe.closest('.mes_text');
    if ($mesTextParent.length) {
        const resizeObserver = new ResizeObserver(() => {
            requestAnimationFrame(() => {
                if ($iframe.length &&
                    $iframe[0].contentWindow &&
                    $iframe[0].contentWindow.document &&
                    document.body.contains($iframe[0])) {
                    const updatedHeight = $iframe[0].contentWindow.document.documentElement.offsetHeight;
                    if (updatedHeight > 0) {
                        $iframe.css('height', updatedHeight + 'px');
                    }
                }
                else {
                    if (typeof iframe.cleanup === 'function') {
                        iframe.cleanup();
                    }
                }
            });
        });
        resizeObserver.observe($mesTextParent[0]);
        iframe.cleanup = () => {
            mutationObserver.disconnect();
            resizeObserver.disconnect();
            if (mutationTimeout) {
                clearTimeout(mutationTimeout);
            }
        };
    }
    const $parentNode = $iframe.parent();
    const removalObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
            for (const removedNode of mutation.removedNodes) {
                if (removedNode === $parentNode[0]) {
                    if (typeof iframe.cleanup === 'function') {
                        iframe.cleanup();
                    }
                }
            }
        }
    });
    if ($parentNode.length && $parentNode.parent().length) {
        removalObserver.observe($parentNode.parent()[0], { childList: true });
    }
    if (!iframe.cleanup) {
        iframe.cleanup = () => {
            mutationObserver.disconnect();
            removalObserver.disconnect();
            if (mutationTimeout) {
                clearTimeout(mutationTimeout);
            }
        };
    }
}
/**
 * 提取代码块中的文本
 * @param codeElement 代码块元素
 * @returns 提取的文本
 */
function extractTextFromCode(codeElement) {
    let textContent = '';
    $(codeElement)
        .contents()
        .each(function () {
        if (this.nodeType === Node.TEXT_NODE) {
            textContent += this.textContent;
        }
        else if (this.nodeType === Node.ELEMENT_NODE) {
            textContent += extractTextFromCode(this);
        }
    });
    return textContent;
}
/**
 * 重新渲染最后一条消息
 */
export async function formattedLastMessage() {
    const lastIndex = getContext().chat.length - 1;
    const lastMessage = getContext()?.chat?.[lastIndex];
    const mes = lastMessage.mes;
    const isUser = lastMessage.is_user;
    const isSystem = lastMessage.is_system;
    const chName = lastMessage.name;
    const messageId = lastIndex;
    const mesBlock = $(`div[mesid="${messageId}"]`);
    mesBlock.find('.mes_text').empty();
    mesBlock.find('.mes_text').append(messageFormatting(mes, chName, isSystem, isUser, messageId));
}
/**
 * 处理油猴兼容性设置改变
 */
async function onTampermonkeyCompatibilityChange() {
    const isEnabled = Boolean($('#tampermonkey_compatibility').prop('checked'));
    extension_settings[extensionName].render.tampermonkey_compatibility = isEnabled;
    saveSettingsDebounced();
    if (isEnabled) {
        if (!tampermonkeyMessageListener) {
            tampermonkeyMessageListener = handleTampermonkeyMessages;
            window.addEventListener('message', tampermonkeyMessageListener);
            createGlobalAudioManager();
        }
    }
    else {
        if (tampermonkeyMessageListener) {
            window.removeEventListener('message', tampermonkeyMessageListener);
            tampermonkeyMessageListener = null;
        }
    }
    await reloadCurrentChat();
    await renderAllIframes();
}
/**
 * 处理深度输入改变时
 */
async function onDepthInput() {
    const processDepth = parseInt($('#process_depth').val(), 10);
    extension_settings[extensionName].render.process_depth = processDepth;
    await renderAllIframes();
    saveSettingsDebounced();
}
export const handlePartialRender = (mesId) => {
    console.log('[Render] PARTIAL render event triggered for message ID:', mesId);
    const processDepth = parseInt($('#process_depth').val(), 10);
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
function injectLoadingStyles() {
    if ($('#iframe-loading-styles').length)
        return;
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
 * 初始化iframe控制面板
 */
export const initIframePanel = () => {
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
//# sourceMappingURL=message_iframe.js.map