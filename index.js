import {
  eventSource,
  event_types,
  saveSettingsDebounced,
  chat_metadata,
  updateMessageBlock,
} from "../../../../script.js";

import {
  extension_settings,
  renderExtensionTemplateAsync,
  getContext,
  saveMetadataDebounced,
} from "../../../../scripts/extensions.js";

import { SlashCommandParser } from "../../../../scripts/slash-commands/SlashCommandParser.js";
import { SlashCommand } from "../../../../scripts/slash-commands/SlashCommand.js";
import {
  SlashCommandArgument,
  SlashCommandNamedArgument,
  ARGUMENT_TYPE,
} from "../../../../scripts/slash-commands/SlashCommandArgument.js";
import {
  SlashCommandEnumValue,
  enumTypes,
} from "../../../../scripts/slash-commands/SlashCommandEnumValue.js";
import {
  enumIcons,
  commonEnumProviders,
} from "../../../../scripts/slash-commands/SlashCommandCommonEnumsProvider.js";

import { POPUP_TYPE, callGenericPopup } from "../../../../scripts/popup.js";

import { isMobile } from '../../../../scripts/RossAscends-mods.js';

const extensionName = "JS-Slash-Runner";
const extensionFolderPath = `third-party/${extensionName}`;

const audioCache = {};

let list_BGMS = null;
let list_ambients = null;
let bgmEnded = true;
let ambientEnded = true;
let cooldownBGM = 0;

const events = [
  event_types.CHARACTER_MESSAGE_RENDERED,
  event_types.USER_MESSAGE_RENDERED,
  event_types.CHAT_CHANGED,
  event_types.MESSAGE_SWIPED,
  event_types.MESSAGE_UPDATED,
];

