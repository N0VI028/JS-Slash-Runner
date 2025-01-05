// @ts-nocheck
// TODO: 拆分消息 iframe 到 message_iframe.ts 中
// TODO: 拆分 triggerSlash triggerSlashWithResult getVariables setVariables 到对应于 src/iframe_client/... 的 src/iframe_server/... 文件中
// TODO: 拆分音视频相关 slash command 到 slash_command 文件夹中
import {
  eventSource,
  event_types,
  saveSettingsDebounced,
  chat_metadata,
  updateMessageBlock,
  reloadCurrentChat,
  user_avatar,
  messageFormatting,
  this_chid,
  characters,
} from "../../../../../script.js";
import { selected_group } from "../../../../group-chats.js";
import {
  extension_settings,
  renderExtensionTemplateAsync,
  getContext,
  saveMetadataDebounced,
} from "../../../../extensions.js";
import { getSortableDelay } from "../../../../utils.js";
import { SlashCommandParser } from "../../../../slash-commands/SlashCommandParser.js";
import { SlashCommand } from "../../../../slash-commands/SlashCommand.js";
import {
  SlashCommandArgument,
  SlashCommandNamedArgument,
  ARGUMENT_TYPE,
} from "../../../../slash-commands/SlashCommandArgument.js";
import {
  SlashCommandEnumValue,
  enumTypes,
} from "../../../../slash-commands/SlashCommandEnumValue.js";
import {
  enumIcons,
  commonEnumProviders,
} from "../../../../slash-commands/SlashCommandCommonEnumsProvider.js";
import { POPUP_TYPE, callGenericPopup } from "../../../../popup.js";
import { isMobile } from "../../../../RossAscends-mods.js";
import { power_user } from "../../../../power-user.js";

import { iframe_client } from "./iframe_client_exported/index.js";
import { handleChatMessage } from "./iframe_server/chat_message.js";
import { handleEvent } from "./iframe_server/event.js";
import { handleLorebook } from "./iframe_server/lorebook.js";
import { handleRegexData } from "./iframe_server/regex_data.js";
import {
  script_load_events,
  initializeScripts,
  destroyScriptsIfInitialized,
} from "./script_iframe.js";
import { initSlashEventEmit } from "./slash_command/event.js";
import { script_url } from "./script_url.js";

const extensionName = "JS-Slash-Runner";
const extensionFolderPath = `third-party/${extensionName}`;

const audioCache = {};

let tampermonkeyMessageListener = null;
let list_BGMS = null;
let list_ambients = null;
let bgmEnded = true;
let ambientEnded = true;
let cooldownBGM = 0;

const RENDER_MODES = {
  FULL: "FULL",
  PARTIAL: "PARTIAL",
};

const fullRenderEvents = [
  event_types.CHAT_CHANGED,
  event_types.MESSAGE_DELETED,
];

const partialRenderEvents = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
  event_types.MESSAGE_UPDATED,
  event_types.MESSAGE_SWIPED,
];

const eventsToListenFor = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
];

const defaultSettings = {
  activate_setting: true,
  auto_enable_character_regex: true,
  auto_disable_incompatible_options: true,
  tampermonkey_compatibility: false,
  audio_setting: true,
  bgm_enabled: true,
  ambient_enabled: true,
  bgm_mode: "repeat",
  bgm_muted: false,
  bgm_volume: 50,
  bgm_selected: null,

  ambient_mode: "stop",
  ambient_muted: false,
  ambient_volume: 50,
  ambient_selected: null,

  bgm_cooldown: 3,
};

function loadSettings() {
  extension_settings[extensionName] = extension_settings[extensionName] || {};
  if (Object.keys(extension_settings[extensionName]).length === 0) {
    Object.assign(extension_settings[extensionName], defaultSettings);
    saveSettingsDebounced();
  }
  if (extension_settings[extensionName].audio === undefined)
    extension_settings[extensionName].audio = {};

  if (Object.keys(extension_settings[extensionName].audio).length === 0) {
    Object.assign(extension_settings[extensionName].audio, defaultSettings);
  }
  $("#activate_setting").prop(
    "checked",
    extension_settings[extensionName].activate_setting
  );
  $("#process_depth").val(extension_settings[extensionName].process_depth || 0);
  $("#tampermonkey_compatibility").prop(
    "checked",
    extension_settings[extensionName].tampermonkey_compatibility
  );
  if (
    extension_settings[extensionName].auto_enable_character_regex === undefined
  ) {
    extension_settings[extensionName].auto_enable_character_regex = true;
  }
  $("#auto_enable_character_regex").prop(
    "checked",
    extension_settings[extensionName].auto_enable_character_regex
  );
  if (
    extension_settings[extensionName].auto_disable_incompatible_options ===
    undefined
  ) {
    extension_settings[extensionName].auto_disable_incompatible_options = true;
  }
  $("#auto_disable_incompatible_options").prop(
    "checked",
    extension_settings[extensionName].auto_disable_incompatible_options
  );
  $("#audio_enabled").prop(
    "checked",
    extension_settings[extensionName].audio_setting
  );

  $("#enable_bgm").prop(
    "checked",
    extension_settings[extensionName].audio.bgm_enabled
  );
  if (!extension_settings[extensionName].audio.bgm_enabled) {
    $("#audio_bgm")[0].pause();
  }

  $("#enable_ambient").prop(
    "checked",
    extension_settings[extensionName].audio.ambient_enabled
  );
  if (!extension_settings[extensionName].audio.ambient_enabled) {
    $("#audio_ambient")[0].pause();
  }

  $("#audio_bgm_volume").text(
    extension_settings[extensionName].audio.bgm_volume
  );
  $("#audio_ambient_volume").text(
    extension_settings[extensionName].audio.ambient_volume
  );

  $("#audio_bgm_volume_slider").val(
    extension_settings[extensionName].audio.bgm_volume
  );
  $("#audio_ambient_volume_slider").val(
    extension_settings[extensionName].audio.ambient_volume
  );

  if (extension_settings[extensionName].audio.bgm_muted) {
    $("#audio_bgm_mute_icon").removeClass("fa-volume-high");
    $("#audio_bgm_mute_icon").addClass("fa-volume-mute");
    $("#audio_bgm_mute").addClass("redOverlayGlow");
    $("#audio_bgm").prop("muted", true);
  } else {
    $("#audio_bgm_mute_icon").addClass("fa-volume-high");
    $("#audio_bgm_mute_icon").removeClass("fa-volume-mute");
    $("#audio_bgm_mute").removeClass("redOverlayGlow");
    $("#audio_bgm").prop("muted", false);
  }

  const bgmMode = extension_settings[extensionName].audio.bgm_mode || "repeat";
  const modeIconMap = {
    repeat: "fa-repeat",
    random: "fa-random",
    single: "fa-redo-alt",
    stop: "fa-cancel",
  };

  $("#audio_bgm_mode_icon")
    .removeClass("fa-repeat fa-random fa-redo-alt fa-cancel")
    .addClass("fa " + modeIconMap[bgmMode]);

  const ambientMode =
    extension_settings[extensionName].audio.ambient_mode || "cancel";

  $("#audio_ambient_mode_icon")
    .removeClass("fa-repeat fa-random fa-redo-alt fa-cancel")
    .addClass("fa " + modeIconMap[ambientMode]);

  if (extension_settings[extensionName].audio.ambient_muted) {
    $("#audio_ambient_mute_icon").removeClass("fa-volume-high");
    $("#audio_ambient_mute_icon").addClass("fa-volume-mute");
    $("#audio_ambient_mute").addClass("redOverlayGlow");
    $("#audio_ambient").prop("muted", true);
  } else {
    $("#audio_ambient_mute_icon").addClass("fa-volume-high");
    $("#audio_ambient_mute_icon").removeClass("fa-volume-mute");
    $("#audio_ambient_mute").removeClass("redOverlayGlow");
    $("#audio_ambient").prop("muted", false);
  }

  $("#audio_bgm_cooldown").val(
    extension_settings[extensionName].audio.bgm_cooldown
  );
}

async function renderAllIframes() {
  await renderMessagesInIframes(RENDER_MODES.FULL);
}

const adjust_size_script = `
window.addEventListener("DOMContentLoaded", function () {
  window.parent.postMessage("domContentLoaded", "*");
});
window.addEventListener("message", function (event) {
  if (event.data.request === "updateViewportHeight") {
    const newHeight = event.data.newHeight;
    document.documentElement.style.setProperty("--viewport-height", newHeight + "px");
  }
});
`;

