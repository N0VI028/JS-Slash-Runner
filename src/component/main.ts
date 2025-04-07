import {
  destroyCharacterLevelOnExtension,
  initializeCharacterLevelOnExtension,
} from '@/component/character_level/index';
import {
  destroyMacroOnExtension,
  initializeMacroOnExtension,
  registerAllMacros,
  unregisterAllMacros,
} from '@/component/macro';
import {
  addCodeToggleButtonsToAllMessages,
  addRenderingOptimizeSettings,
  partialRenderEvents,
  removeRenderingOptimizeSettings,
  renderAllIframes,
  renderMessageAfterDelete,
  renderPartialIframes,
  tampermonkey_script,
  viewport_adjust_script,
} from '@/component/message_iframe';
import {
  ScriptRepository,
  ScriptType,
  clearAllScriptsIframe,
  purgeEmbeddedScripts,
} from '@/component/script_repository/index';
import { iframe_client } from '@/iframe_client/index';
import { handleIframe } from '@/iframe_server/index';
import { checkVariablesEvents, clearTempVariables, shouldUpdateVariables } from '@/iframe_server/variables';
import { script_url } from '@/script_url';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';

import { eventSource, event_types, reloadCurrentChat, saveSettingsDebounced, this_chid } from '@sillytavern/script';

export let scriptRepo: ScriptRepository;

let qrBarObserver: MutationObserver | null = null;

const handleChatChanged = async () => {
  await scriptRepo.checkEmbeddedScripts();

  await clearAllScriptsIframe();
  scriptRepo.removeButtonsByType(ScriptType.GLOBAL);
  scriptRepo.removeButtonsByType(ScriptType.CHARACTER);

  await scriptRepo.loadScriptLibrary();
  await scriptRepo.runScriptsByType(ScriptType.GLOBAL);
  await scriptRepo.runScriptsByType(ScriptType.CHARACTER);

  await renderAllIframes();
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handleCharacterDeleted = (character: Object) => {
  purgeEmbeddedScripts({ character });
};

const handlePartialRender = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  renderPartialIframes(mesIdNumber);
};

const handleMessageDeleted = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  clearTempVariables();
  renderMessageAfterDelete(mesIdNumber);
  if (getSettingValue('render.rendering_optimize')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handleVariableUpdated = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  shouldUpdateVariables(mesIdNumber);
};

/**
 * 监听#qr--bar的元素创建且发出事件
 */
function MutationObserverQrBarCreated() {
  const $qrBar = $('#qr--bar');
  if ($qrBar.length > 0) {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node instanceof Element && node.id === 'qr--bar') {
              setTimeout(() => {
                const $THbar = $(`<div class="qr--buttons qr--color" id="TH-script-buttons"></div>`);
                $('#qr--bar').append($THbar);
                scriptRepo.addButtonsByType(ScriptType.GLOBAL);
                scriptRepo.addButtonsByType(ScriptType.CHARACTER);
              }, 1000);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }
}

/**
 * 取消监听#qr--bar
 */
function removeMutationObserverQrBarCreated() {
  if (qrBarObserver) {
    qrBarObserver.disconnect();
    qrBarObserver = null;
  }
}

/**
 * 初始化扩展主设置界面
 */
export function initExtensionMainPanel() {
  const isEnabled = getSettingValue('enabled_extension');
  if (isEnabled) {
    handleExtensionToggle(false, true);
  }
  $('#extension-enable-toggle')
    .prop('checked', isEnabled)
    .on('change', function (event: JQuery.ChangeEvent) {
      handleExtensionToggle(true, $(event.currentTarget).prop('checked'));
    });
}

async function handleExtensionToggle(userAction: boolean = true, enable: boolean = true) {
  if (userAction) {
    await saveSettingValue('enabled_extension', enable);
  }
  if (enable) {
    // 指示器样式
    $('#extension-status-icon').css('color', 'green').next().text('扩展已启用');
    MutationObserverQrBarCreated();
    scriptRepo = ScriptRepository.getInstance();

    script_url.set('iframe_client', iframe_client);
    script_url.set('viewport_adjust_script', viewport_adjust_script);
    script_url.set('tampermonkey_script', tampermonkey_script);

    registerAllMacros();
    initializeMacroOnExtension();
    initializeCharacterLevelOnExtension();

    // 重新注入前端卡优化的样式和设置
    if (userAction && getSettingValue('render.rendering_optimize')) {
      addRenderingOptimizeSettings();
    }

    window.addEventListener('message', handleIframe);

    eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);
    eventSource.on(event_types.CHARACTER_DELETED, handleCharacterDeleted);

    partialRenderEvents.forEach(eventType => {
      eventSource.on(eventType, handlePartialRender);
    });

    checkVariablesEvents.forEach(eventType => {
      eventSource.on(eventType, handleVariableUpdated);
    });
    eventSource.on(event_types.MESSAGE_DELETED, handleMessageDeleted);
    if (userAction && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  } else {
    // 指示器样式
    $('#extension-status-icon').css('color', 'red').next().text('扩展已禁用');

    removeMutationObserverQrBarCreated();
    ScriptRepository.destroyInstance();

    script_url.delete('iframe_client');
    script_url.delete('viewport_adjust_script');
    script_url.delete('tampermonkey_script');

    unregisterAllMacros();
    destroyMacroOnExtension();
    destroyCharacterLevelOnExtension();

    if (getSettingValue('render.rendering_optimize')) {
      removeRenderingOptimizeSettings();
    }

    window.removeEventListener('message', handleIframe);

    eventSource.removeListener(event_types.CHAT_CHANGED, handleChatChanged);
    eventSource.removeListener(event_types.CHARACTER_DELETED, handleCharacterDeleted);

    partialRenderEvents.forEach(eventType => {
      eventSource.removeListener(eventType, handlePartialRender);
    });
    checkVariablesEvents.forEach(eventType => {
      eventSource.removeListener(eventType, handleVariableUpdated);
    });
    eventSource.removeListener(event_types.MESSAGE_DELETED, handleMessageDeleted);
    if (userAction && this_chid !== undefined) {
      await reloadCurrentChat();
    }
  }
  $('#js_slash_runner_text').text(getSettingValue('activate_setting') ? '关闭前端渲染' : '开启前端渲染');
  saveSettingsDebounced();
}