const defaultSettings = {
  activate_setting: false,
  audio_setting: false,
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

async function renderMessagesInIframes() {
  if (!$('#activate_setting').prop('checked')) {
    return;
  }

  const chatContainer = document.getElementById("chat");

  const messages = chatContainer.querySelectorAll(".mes");
  const context = getContext();
  const totalMessages = context.chat.length;
  const processDepth = parseInt($("#process_depth").val(), 10);
  const messagesToProcess =
    processDepth > 0 ? [...messages].slice(-processDepth) : messages;
  const messagesToCancel = totalMessages - processDepth;
  for (let i = 0; i < messagesToCancel; i++) {
    const message = context.chat[i];
    const messageId = i;
    const iframes = document.querySelectorAll(
      `[id^="message-iframe-${messageId}-"]`
    );

    if (iframes.length > 0) {
      iframes.forEach((iframe) => {
        iframe.remove();
      });
      updateMessageBlock(messageId, message);
    }
  }
  const fragment = document.createDocumentFragment();
  messagesToProcess.forEach((message) => {
    const messageId = message.getAttribute("mesid");
    const mesTextContainer = message.querySelector(".mes_text");

    if (!mesTextContainer) {
      console.warn(`未找到 mes_text 容器，跳过消息 mesid: ${messageId}`);
      return;
    }

    const codeElements = mesTextContainer.querySelectorAll("code[class]");
    if (!codeElements.length) {
      return;
    }

    codeElements.forEach((codeElement, index) => {
      const existingIframe = document.getElementById(
        `message-iframe-${messageId}-${index}`
      );
      if (existingIframe || codeElement.dataset.processed) {
        return;
      }

      codeElement.dataset.processed = "true";
      const extractedText = extractTextFromCode(codeElement);

      const iframe = document.createElement("iframe");
      iframe.id = `message-iframe-${messageId}-${index}`;
      iframe.style.width = "100%";
      iframe.style.border = "none";

      const iframeContent = `
            <html>
                <head>
                    <style>
                        html, body {
                            margin: 0;
                            padding: 0;
                            overflow: hidden;
                        }
                    </style>
                </head>
                <body>
                    ${extractedText}
                    <script>
                        window.addEventListener('load', function() {
                            window.parent.postMessage('loaded', '*');
                        });
                    </script>
                    <script>
                    function triggerSlash(commandText) {
                      window.parent.postMessage({ request: 'command', commandText: commandText }, '*');
                      console.log('Sent command to parent:', commandText);
                    }
                    function requestVariables() {
                      return new Promise((resolve, reject) => {
                        function handleMessage(event) {
                          if (event.data && event.data.variables) {
                            window.removeEventListener('message', handleMessage);
                            resolve(event.data.variables);
                          }
                        }
                        window.addEventListener('message', handleMessage);
                        window.parent.postMessage({ request: 'getVariables' }, '*');
                      });
                    }
                    async function getVariables() {
                        const variables = await requestVariables();
                        return variables;
                    }
                    function setVariables(newVariables) {
                      if (typeof newVariables === 'object' && newVariables !== null) {
                        window.parent.postMessage({ request: 'setVariables', data: newVariables }, '*');
                      } else {
                        console.error("setVariables expects an object");
                      }
                    }
                    </script>
                </body>
            </html>
        `;

      iframe.onload = function () {
        const doc = iframe.contentDocument || iframe.contentWindow.document;
        doc.open();
        doc.write(iframeContent);
        doc.close();
        adjustIframeHeight(iframe);
        setTimeout(() => {
          adjustIframeHeight(iframe);
        }, 300);

        observeIframeContent(iframe);
      };

      fragment.appendChild(iframe);
      codeElement.replaceWith(fragment);
    });
  });
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

function adjustIframeHeight(iframe) {
  if (iframe.contentWindow.document.body) {
    const height = iframe.contentWindow.document.documentElement.scrollHeight;
    iframe.style.height = height + "px";
  }
}

function observeIframeContent(iframe) {
  const doc = iframe.contentWindow.document.body;

  const resizeObserver = new ResizeObserver(() => {
    adjustIframeHeight(iframe);
  });

  resizeObserver.observe(doc);
}

async function handleIframeCommand(event) {
  if (event.data) {
    if (event.data.request === "command") {
      const commandText = event.data.commandText;
      executeCommand(commandText);
    } else if (event.data.request === "getVariables") {
      if (!chat_metadata.variables) {
        chat_metadata.variables = {};
      }
      const variables = chat_metadata?.variables || {};

      event.source.postMessage({ variables: variables }, "*");
    } else if (event.data.request === "setVariables") {
      const newVariables = event.data.data;

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
  }
}

async function executeCommand(command) {
  const context = getContext();
  try {
    const executePromise = context.executeSlashCommandsWithOptions(
      command,
      true,
      null,
      false,
      null,
      null,
      null
    );
    await executePromise;
  } catch (error) {
    console.error("Error executing slash command:", error);
  }
}

async function onExtensionToggle() {
  const isEnabled = Boolean($("#activate_setting").prop("checked"));
  extension_settings[extensionName].activate_setting = isEnabled;

  const context = getContext();
  if (isEnabled) {
    events.forEach((eventType) => {
      eventSource.on(eventType, () => {
        setTimeout(() => {
          renderMessagesInIframes();
        }, 100);
      });
    });
    renderMessagesInIframes();
    window.addEventListener("message", handleIframeCommand);
  } else {
    events.forEach((eventType) => {
      eventSource.removeListener(eventType, renderMessagesInIframes);
    });
    window.removeEventListener("message", handleIframeCommand);
    context.reloadCurrentChat();
  }

  saveSettingsDebounced();
}

async function onDepthInput() {
  const processDepth = parseInt($("#process_depth").val(), 10);
  extension_settings[extensionName].process_depth = processDepth;
  renderMessagesInIframes();
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
      bgmUrlValue = JSON.parse(bgmUrlValue);
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
      ambientUrlValue = JSON.parse(ambientUrlValue);
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

  try {
    await audioElement.play();
    playPauseIcon.removeClass("fa-play");
    playPauseIcon.addClass("fa-pause");
  } catch (error) {
    console.error(`Failed to play ${type} audio:`, error);
  }
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

async function handleUrlImportClick(type) {
  if (!chat_metadata.variables) {
    chat_metadata.variables = {};
  }

  const existingUrls = chat_metadata.variables[type]
    ? JSON.parse(chat_metadata.variables[type])
    : [];

  const newUrls = await openUrlImportPopup();

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
  const html = await renderExtensionTemplateAsync(
    `${extensionFolderPath}`,
    "importurl"
  );

  const input = await callGenericPopup(html, POPUP_TYPE.INPUT, "");

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

async function refreshAudioResources() {
  list_BGMS = await getBgmUrl();
  list_ambients = await getAmbientUrl();

  updateBGMSelect();

  updateAmbientSelect();
}

function updateBGMSelect() {
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

  if (audio.src === audio_url && !bgmEnded) {
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
  if (audio.src === audio_url && !ambientEnded) {
    return;
  }

  ambientEnded = false;
  if (audioCache[audio_url]) {
    audio.src = audioCache[audio_url];
    audio.play();
  } else {
    audio.src = audio_url;
    audio.play();
    audioCache[audio_url] = audio_url;
  }

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

  $("#activate_setting").on("click", onExtensionToggle);
  if ($("#activate_setting").prop("checked")) {
    onExtensionToggle();
  }

  $("#process_depth").on("input", onDepthInput);

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

  $("#bgm_import_button").on("click", async () => {
    await handleUrlImportClick("bgmurl");
    await refreshAudioResources();
  });

  $("#ambient_import_button").on("click", async () => {
    await handleUrlImportClick("ambienturl");
    await refreshAudioResources();
  });

  $("#audio_refresh_assets").on("click", async () => {
    await refreshAudioResources();
  });

  $("#bgm_import_button").on("click", () => {
    handleUrlImportClick("bgmurl");
  });

  $("#ambient_import_button").on("click", async function () {
    await handleUrlImportClick("ambienturl");
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
});

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
  if (!args?.type || !args?.action) {
    console.warn("WARN: Missing arguments for /audioplaypause command");
    return "";
  }

  const type = args.type.toLowerCase();
  const play = args.action.toLowerCase();

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
  const existingUrls = chat_metadata.variables[typeKey]
    ? JSON.parse(chat_metadata.variables[typeKey])
    : [];

  const mergedUrls = [...new Set([...urlArray, ...existingUrls])];

  chat_metadata.variables[typeKey] = JSON.stringify(mergedUrls);
  saveMetadataDebounced();

  if (type === "bgm") {
    list_BGMS = mergedUrls;
    updateBGMSelect();
  } else if (type === "ambient") {
    list_ambients = mergedUrls;
    updateAmbientSelect();
  }

  if (args.play && urlArray[0]) {
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

  const existingUrls = chat_metadata.variables[typeKey]
    ? JSON.parse(chat_metadata.variables[typeKey])
    : [];

  const mergedUrls = [...new Set([url, ...existingUrls])];

  chat_metadata.variables[typeKey] = JSON.stringify(mergedUrls);
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