const tampermonkey_script = `
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
document.querySelectorAll('.qr-button').forEach(button => {
  button.addEventListener('click', function () {
    const buttonName = this.textContent.trim();
    window.parent.postMessage({ type: 'buttonClick', name: buttonName }, '*');
  });
});
document.querySelectorAll('.st-text').forEach(textarea => {
  textarea.addEventListener('input', function () {
    window.parent.postMessage({ type: 'textInput', text: this.value }, '*');
  });
  textarea.addEventListener('change', function () {
    window.parent.postMessage({ type: 'textInput', text: this.value }, '*');
  });
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
        window.parent.postMessage({ type: 'textInput', text: textarea.value }, '*');
      }
    });
  });
  observer.observe(textarea, { attributes: true });
});
document.querySelectorAll('.st-send-button').forEach(button => {
  button.addEventListener('click', function () {
    window.parent.postMessage({ type: 'sendClick' }, '*');
  });
});
document.querySelectorAll('.st-audio').forEach(audio => {
  audio.addEventListener('play', function () {
    audioManager.handlePlay(this);
  });
});
window.addEventListener('message', function (event) {
  if (event.data.type === 'stopAudio' &&
    event.data.iframeId !== window.frameElement.id) {
    audioManager.stopAll();
  }
});
`;

function processVhUnits(htmlContent) {
  const hasMinVh = /min-height:\s*[^;]*vh/.test(htmlContent);

  if (!hasMinVh) {
    return htmlContent;
  }

  const viewportHeight = window.innerHeight;
  const processedContent = htmlContent.replace(
    /min-height:\s*([^;]*vh[^;]*);/g,
    (match, expression) => {
      const processedExpression = expression.replace(
        /(\d+)vh/g,
        `calc(var(--viewport-height, ${viewportHeight}px) * $1 / 100)`
      );
      return `min-height: ${processedExpression};`;
    }
  );

  return processedContent;
}

function updateIframeViewportHeight() {
  const viewportHeight = window.innerHeight;
  document.querySelectorAll('iframe[data-needs-vh="true"]').forEach(iframe => {
    if (iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        request: "updateViewportHeight",
        newHeight: viewportHeight
      }, "*");
    }
  });
}

// 在文件顶部添加新的辅助函数
function createIframeContent(content, avatarPath, hasMinVh, tampermonkeyCompatibility) {
  const html = `
    <html>
    <head>
      <style>
        :root {
          ${hasMinVh ? `--viewport-height: ${window.innerHeight}px;` : ''}
        }
        html,
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          max-width: 100% !important;
          box-sizing: border-box;
        }
        .user_avatar {
          background-image: url('${avatarPath}');
        }
      </style>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js" integrity="sha512-v2CJ7UaYy4JwqLDIrZUI/4hqeoQieOmAZNXBeQyjo21dadnwR+8ZaIJVT8EE2iyI61OV8e6M8PP2/4hpQINQ/g==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
      <script src="${script_url.get(iframe_client)}"></script>
    </head>
    <body>
      ${content}
      ${hasMinVh ? `<script src="${script_url.get(adjust_size_script)}"></script>` : ''}
      ${tampermonkeyCompatibility ? `<script src="${script_url.get(tampermonkey_script)}"></script>` : ''}
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'text/html' });
  return URL.createObjectURL(blob);
}

async function renderMessagesInIframes(
  mode = RENDER_MODES.FULL,
  specificMesId = null
) {
  if (!$("#activate_setting").prop("checked")) {
    return;
  }

  const chatContainer = document.getElementById("chat");
  const context = getContext();
  const totalMessages = context.chat.length;
  const processDepth = parseInt($("#process_depth").val(), 10);
  const depthLimit = processDepth > 0 ? processDepth : totalMessages;
  const depthLimitedMessageIds = [...Array(totalMessages).keys()].slice(
    -depthLimit
  );

  let messagesToRenderIds = [];
  let messagesToCancelIds = [...Array(totalMessages).keys()].filter(
    (id) => !depthLimitedMessageIds.includes(id)
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
    const iframes = document.querySelectorAll(
      `[id^="message-iframe-${messageId}-"]`
    );
    if (iframes.length > 0) {
      const iframeArray = Array.from(iframes);
      await Promise.all(
        iframeArray.map(async (iframe) => {
          await destroyIframe(iframe);
        })
      );
      updateMessageBlock(messageId, message);
    }
  }

  const renderedMessages = [];
  for (const messageId of messagesToRenderIds) {
    const messageElement = chatContainer.querySelector(
      `.mes[mesid="${messageId}"]`
    );
    if (!messageElement) {
      console.debug(`未找到 mesid: ${messageId} 对应的消息元素。`);
      continue;
    }

    const mesTextContainer = messageElement.querySelector(".mes_text");
    if (!mesTextContainer) {
      console.debug(`未找到 mes_text 容器，跳过消息 mesid: ${messageId}`);
      continue;
    }

    const codeElements = mesTextContainer.querySelectorAll("pre");
    if (!codeElements.length) {
      continue;
    }

    const computedStyle = window.getComputedStyle(mesTextContainer);
    const paddingRight = parseFloat(computedStyle.paddingRight);
    const mesTextWidth = mesTextContainer.clientWidth - paddingRight;
    const avatarPath = `./User Avatars/${user_avatar}`;

    let index = 0;
    codeElements.forEach((codeElement, _) => {
      let extractedText = extractTextFromCode(codeElement);
      if (
        !extractedText.includes("<body>") ||
        !extractedText.includes("</body>")
      ) {
        return;
      }

      const hasMinVh = /min-height:\s*[^;]*vh/.test(extractedText);
      extractedText = hasMinVh ? processVhUnits(extractedText) : extractedText;

      const iframe = document.createElement("iframe");
      iframe.id = `message-iframe-${messageId}-${index++}`;
      if (hasMinVh) {
        iframe.setAttribute('data-needs-vh', 'true');
      }
      iframe.style.margin = "5px auto";
      iframe.style.border = "none";
      iframe.style.width = "100%";

      // 使用Blob创建iframe内容
      const blobUrl = createIframeContent(
        extractedText,
        avatarPath,
        hasMinVh,
        extension_settings[extensionName].tampermonkey_compatibility
      );

      iframe.src = blobUrl;

      // 添加cleanup函数来释放Blob URL
      const originalCleanup = iframe.cleanup;
      iframe.cleanup = () => {
        if (originalCleanup) {
          originalCleanup();
        }
        URL.revokeObjectURL(blobUrl);
      };

      iframe.addEventListener('load', () => {
        observeIframeContent(iframe);
        eventSource.emitAndWait('message_iframe_render_ended', iframe.id);
      });

      eventSource.emitAndWait('message_iframe_render_started', iframe.id);
      codeElement.replaceWith(iframe);
    });

    renderedMessages.push(messageId);
  }

  console.log(
    `[Render]模式: ${mode}, 深度限制: ${processDepth > 0 ? processDepth : "无限制"
    },已渲染的消息ID: ${renderedMessages.join(
      ", "
    )},已取消渲染的消息ID: ${messagesToCancelIds.join(", ")}`
  );
}

function destroyIframe(iframe) {
  return new Promise((resolve) => {
    if (!iframe || !iframe.parentNode) {
      resolve();
      return;
    }

    if (typeof iframe.cleanup === 'function') {
      try {
        iframe.cleanup();
        console.log("iframe cleanup");
      } catch (error) {
        console.warn('执行iframe清理函数时出错:', error);
      }
    }

    let isResolved = false;
    const timeoutDuration = 3000;

    // 创建一个空白页面的Blob URL
    const emptyBlob = new Blob([''], { type: 'text/html' });
    const emptyBlobUrl = URL.createObjectURL(emptyBlob);

    iframe.src = emptyBlobUrl;

    const cleanup = () => {
      if (!isResolved) {
        clearTimeout(timeout);
        URL.revokeObjectURL(emptyBlobUrl);
        if (iframe.parentNode) {
          iframe.remove();
        }
        isResolved = true;
        resolve();
      }
    };

    const timeout = setTimeout(cleanup, timeoutDuration);

    iframe.onload = cleanup;

    if (iframe.src === emptyBlobUrl) {
      cleanup();
    }
  });
}

window.addEventListener("message", function (event) {
  if (event.data === "domContentLoaded") {
    const iframe = event.source.frameElement;
    adjustIframeHeight(iframe);
  }
});

function handleTampermonkeyMessages(event) {
  if (event.data.type === "buttonClick") {
    const buttonName = event.data.name;
    jQuery(".qr--button.menu_button").each(function () {
      if (jQuery(this).find(".qr--button-label").text().trim() === buttonName) {
        jQuery(this).click();
        return false;
      }
    });
  } else if (event.data.type === "textInput") {
    const sendTextarea = document.getElementById("send_textarea");
    if (sendTextarea) {
      sendTextarea.value = event.data.text;
      sendTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      sendTextarea.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else if (event.data.type === "sendClick") {
    const sendButton = document.getElementById("send_but");
    if (sendButton) {
      sendButton.click();
    }
  }
}

function createGlobalAudioManager() {
  let currentPlayingIframeId = null;

  window.addEventListener("message", function (event) {
    if (event.data.type === "audioPlay") {
      const newIframeId = event.data.iframeId;

      if (currentPlayingIframeId && currentPlayingIframeId !== newIframeId) {
        document.querySelectorAll("iframe").forEach((iframe) => {
          iframe.contentWindow.postMessage(
            {
              type: "stopAudio",
              iframeId: newIframeId,
            },
            "*"
          );
        });
      }

      currentPlayingIframeId = newIframeId;
    }
  });
}

function adjustIframeHeight(iframe) {
  const doc = iframe.contentWindow.document;
  const newHeight = doc.documentElement.scrollHeight;
  const currentHeight = parseFloat(iframe.style.height) || 0;

  if (Math.abs(currentHeight - newHeight) > 1) {
    iframe.style.height = newHeight + 6 + "px";
  }
}

function observeIframeContent(iframe) {
  if (!iframe || !iframe.contentWindow || !iframe.contentWindow.document.body) {
    return;
  }

  const doc = iframe.contentWindow.document.body;
  let resizeTimeout = null;

  const resizeObserver = new ResizeObserver(() => {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(() => {
      adjustIframeHeight(iframe);
    }, 100);
  });

  resizeObserver.observe(doc);
  iframe.cleanup = () => {
    resizeObserver.disconnect();
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
  };
}

function extractTextFromCode(codeElement) {
  let textContent = "";

  codeElement.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      textContent += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      textContent += extractTextFromCode(node);
    }
  });

  return textContent;
}

let latestSetVariablesMesId = null;
async function handleIframeCommand(event) {
  if (event.data) {
    if (event.data.request === "command") {
      const commandText = event.data.commandText;
      await executeCommand(commandText);
    } else if (event.data.request === "commandWithResult") {
      const commandText = event.data.commandText;
      const messageId = event.data.messageId;

      try {
        const result = await executeCommand(commandText);
        event.source.postMessage(
          {
            request: "commandResult",
            result: result.pipe,
            messageId: messageId,
          },
          "*"
        );
      } catch (error) {
        event.source.postMessage(
          {
            request: "commandResult",
            error: error.toString(),
            messageId: messageId,
          },
          "*"
        );
      }
    } else if (event.data.request === "getVariables") {
      if (!chat_metadata.variables) {
        chat_metadata.variables = {};
      }
      const variables = chat_metadata?.variables || {};
      for (const key in variables) {
        if (
          variables.hasOwnProperty(key) &&
          typeof variables[key] === "string"
        ) {
          try {
            const parsedValue = JSON.parse(variables[key]);
            if (Array.isArray(parsedValue)) {
              variables[key] = parsedValue;
            }
          } catch (e) { }
        }
      }
      event.source.postMessage({ variables: variables }, "*");
    } else if (event.data.request === "setVariables") {
      const newVariables = event.data.variables;
      const mesId = event.data.message_id;

      if (isNaN(mesId)) {
        return;
      }
      const chatLength = getContext().chat.length;
      const latestMesId = chatLength - 1;

      if (mesId !== latestMesId) {
        return;
      }
      latestSetVariablesMesId = mesId;
      if (
        !chat_metadata.variables ||
        typeof chat_metadata.variables !== "object"
      ) {
        chat_metadata.variables = {};
      }
      if (
        !chat_metadata.variables.tempVariables ||
        typeof chat_metadata.variables.tempVariables !== "object"
      ) {
        chat_metadata.variables.tempVariables = {};
      }
      if (newVariables.hasOwnProperty("tempVariables")) {
        delete newVariables.tempVariables;
      }
      const tempVariables = chat_metadata.variables.tempVariables;
      const currentVariables = chat_metadata.variables;
      Object.keys(newVariables).forEach((key) => {
        const newValue = newVariables[key];
        const currentValue = currentVariables[key];
        if (newValue !== currentValue) {
          tempVariables[key] = newValue;
        }
      });
      chat_metadata.variables.tempVariables = tempVariables;
      saveMetadataDebounced();
    }
  }
}

function clearTempVariables() {
  if (
    chat_metadata.variables &&
    chat_metadata.variables.tempVariables &&
    Object.keys(chat_metadata.variables.tempVariables).length > 0
  ) {
    console.log("[Var]Clearing tempVariables.");
    chat_metadata.variables.tempVariables = {};
    saveMetadataDebounced();
  }
}
function onMessageRendered(eventMesId) {
  if (
    !chat_metadata.variables ||
    !chat_metadata.variables.tempVariables ||
    Object.keys(chat_metadata.variables.tempVariables).length === 0
  ) {
    return;
  }
  if (eventMesId === latestSetVariablesMesId) {
    console.log(
      "[Var]MesId matches the latest setVariables, skipping ST variable update."
    );
    return;
  } else if (eventMesId > latestSetVariablesMesId) {
    console.log(
      "[Var]Event mesId is newer than setVariables mesId, updating ST variables."
    );
    const newVariables = { ...chat_metadata.variables.tempVariables };
    updateVariables(newVariables);

    chat_metadata.variables.tempVariables = {};
    console.log("[Var]TempVariables cleared.");
  } else {
    console.log("[Var]Event mesId is older than setVariables mesId, ignoring.");
  }
}
function updateVariables(newVariables) {
  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const currentVariables = chat_metadata.variables;

  for (let key in newVariables) {
    if (newVariables.hasOwnProperty(key)) {
      currentVariables[key] = newVariables[key];
    }
  }

  chat_metadata.variables = currentVariables;

  saveMetadataDebounced();
}

async function executeCommand(command) {
  const context = getContext();
  try {
    const result = context.executeSlashCommandsWithOptions(
      command,
      true,
      null,
      false,
      null,
      null,
      null
    );
    return result;
  } catch (error) {
    console.error("Error executing slash command:", error);
    throw error;
  }
}
export const handleFullRender = () => {
  console.log("[Render] FULL render event triggered");
  setTimeout(() => {
    renderAllIframes();
  }, 100);
};

export const handlePartialRender = (mesId) => {
  console.log("[Render] PARTIAL render event triggered for message ID:", mesId);
  const processDepth = parseInt($("#process_depth").val(), 10);
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
async function formattedLastMessage() {
  const lastIndex = getContext().chat.length - 1;
  const lastMessage = getContext()?.chat?.[lastIndex];
  const mes = lastMessage.mes;
  const isUser = lastMessage.is_user;
  const isSystem = lastMessage.is_system;
  const chName = lastMessage.name;
  const messageId = lastIndex;
  const mesBlock = $(`div[mesid="${messageId}"]`);
  mesBlock.find(".mes_text").empty();
  mesBlock
    .find(".mes_text")
    .append(messageFormatting(mes, chName, isSystem, isUser, messageId));
}
async function onExtensionToggle() {
  const isEnabled = Boolean($("#activate_setting").prop("checked"));
  extension_settings[extensionName].activate_setting = isEnabled;
  if (isEnabled) {
    script_url.set(iframe_client);
    script_url.set(adjust_size_script);
    script_url.set(tampermonkey_script);

    script_load_events.forEach((eventType) => {
      eventSource.on(eventType, initializeScripts);
    });
    window.addEventListener("message", handleIframeCommand);
    window.addEventListener("message", handleChatMessage);
    window.addEventListener("message", handleEvent);
    window.addEventListener("message", handleLorebook);
    window.addEventListener("message", handleRegexData);

    fullRenderEvents.forEach((eventType) => {
      eventSource.on(eventType, handleFullRender);
    });
    await renderAllIframes();

    partialRenderEvents.forEach((eventType) => {
      eventSource.on(eventType, (mesId) => {
        handlePartialRender(mesId);
      });
    });
    eventsToListenFor.forEach((eventType) => {
      eventSource.on(eventType, (mesId) => {
        onMessageRendered(mesId);
      });
    });
    eventSource.on(event_types.MESSAGE_DELETED, () => {
      clearTempVariables();
      formattedLastMessage();
    });
  } else {
    script_url.delete(iframe_client);
    script_url.delete(adjust_size_script);
    script_url.delete(tampermonkey_script);

    script_load_events.forEach((eventType) => {
      eventSource.removeListener(eventType, initializeScripts);
    });
    destroyScriptsIfInitialized();
    window.removeEventListener("message", handleIframeCommand);
    window.removeEventListener("message", handleChatMessage);
    window.removeEventListener("message", handleEvent);
    window.removeEventListener("message", handleLorebook);
    window.removeEventListener("message", handleRegexData);

    fullRenderEvents.forEach((eventType) => {
      eventSource.removeListener(eventType, handleFullRender);
    });

    partialRenderEvents.forEach((eventType) => {
      eventSource.removeListener(eventType, handlePartialRender);
    });
    eventsToListenFor.forEach((eventType) => {
      eventSource.removeListener(eventType, (mesId) => {
        onMessageRendered(mesId);
      });
    });
    eventSource.removeListener(event_types.MESSAGE_DELETED, () => {
      clearTempVariables();
      formattedLastMessage();
    });
    await reloadCurrentChat();
  }

  saveSettingsDebounced();
}

async function onTampermonkeyCompatibilityChange() {
  const isEnabled = Boolean($("#tampermonkey_compatibility").prop("checked"));
  extension_settings[extensionName].tampermonkey_compatibility = isEnabled;
  saveSettingsDebounced();
  if (isEnabled) {
    if (!tampermonkeyMessageListener) {
      tampermonkeyMessageListener = handleTampermonkeyMessages;
      window.addEventListener("message", tampermonkeyMessageListener);
      createGlobalAudioManager();
    }
  } else {
    if (tampermonkeyMessageListener) {
      window.removeEventListener("message", tampermonkeyMessageListener);
      tampermonkeyMessageListener = null;
    }
  }
  await reloadCurrentChat();
  await renderAllIframes();
}

async function onDepthInput() {
  const processDepth = parseInt($("#process_depth").val(), 10);
  extension_settings[extensionName].process_depth = processDepth;

  await renderAllIframes();

  saveSettingsDebounced();
}
eventSource.on(event_types.CHAT_CHANGED, async () => {
  const bgmPlayer = document.getElementById("audio_bgm");
  const ambientPlayer = document.getElementById("audio_ambient");

  if (bgmPlayer && !bgmPlayer.paused) {
    bgmPlayer.pause();
  }

  if (ambientPlayer && !ambientPlayer.paused) {
    ambientPlayer.pause();
  }
  await refreshAudioResources();
});

async function autoEnableCharacterRegex() {
  if (this_chid === undefined) {
    return;
  }

  if (selected_group) {
    return;
  }

  const avatar = characters[this_chid].avatar;
  if (!extension_settings.character_allowed_regex.includes(avatar)) {
    extension_settings.character_allowed_regex.push(avatar);
    reloadCurrentChat();
  }

  saveSettingsDebounced();
}

async function registerAutoEnableCharacterRegex() {
  eventSource.on(event_types.CHAT_CHANGED, autoEnableCharacterRegex);
}

async function unregisterAutoEnableCharacterRegex() {
  eventSource.removeListener(
    event_types.CHAT_CHANGED,
    autoEnableCharacterRegex
  );
}

async function onAutoEnableCharacterRegexClick() {
  const isEnabled = Boolean($("#auto_enable_character_regex").prop("checked"));
  extension_settings[extensionName].auto_enable_character_regex = isEnabled;
  if (isEnabled) {
    registerAutoEnableCharacterRegex();
  } else {
    saveSettingsDebounced();
  }
}

async function autoDisableIncompatibleOptions() {
  if (power_user.auto_fix_generated_markdown || power_user.trim_sentences || power_user.forbid_external_media) {
    power_user.auto_fix_generated_markdown = false;
    $("#auto_fix_generated_markdown").prop("checked", power_user.auto_fix_generated_markdown);

    power_user.trim_sentences = false;
    $("#trim_sentences_checkbox").prop("checked", power_user.trim_sentences);

    power_user.forbid_external_media = false;
    $("#forbid_external_media").prop("checked", power_user.forbid_external_media);
  }
  saveSettingsDebounced();
}

async function registerAutoDisableIncompatibleOptions() {
  eventSource.on(event_types.CHAT_CHANGED, autoDisableIncompatibleOptions);
}

async function unregisterAutoDisableIncompatibleOptions() {
  eventSource.removeListener(
    event_types.CHAT_CHANGED,
    autoDisableIncompatibleOptions
  );
}

async function onAutoDisableIncompatibleOptions() {
  const isEnabled = Boolean(
    $("#auto_disable_incompatible_options").prop("checked")
  );
  extension_settings[extensionName].auto_disable_incompatible_options =
    isEnabled;
  if (isEnabled) {
    registerAutoDisableIncompatibleOptions();
  } else {
    unregisterAutoDisableIncompatibleOptions();
  }
  saveSettingsDebounced();
}

async function onEnabledClick() {
  const isEnabled = Boolean($("#audio_enabled").prop("checked"));
  extension_settings[extensionName].audio_setting = isEnabled;

  if (isEnabled) {
    enableAudioControls();
    if ($("#audio_bgm").attr("src") != "") $("#audio_bgm")[0].play();
    if ($("#audio_ambient").attr("src") != "") $("#audio_ambient")[0].play();
  } else {
    $("#audio_bgm")[0].pause();
    $("#audio_ambient")[0].pause();
    disableAudioControls();
  }

  saveSettingsDebounced();
}

function disableAudioControls() {
  $("#audio_bgm_play_pause").prop("disabled", true);
  $("#audio_ambient_play_pause").prop("disabled", true);

  $("#audio_bgm_volume_slider").prop("disabled", true);
  $("#audio_ambient_volume_slider").prop("disabled", true);
}

function enableAudioControls() {
  $("#audio_bgm_play_pause").prop("disabled", false);
  $("#audio_ambient_play_pause").prop("disabled", false);

  $("#audio_bgm_volume_slider").prop("disabled", false);
  $("#audio_ambient_volume_slider").prop("disabled", false);
}

async function getBgmUrl() {
  await new Promise((resolve) => setTimeout(resolve, 3000));
  const variables = chat_metadata?.variables || {};
  for (const key of Object.keys(variables)) {
    if (key.toLowerCase() === "bgmurl") {
      let bgmUrlValue = variables[key];
      bgmUrlValue = bgmUrlValue.filter((url) => url !== null);
      return bgmUrlValue;
    }
  }
  return null;
}

async function getAmbientUrl() {
  const variables = chat_metadata?.variables || {};
  for (const key of Object.keys(variables)) {
    if (key.toLowerCase() === "ambienturl") {
      let ambientUrlValue = variables[key];
      ambientUrlValue = ambientUrlValue.filter((url) => url !== null);
      return ambientUrlValue;
    }
  }
  return null;
}

async function onBGMEnabledClick() {
  extension_settings[extensionName].audio.bgm_enabled =
    $("#enable_bgm").is(":checked");

  if (extension_settings[extensionName].audio.bgm_enabled) {
    if ($("#audio_bgm").attr("src") != "") {
      $("#audio_bgm")[0].play();
    }
  } else {
    $("#audio_bgm")[0].pause();
  }

  saveSettingsDebounced();
}

async function onAmbientEnabledClick() {
  extension_settings[extensionName].audio.ambient_enabled =
    $("#enable_ambient").is(":checked");

  if (extension_settings[extensionName].audio.ambient_enabled) {
    if ($("#audio_ambient").attr("src") != "") {
      $("#audio_ambient")[0].play();
    }
  } else {
    $("#audio_ambient")[0].pause();
  }

  saveSettingsDebounced();
}

async function onBGMModeClick() {
  const modes = [
    { mode: "repeat", icon: "fa-repeat" },
    { mode: "random", icon: "fa-random" },
    { mode: "single", icon: "fa-redo-alt" },
    { mode: "stop", icon: "fa-cancel" },
  ];

  const currentModeIndex = modes.findIndex(
    (m) => m.mode === extension_settings[extensionName].audio.bgm_mode
  );

  const nextModeIndex = (currentModeIndex + 1) % modes.length;

  extension_settings[extensionName].audio.bgm_mode = modes[nextModeIndex].mode;

  $("#audio_bgm_mode_icon").removeClass(
    "fa-repeat fa-random fa-redo-alt fa-cancel"
  );

  $("#audio_bgm_mode_icon").addClass(modes[nextModeIndex].icon);

  saveSettingsDebounced();
}

async function onBGMRandomClick() {
  var select = document.getElementById("audio_bgm_select");
  var items = select.getElementsByTagName("option");

  if (items.length < 2) return;

  var index;
  do {
    index = Math.floor(Math.random() * items.length);
  } while (index == select.selectedIndex);

  select.selectedIndex = index;
  onBGMSelectChange();
}

async function onBGMMuteClick() {
  extension_settings[extensionName].audio.bgm_muted =
    !extension_settings[extensionName].audio.bgm_muted;
  $("#audio_bgm_mute_icon").toggleClass("fa-volume-high");
  $("#audio_bgm_mute_icon").toggleClass("fa-volume-mute");
  $("#audio_bgm").prop("muted", !$("#audio_bgm").prop("muted"));
  $("#audio_bgm_mute").toggleClass("redOverlayGlow");
  saveSettingsDebounced();
}

async function onAmbientModeClick() {
  const modes = [
    { mode: "repeat", icon: "fa-repeat" },
    { mode: "random", icon: "fa-random" },
    { mode: "single", icon: "fa-redo-alt" },
    { mode: "stop", icon: "fa-cancel" },
  ];

  const currentModeIndex = modes.findIndex(
    (m) => m.mode === extension_settings[extensionName].audio.ambient_mode
  );

  const nextModeIndex = (currentModeIndex + 1) % modes.length;

  extension_settings[extensionName].audio.ambient_mode =
    modes[nextModeIndex].mode;

  $("#audio_ambient_mode_icon").removeClass(
    "fa-repeat fa-random fa-redo-alt fa-cancel"
  );
  $("#audio_ambient_mode_icon").addClass(modes[nextModeIndex].icon);

  saveSettingsDebounced();
}

async function onAmbientMuteClick() {
  extension_settings[extensionName].audio.ambient_muted =
    !extension_settings[extensionName].audio.ambient_muted;
  $("#audio_ambient_mute_icon").toggleClass("fa-volume-high");
  $("#audio_ambient_mute_icon").toggleClass("fa-volume-mute");
  $("#audio_ambient").prop("muted", !$("#audio_ambient").prop("muted"));
  $("#audio_ambient_mute").toggleClass("redOverlayGlow");
  saveSettingsDebounced();
}

async function onBGMVolumeChange() {
  extension_settings[extensionName].audio.bgm_volume = ~~$(
    "#audio_bgm_volume_slider"
  ).val();
  $("#audio_bgm").prop(
    "volume",
    extension_settings[extensionName].audio.bgm_volume * 0.01
  );
  $("#audio_bgm_volume").text(
    extension_settings[extensionName].audio.bgm_volume
  );
  saveSettingsDebounced();
}

async function onAmbientVolumeChange() {
  extension_settings[extensionName].audio.ambient_volume = ~~$(
    "#audio_ambient_volume_slider"
  ).val();
  $("#audio_ambient").prop(
    "volume",
    extension_settings[extensionName].audio.ambient_volume * 0.01
  );
  $("#audio_ambient_volume").text(
    extension_settings[extensionName].audio.ambient_volume
  );
  saveSettingsDebounced();
}

async function onBGMSelectChange() {
  extension_settings[extensionName].audio.bgm_selected =
    $("#audio_bgm_select").val();
  updateBGM(true);
  saveSettingsDebounced();
}

async function onAmbientSelectChange() {
  extension_settings[extensionName].audio.ambient_selected = $(
    "#audio_ambient_select"
  ).val();
  updateAmbient(true);
  saveSettingsDebounced();
}

async function onBGMCooldownInput() {
  extension_settings[extensionName].audio.bgm_cooldown = ~~$(
    "#audio_bgm_cooldown"
  ).val();
  saveSettingsDebounced();
}

async function playAudio(type) {
  if (!extension_settings[extensionName].audio_setting) {
    return;
  }
  if (type === "bgm" && !extension_settings[extensionName].audio.bgm_enabled) {
    return;
  }
  if (
    type === "ambient" &&
    !extension_settings[extensionName].audio.ambient_enabled
  ) {
    return;
  }
  const audioElement = $(`#audio_${type}`)[0];
  const playPauseIcon = $(`#audio_${type}_play_pause_icon`);

  if (audioElement.error && audioElement.error.code === 4) {
    console.warn(
      `The ${type} element has no supported sources. Trying to reload selected audio from dropdown...`
    );
    const selectedAudio = $(`#audio_${type}_select`).val();

    if (!selectedAudio) {
      console.error(`No audio selected in ${type} dropdown.`);
      return;
    }

    audioElement.src = selectedAudio;
  }

  audioElement.play();
  playPauseIcon.removeClass("fa-play");
  playPauseIcon.addClass("fa-pause");
}

async function togglePlayPause(type) {
  if (!extension_settings[extensionName].audio_setting) {
    return;
  }
  const audioElement = $(`#audio_${type}`)[0];
  const playPauseIcon = $(`#audio_${type}_play_pause_icon`);

  if (audioElement.paused) {
    await playAudio(type);
  } else {
    audioElement.pause();
    playPauseIcon.removeClass("fa-pause");
    playPauseIcon.addClass("fa-play");
  }
}

async function handleUrlManagerClick(type) {
  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }
  const existingUrls = chat_metadata.variables[type] || [];

  const newUrls = await openUrlManagerPopup(type);

  if (!newUrls) {
    console.debug(`${type} URL导入已取消`);
    return;
  }

  const mergedUrls = [...new Set([...newUrls, ...existingUrls])];

  chat_metadata.variables[type] = JSON.stringify(mergedUrls);
  saveMetadataDebounced();
  if (type === "bgmurl") {
    list_BGMS = await getBgmUrl();
    updateBGM(true);
  } else if (type === "ambienturl") {
    list_ambients = await getAmbientUrl();
    updateAmbient(true);
  }
}

async function openUrlImportPopup() {
  const input = await callGenericPopup(
    "输入要导入的网络音频链接（每行一个）",
    POPUP_TYPE.INPUT,
    ""
  );

  if (!input) {
    console.debug("URL import cancelled");
    return null;
  }

  const urlArray = input
    .trim()
    .split("\n")
    .map((url) => url.trim())
    .filter((url) => url !== "");

  return Array.from(new Set(urlArray));
}

async function openUrlManagerPopup(type) {
  const urlManager = $(
    await renderExtensionTemplateAsync(`${extensionFolderPath}`, "urlManager")
  );
  urlManager.prepend(`
    <style>
      #saved_audio_url.empty::after {
        content: "暂无音频";
        color: #999;
        margin-top: 20px;
        font-size: 12px;
      }
    </style>
  `);
  const savedAudioUrl = urlManager.find("#saved_audio_url").empty();
  const urlTemplate = $(
    await renderExtensionTemplateAsync(`${extensionFolderPath}`, "urlTemplate")
  );

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const typeKey = type === "bgmurl" ? "bgmurl" : "ambienturl";
  let urlValue = chat_metadata.variables[typeKey];
  if (!urlValue) {
    console.warn(`No ${typeKey} found in chat_metadata.variables`);
    urlValue = [];

    savedAudioUrl.addClass("empty");
  } else {
    try {
      if (urlValue.length === 0) {
        savedAudioUrl.addClass("empty");
      }
    } catch (error) {
      console.error(`Failed to parse ${typeKey}:`, error);
      return null;
    }
  }

  const updatedUrls = {};
  let newUrlOrder = [...urlValue];
  let importedUrls = [];
  function renderUrl(container, url) {
    const urlHtml = urlTemplate.clone();
    let fileName;
    if (url.includes("/")) {
      const parts = url.split("/");
      fileName = parts[parts.length - 1] || parts[parts.length - 2];
    } else {
      fileName = url;
    }

    const id = fileName.replace(/\./g, "-");

    urlHtml.attr("id", id);
    urlHtml.find(".audio_url_name").text(fileName);

    urlHtml.find(".audio_url_name").attr("data-url", url);

    urlHtml.find(".edit_existing_url").on("click", async function () {
      const currentUrl = urlHtml.find(".audio_url_name").attr("data-url");

      if (!currentUrl) {
        console.error("No URL found for this element.");
        return;
      }

      const inputUrl = await callGenericPopup("", POPUP_TYPE.INPUT, currentUrl);

      if (!inputUrl) {
        return;
      }

      const newFileName = inputUrl.split("/").pop();

      const newId = newFileName.replace(/\./g, "-");

      urlHtml.attr("id", newId);
      urlHtml.find(".audio_url_name").text(newFileName);
      urlHtml.find(".audio_url_name").attr("data-url", inputUrl);

      updatedUrls[currentUrl] = inputUrl;
    });

    urlHtml.find(".delete_regex").on("click", async function () {
      const confirmDelete = await callGenericPopup(
        "确认要删除此链接?此操作无法撤回",
        POPUP_TYPE.CONFIRM
      );

      if (!confirmDelete) {
        return;
      }

      const currentUrl = urlHtml.find(".audio_url_name").attr("data-url");

      if (chat_metadata.variables && chat_metadata.variables[typeKey]) {
        let urlList = chat_metadata.variables[typeKey];

        urlList = urlList.filter((item) => item !== currentUrl);

        chat_metadata.variables[typeKey] = urlList;

        saveMetadataDebounced();
      }

      urlHtml.remove();
      newUrlOrder = newUrlOrder.filter((url) => url !== currentUrl);
      if (newUrlOrder.length === 0) {
        savedAudioUrl.addClass("empty");
      }
    });

    container.append(urlHtml);
  }

  urlValue.forEach((url) => {
    renderUrl(savedAudioUrl, url);
  });
  urlManager.find("#import_button").on("click", async function () {
    const newUrls = await openUrlImportPopup(typeKey);

    if (!newUrls) {
      console.debug(`${typeKey} URL导入已取消`);
      return;
    }

    importedUrls = [...importedUrls, ...newUrls];
    savedAudioUrl.removeClass("empty");

    newUrls.forEach((url) => {
      renderUrl(savedAudioUrl, url);
      newUrlOrder.push(url);
    });
  });
  savedAudioUrl.sortable({
    delay: getSortableDelay(),
    handle: ".drag-handle",
    stop: function () {
      newUrlOrder = [];
      savedAudioUrl.find(".audio_url_name").each(function () {
        const newUrl = $(this).attr("data-url");
        newUrlOrder.push(newUrl);
      });
    },
  });
  const result = await callGenericPopup(urlManager, POPUP_TYPE.CONFIRM, "", {
    okButton: `确认`,
    cancelButton: `取消`,
  });

  if (result) {
    for (let originalUrl in updatedUrls) {
      const newUrl = updatedUrls[originalUrl];
      const index = newUrlOrder.indexOf(originalUrl);
      if (index !== -1) {
        newUrlOrder[index] = newUrl;
      }
    }
    chat_metadata.variables[typeKey] = newUrlOrder;
    saveMetadataDebounced();
    if (typeKey === "bgmurl") {
      updateBGMSelect();
    } else if (typeKey === "ambienturl") {
      updateAmbientSelect();
    }
  }
}

async function refreshAudioResources() {
  list_BGMS = await getBgmUrl();
  list_ambients = await getAmbientUrl();
  updateBGMSelect();
  updateAmbientSelect();
}

function updateBGMSelect() {
  if (!$("#audio_enabled").is(":checked")) {
    return;
  }
  const bgmSelect = $("#audio_bgm_select");
  bgmSelect.empty();

  if (list_BGMS && list_BGMS.length > 0) {
    if (
      !list_BGMS.includes(extension_settings[extensionName].audio.bgm_selected)
    ) {
      extension_settings[extensionName].audio.bgm_selected = list_BGMS[0];
    }

    list_BGMS.forEach((file) => {
      const fileLabel = file.replace(/^.*[\\\/]/, "").replace(/\.[^/.]+$/, "");
      bgmSelect.append(new Option(fileLabel, file));
    });

    bgmSelect.val(extension_settings[extensionName].audio.bgm_selected);
  } else {
    console.warn("No BGM assets detected.");
  }
}

function updateAmbientSelect() {
  if (!$("#audio_enabled").is(":checked")) {
    return;
  }
  const ambientSelect = $("#audio_ambient_select");
  ambientSelect.empty();

  if (list_ambients && list_ambients.length > 0) {
    if (
      !list_ambients.includes(
        extension_settings[extensionName].audio.ambient_selected
      )
    ) {
      extension_settings[extensionName].audio.ambient_selected =
        list_ambients[0];
    }

    list_ambients.forEach((file) => {
      const fileLabel = file.replace(/^.*[\\\/]/, "").replace(/\.[^/.]+$/, "");
      ambientSelect.append(new Option(fileLabel, file));
    });

    ambientSelect.val(extension_settings[extensionName].audio.ambient_selected);
  } else {
    console.warn("No Ambient assets detected.");
  }
}
async function updateBGM(isUserInput = false, newChat = false) {
  if (!extension_settings[extensionName].audio_setting) {
    return;
  }
  if (!extension_settings[extensionName].audio.bgm_enabled) {
    return;
  }

  if (
    !isUserInput &&
    $("#audio_bgm").attr("src") != "" &&
    !bgmEnded &&
    !newChat
  ) {
    return;
  }

  let audio_url = "";
  const playlist = list_BGMS || [];

  if (isUserInput) {
    audio_url =
      extension_settings[extensionName].audio.bgm_selected || playlist[0];
  } else {
    audio_url = getNextFileByMode(
      extension_settings[extensionName].audio.bgm_mode,
      playlist,
      extension_settings[extensionName].audio.bgm_selected
    );
  }

  if (!audio_url) {
    return;
  }

  const audio = $("#audio_bgm")[0];

  if (
    decodeURIComponent(audio.src) === decodeURIComponent(audio_url) &&
    !bgmEnded
  ) {
    return;
  }
  bgmEnded = false;

  if (audioCache[audio_url]) {
    audio.src = audioCache[audio_url];
    audio.play();
  } else {
    audio.src = audio_url;
    audio.play();
    audioCache[audio_url] = audio_url;
  }

  extension_settings[extensionName].audio.bgm_selected = audio_url;

  const bgmSelect = $("#audio_bgm_select");
  if (bgmSelect.val() !== audio_url) {
    bgmSelect.val(audio_url);
  }

  saveSettingsDebounced();
}

function getAudioUrlWithCacheBusting(originalUrl) {
  const cacheBuster = `cb=${new Date().getTime()}`;
  if (originalUrl.includes("?")) {
    return `${originalUrl}&${cacheBuster}`;
  } else {
    return `${originalUrl}?${cacheBuster}`;
  }
}

async function updateAmbient(isUserInput = false) {
  if (!extension_settings[extensionName].audio_setting) {
    return;
  }
  if (!extension_settings[extensionName].audio.ambient_enabled) {
    return;
  }

  if (
    !isUserInput &&
    $("#audio_ambient").attr("src") != "" &&
    !ambientEnded &&
    !newChat
  ) {
    return;
  }

  let audio_url = "";
  const playlist = list_ambients || [];

  if (isUserInput) {
    audio_url =
      extension_settings[extensionName].audio.ambient_selected || playlist[0];
  } else {
    audio_url = getNextFileByMode(
      extension_settings[extensionName].audio.ambient_mode,
      playlist,
      extension_settings[extensionName].audio.ambient_selected
    );
  }

  if (!audio_url) {
    return;
  }

  const audio = $("#audio_ambient")[0];
  const cleanAudioSrc = audio.src.split("?")[0];
  const cleanAudioUrl = audio_url.split("?")[0];
  if (
    decodeURIComponent(cleanAudioSrc) === decodeURIComponent(cleanAudioUrl) &&
    !ambientEnded
  ) {
    return;
  }

  ambientEnded = false;
  const audioUrlWithCacheBusting = getAudioUrlWithCacheBusting(audio_url);
  audio.src = audioUrlWithCacheBusting;
  audio.play();
  extension_settings[extensionName].audio.ambient_selected = audio_url;
  const ambientSelect = $("#audio_ambient_select");
  if (ambientSelect.val() !== audio_url) {
    ambientSelect.val(audio_url);
  }

  saveSettingsDebounced();
}

function getNextFileByMode(mode, playlist, currentFile) {
  if (!playlist || playlist.length === 0) {
    console.warn("播放列表为空");
    return null;
  }

  let nextFile = null;

  switch (mode) {
    case "repeat":
      const currentIndex = playlist.indexOf(currentFile);
      if (currentIndex === -1 || currentIndex === playlist.length - 1) {
        nextFile = playlist[0];
      } else {
        nextFile = playlist[currentIndex + 1];
      }
      break;

    case "random":
      nextFile = playlist[Math.floor(Math.random() * playlist.length)];
      break;

    case "single":
      nextFile = currentFile;
      break;

    case "stop":
      nextFile = null;
      break;

    default:
      console.warn(`未知的播放模式: ${mode}`);
      break;
  }

  return nextFile;
}

function onVolumeSliderWheelEvent(e) {
  const slider = $(this);
  e.preventDefault();
  e.stopPropagation();

  const delta = e.deltaY / 20;
  const sliderVal = Number(slider.val());

  let newVal = sliderVal - delta;
  if (newVal < 0) {
    newVal = 0;
  } else if (newVal > 100) {
    newVal = 100;
  }

  slider.val(newVal).trigger("input");
}

function handleLongPress(volumeControlId, iconId) {
  const volumeControl = document.getElementById(volumeControlId);
  const icon = document.getElementById(iconId);
  let pressTimer;

  if (isMobile()) {
    icon.addEventListener("touchstart", (e) => {
      pressTimer = setTimeout(() => {
        volumeControl.style.display = "block";
      }, 500);
    });

    icon.addEventListener("touchend", (e) => {
      clearTimeout(pressTimer);
    });

    document.addEventListener("click", (event) => {
      if (
        !icon.contains(event.target) &&
        !volumeControl.contains(event.target)
      ) {
        volumeControl.style.display = "none";
      }
    });
  }
}

function initializeProgressBar(type) {
  cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
  const audioElement = $(`#audio_${type}`)[0];
  const progressSlider = $(`#audio_${type}_progress_slider`);

  audioElement.addEventListener("timeupdate", () => {
    if (!isNaN(audioElement.duration)) {
      const progressPercent =
        (audioElement.currentTime / audioElement.duration) * 100;
      progressSlider.val(progressPercent);
    }
    const cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
    const remainingTime = audioElement.duration - audioElement.currentTime;
    if (remainingTime <= cooldownBGM && !audioElement.isFadingOut) {
      const initialVolume = audioElement.volume;
      const fadeStep = initialVolume / (cooldownBGM * 10);
      audioElement.isFadingOut = true;

      const fadeOutInterval = setInterval(() => {
        if (audioElement.volume > 0) {
          audioElement.volume = Math.max(0, audioElement.volume - fadeStep);
        } else {
          clearInterval(fadeOutInterval);
          audioElement.isFadingOut = false;
        }
      }, 100);
    }
  });

  audioElement.addEventListener("play", () => {
    audioElement.volume = 0;
    const cooldownBGM = extension_settings[extensionName].audio.bgm_cooldown;
    const targetVolume = $(`#audio_${type}_volume_slider`).val() / 100;
    const fadeStep = targetVolume / (cooldownBGM * 10);
    let fadeInInterval = setInterval(() => {
      if (audioElement.volume < targetVolume) {
        audioElement.volume = Math.min(
          targetVolume,
          audioElement.volume + fadeStep
        );
      } else {
        clearInterval(fadeInInterval);
      }
    }, 100);
  });

  audioElement.addEventListener("loadedmetadata", () => {
    if (!isNaN(audioElement.duration)) {
      progressSlider.attr("max", 100);
    }
  });

  progressSlider.on("input", () => {
    const value = progressSlider.val();
    if (!isNaN(audioElement.duration)) {
      audioElement.currentTime = (value / 100) * audioElement.duration;
    }
  });
}

jQuery(async () => {
  const getContainer = () =>
    $(
      document.getElementById("audio_container") ??
      document.getElementById("extensions_settings")
    );
  const windowHtml = await renderExtensionTemplateAsync(
    `${extensionFolderPath}`,
    "settings"
  );
  getContainer().append(windowHtml);
  loadSettings();
  const buttonHtml = $(`
  <div id="js_slash_runner_container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      切换渲染状态
  </div>`);
  buttonHtml.css("display", "flex");
  $("#extensionsMenu").append(buttonHtml);
  $("#js_slash_runner_container").on("click", function () {
    const currentChecked = $("#activate_setting").prop("checked");
    $("#activate_setting").prop("checked", !currentChecked);
    onExtensionToggle();
  });

  $("#activate_setting").on("click", onExtensionToggle);
  if ($("#activate_setting").prop("checked")) {
    onExtensionToggle();
  }
  $("#tampermonkey_compatibility").on(
    "click",
    onTampermonkeyCompatibilityChange
  );
  if ($("#tampermonkey_compatibility").prop("checked")) {
    onTampermonkeyCompatibilityChange();
  }
  $("#process_depth").on("input", onDepthInput);

  $("#auto_enable_character_regex").on(
    "click",
    onAutoEnableCharacterRegexClick
  );
  if ($("#auto_enable_character_regex").prop("checked")) {
    onAutoEnableCharacterRegexClick();
  }
  $("#auto_disable_incompatible_options").on(
    "click",
    onAutoDisableIncompatibleOptions
  );
  if ($("#auto_disable_incompatible_options").prop("checked")) {
    onAutoDisableIncompatibleOptions();
  }
  $("#audio_enabled").on("click", onEnabledClick);

  $("#enable_bgm").on("click", onBGMEnabledClick);
  $("#enable_ambient").on("click", onAmbientEnabledClick);
  $("#audio_bgm").hide();
  $("#audio_bgm_mode").on("click", onBGMModeClick);
  $("#audio_bgm_mute").on("click", onBGMMuteClick);
  $("#audio_bgm_volume_slider").on("input", onBGMVolumeChange);
  $("#audio_bgm_random").on("click", onBGMRandomClick);
  $("#audio_ambient").hide();
  $("#audio_ambient_mode").on("click", onAmbientModeClick);
  $("#audio_ambient_mute").on("click", onAmbientMuteClick);
  $("#audio_ambient_volume_slider").on("input", onAmbientVolumeChange);

  document
    .getElementById("audio_ambient_volume_slider")
    .addEventListener("wheel", onVolumeSliderWheelEvent, { passive: false });
  document
    .getElementById("audio_bgm_volume_slider")
    .addEventListener("wheel", onVolumeSliderWheelEvent, { passive: false });

  document.addEventListener("DOMContentLoaded", () => {
    handleLongPress("volume-control", "audio_bgm_mute_icon");
    handleLongPress("ambient-volume-control", "audio_ambient_mute_icon");
  });

  $("#audio_bgm_cooldown").on("input", onBGMCooldownInput);

  $("#audio_refresh_assets").on("click", function () {
    list_BGMS = null;
    list_ambients = null;
    getBgmUrl();
    getAmbientUrl();
  });

  $("#audio_bgm_select").on("change", onBGMSelectChange);
  $("#audio_ambient_select").on("change", onAmbientSelectChange);

  $("#audio_bgm").on("ended", function () {
    bgmEnded = true;
    updateBGM();
  });

  $("#audio_ambient").on("ended", function () {
    ambientEnded = true;
    updateAmbient();
  });

  $("#bgm_manager_button").on("click", async () => {
    await handleUrlManagerClick("bgmurl");
    await refreshAudioResources();
  });

  $("#ambient_manager_button").on("click", async () => {
    await handleUrlManagerClick("ambienturl");
    await refreshAudioResources();
  });

  $("#audio_refresh_assets").on("click", async () => {
    await refreshAudioResources();
  });

  $("#audio_bgm_play_pause").on("click", async () => {
    await togglePlayPause("bgm");
  });

  $("#audio_ambient_play_pause").on("click", async () => {
    await togglePlayPause("ambient");
  });

  $("#audio_bgm").on("play", function () {
    $("#audio_bgm_play_pause_icon").removeClass("fa-play").addClass("fa-pause");
  });

  $("#audio_bgm").on("pause", function () {
    $("#audio_bgm_play_pause_icon").removeClass("fa-pause").addClass("fa-play");
  });

  $("#audio_bgm").on("error", function () {
    $("#audio_bgm_play_pause").prop("disabled", true);
  });

  $("#audio_ambient").on("play", function () {
    $("#audio_ambient_play_pause_icon")
      .removeClass("fa-play")
      .addClass("fa-pause");
  });

  $("#audio_ambient").on("pause", function () {
    $("#audio_ambient_play_pause_icon")
      .removeClass("fa-pause")
      .addClass("fa-play");
  });

  $("#audio_ambient").on("error", function () {
    $("#audio_ambient_play_pause").prop("disabled", true);
  });

  $("#audio_bgm_select").on("change", function () {
    const selectedBGM = $(this).val();
    extension_settings[extensionName].audio.bgm_selected = selectedBGM;
    updateBGM(true);
  });

  initializeProgressBar("bgm");
  initializeProgressBar("ambient");
  initSlashEventEmit();
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "audioselect",
      callback: handleAudioSelectCommand,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: "type",
          description: "选择播放器类型 (bgm 或 ambient)",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "bgm",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
            new SlashCommandEnumValue(
              "ambient",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
          ],
          isRequired: true,
        }),
      ],
      unnamedArgumentList: [
        new SlashCommandArgument("url", [ARGUMENT_TYPE.STRING], true),
      ],
      helpString: `
        <div>
            选择并播放音频。如果音频链接不存在，则先导入再播放。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioselect type=bgm https://example.com/song.mp3</code></pre>
                    选择并播放指定的音乐。
                </li>
                <li>
                    <pre><code>/audioselect type=ambient https://example.com/sound.mp3</code></pre>
                    选择并播放指定的音效。
                </li>
            </ul>
        </div>
      `,
    })
  );
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "audioimport",
      callback: handleAudioImportCommand,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: "type",
          description: "选择导入类型 (bgm 或 ambient)",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "bgm",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
            new SlashCommandEnumValue(
              "ambient",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
          ],
          isRequired: true,
        }),
        SlashCommandNamedArgument.fromProps({
          name: "play",
          description: "导入后是否立即播放第一个链接",
          typeList: [ARGUMENT_TYPE.BOOLEAN],
          defaultValue: "true",
          isRequired: false,
        }),
      ],
      unnamedArgumentList: [
        new SlashCommandArgument("url", [ARGUMENT_TYPE.STRING], true),
      ],
      helpString: `
        <div>
            导入音频或音乐链接，并决定是否立即播放，默认为自动播放。可批量导入链接，使用英文逗号分隔。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioimport type=bgm https://example.com/song1.mp3,https://example.com/song2.mp3</code></pre>
                    导入 BGM 音乐并立即播放第一个链接。
                </li>
                <li>
                    <pre><code>/audioimport type=ambient play=false url=https://example.com/sound1.mp3,https://example.com/sound2.mp3 </code></pre>
                    导入音效链接 (不自动播放)。
                </li>
            </ul>
        </div>
      `,
    })
  );

  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "audioplay",
      callback: togglePlayPauseCommand,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: "type",
          description: "选择控制的播放器 (bgm 或 ambient)",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "bgm",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
            new SlashCommandEnumValue(
              "ambient",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
          ],
          isRequired: true,
        }),
        new SlashCommandNamedArgument(
          "play",
          "播放或暂停",
          [ARGUMENT_TYPE.STRING],
          true,
          false,
          "true",
          commonEnumProviders.boolean("trueFalse")()
        ),
      ],
      helpString: `
        <div>
            控制音乐播放器或音效播放器的播放与暂停。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioplay type=bgm</code></pre>
                    播放当前音乐。
                </li>
                <li>
                    <pre><code>/audioplay type=ambient play=false</code></pre>
                    暂停当前音效。
                </li>
            </ul>
        </div>
      `,
    })
  );
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "audioenable",
      callback: togglePlayer,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: "type",
          description: "选择控制的播放器 (bgm 或 ambient)",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "bgm",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
            new SlashCommandEnumValue(
              "ambient",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
          ],
          isRequired: true,
        }),
        new SlashCommandNamedArgument(
          "state",
          "打开或关闭播放器",
          [ARGUMENT_TYPE.STRING],
          false,
          false,
          "true",
          commonEnumProviders.boolean("trueFalse")()
        ),
      ],
      helpString: `
        <div>
            控制音乐播放器或音效播放器的开启与关闭。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audioenable type=bgm state=true</code></pre>
                    打开音乐播放器。
                </li>
                <li>
                    <pre><code>/audioenable type=ambient state=false</code></pre>
                    关闭音效播放器。
                </li>
            </ul>
        </div>
    `,
    })
  );
  SlashCommandParser.addCommandObject(
    SlashCommand.fromProps({
      name: "audiomode",
      callback: toggleAudioMode,
      namedArgumentList: [
        SlashCommandNamedArgument.fromProps({
          name: "type",
          description: "选择控制的播放器 (bgm 或 ambient)",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "bgm",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
            new SlashCommandEnumValue(
              "ambient",
              null,
              enumTypes.enum,
              enumIcons.file
            ),
          ],
          isRequired: true,
        }),
        SlashCommandNamedArgument.fromProps({
          name: "mode",
          description: "选择播放模式",
          typeList: [ARGUMENT_TYPE.STRING],
          enumList: [
            new SlashCommandEnumValue(
              "repeat",
              null,
              enumTypes.enum,
              enumIcons.loop
            ),
            new SlashCommandEnumValue(
              "random",
              null,
              enumTypes.enum,
              enumIcons.shuffle
            ),
            new SlashCommandEnumValue(
              "single",
              null,
              enumTypes.enum,
              enumIcons.redo
            ),
            new SlashCommandEnumValue(
              "stop",
              null,
              enumTypes.enum,
              enumIcons.stop
            ),
          ],
          isRequired: true,
        }),
      ],
      helpString: `
        <div>
            切换音乐播放器或音效播放器的播放模式。
        </div>
        <div>
            <strong>Example:</strong>
            <ul>
                <li>
                    <pre><code>/audiomode type=bgm mode=repeat</code></pre>
                    将音乐播放器的模式设置为循环播放。
                </li>
                <li>
                    <pre><code>/audiomode type=ambient mode=random</code></pre>
                    将音效播放器的模式设置为随机播放。
                </li>
            </ul>
        </div>
      `,
    })
  );

  window.addEventListener('resize', () => {
    if (document.querySelector('iframe[data-needs-vh="true"]')) {
      updateIframeViewportHeight();
    }
  });
});

async function toggleAudioMode(args) {
  const type = args.type.toLowerCase();
  const mode = args.mode.toLowerCase();

  if (
    !["bgm", "ambient"].includes(type) ||
    !["repeat", "random", "single", "stop"].includes(mode)
  ) {
    console.warn("WARN: Invalid arguments for /audiomode command");
    return "";
  }

  if (type === "bgm") {
    extension_settings[extensionName].audio.bgm_mode = mode;
    const iconMap = {
      repeat: "fa-repeat",
      random: "fa-random",
      single: "fa-redo-alt",
      stop: "fa-cancel",
    };
    $("#audio_bgm_mode_icon").removeClass(
      "fa-repeat fa-random fa-redo-alt fa-cancel"
    );
    $("#audio_bgm_mode_icon").addClass(iconMap[mode]);
  } else if (type === "ambient") {
    extension_settings[extensionName].audio.ambient_mode = mode;
    const iconMap = {
      repeat: "fa-repeat",
      random: "fa-random",
      single: "fa-redo-alt",
      stop: "fa-cancel",
    };
    $("#audio_ambient_mode_icon").removeClass(
      "fa-repeat fa-random fa-redo-alt fa-cancel"
    );
    $("#audio_ambient_mode_icon").addClass(iconMap[mode]);
  }

  saveSettingsDebounced();
  return "";
}

async function togglePlayer(args, value) {
  const state = args.state ? args.state.toLowerCase() : "true";

  if (!args?.type) {
    console.warn("WARN: Missing arguments for /audioenable command");
    return "";
  }

  const type = args.type.toLowerCase();

  if (type === "bgm") {
    if (state === "true") {
      $("#enable_bgm").prop("checked", true);
      await onBGMEnabledClick();
    } else if (state === "false") {
      $("#enable_bgm").prop("checked", false);
      await onBGMEnabledClick();
    }
  } else if (type === "ambient") {
    if (state === "true") {
      $("#enable_ambient").prop("checked", true);
      await onAmbientEnabledClick();
    } else if (state === "false") {
      $("#enable_ambient").prop("checked", false);
      await onAmbientEnabledClick();
    }
  }

  return "";
}

async function togglePlayPauseCommand(args, value) {
  if (!args?.type) {
    console.warn("WARN: Missing arguments for /audioplaypause command");
    return "";
  }

  const type = args.type.toLowerCase();
  const play = args.play ? args.play.toLowerCase() : "true";

  if (type === "bgm") {
    if (play === "true") {
      await playAudio("bgm");
    } else if (play === "false") {
      $("#audio_bgm")[0].pause();
    }
  } else if (type === "ambient") {
    if (play === "true") {
      await playAudio("ambient");
    } else if (play === "false") {
      $("#audio_ambient")[0].pause();
    }
  }

  return "";
}

async function handleAudioImportCommand(args, text) {
  if (!args?.type || !text) {
    console.warn("WARN: Missing arguments for /audioimport command");
    return "";
  }

  const type = args.type.toLowerCase();
  const play = args.play ? args.play.toLowerCase() : "true";

  const urlArray = text
    .split(",")
    .map((url) => url.trim())
    .filter((url) => url !== "")
    .filter((url, index, self) => self.indexOf(url) === index);
  if (urlArray.length === 0) {
    console.warn("WARN: Invalid or empty URLs provided.");
    return "";
  }

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const typeKey = type === "bgm" ? "bgmurl" : "ambienturl";
  const existingUrls = chat_metadata.variables[type] || [];
  const mergedUrls = [...new Set([...urlArray, ...existingUrls])];

  chat_metadata.variables[typeKey] = mergedUrls;
  saveMetadataDebounced();

  if (type === "bgm") {
    list_BGMS = mergedUrls;
    updateBGMSelect();
  } else if (type === "ambient") {
    list_ambients = mergedUrls;
    updateAmbientSelect();
  }

  if (play === "true" && urlArray[0]) {
    const selectedUrl = urlArray[0];
    if (type === "bgm") {
      extension_settings[extensionName].audio.bgm_selected = selectedUrl;
      await updateBGM(true);
    } else if (type === "ambient") {
      extension_settings[extensionName].audio.ambient_selected = selectedUrl;
      await updateAmbient(true);
    }
  }

  return "";
}

async function handleAudioSelectCommand(args, text) {
  if (!text) {
    console.warn("WARN: Missing URL for /audioselect command");
    return "";
  }

  const type = args.type.toLowerCase();
  const url = text.trim();

  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  let playlist = type === "bgm" ? list_BGMS : list_ambients;
  const typeKey = type === "bgm" ? "bgmurl" : "ambienturl";

  if (playlist && playlist.includes(url)) {
    if (type === "bgm") {
      extension_settings[extensionName].audio.bgm_selected = url;
      await updateBGM(true);
    } else if (type === "ambient") {
      extension_settings[extensionName].audio.ambient_selected = url;
      await updateAmbient(true);
    }
    return "";
  }

  const existingUrls = chat_metadata.variables[type] || [];

  const mergedUrls = [...new Set([url, ...existingUrls])];
  chat_metadata.variables[typeKey] = mergedUrls;
  saveMetadataDebounced();

  if (type === "bgm") {
    list_BGMS = mergedUrls;
    updateBGMSelect();
    extension_settings[extensionName].audio.bgm_selected = url;
    await updateBGM(true);
  } else if (type === "ambient") {
    list_ambients = mergedUrls;
    updateAmbientSelect();
    extension_settings[extensionName].audio.ambient_selected = url;
    await updateAmbient(true);
  }

  return "";
}
