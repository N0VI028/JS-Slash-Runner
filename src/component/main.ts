import { registerAllMacros, unregisterAllMacros } from '@/component/macro';
import { destroyMacroOnExtension, initializeMacroOnExtension, renderAllMacros } from '@/component/macrolike';
import {
  addCodeToggleButtonsToAllMessages,
  addRenderingHideStyleSettings,
  removeRenderingHideStyleSettings,
} from '@/component/message_iframe/render_hide_style';
import {
  partialRenderEvents,
  renderAllIframes,
  renderMessageAfterDelete,
  renderPartialIframes,
  tampermonkey_script,
  viewport_adjust_script,
} from '@/component/message_iframe/render_message';
import {
  addRenderingOptimizeSettings,
  removeRenderingOptimizeSettings,
} from '@/component/message_iframe/render_optimize';
import { destroyCharacterLevelOnExtension, initializeCharacterLevelOnExtension } from '@/component/script_iframe';
import {
  buildScriptRepositoryOnExtension,
  destroyScriptRepositoryOnExtension,
} from '@/component/script_repository/index';
import { initializeToastr } from '@/component/toastr';
import { iframe_client } from '@/iframe_client/index';
import { handleIframe } from '@/iframe_server/index';
import { checkVariablesEvents, clearTempVariables, shouldUpdateVariables } from '@/iframe_server/variables';
import { script_url } from '@/script_url';
import { getSettingValue, saveSettingValue } from '@/util/extension_variables';
import { eventSource, event_types, reloadCurrentChat, saveSettingsDebounced, this_chid } from '@sillytavern/script';

const handleChatLoaded = async () => {
  await renderAllIframes();
  addCodeToggleButtonsToAllMessages();
};

const handleChatChanged = async () => {
  renderAllMacros();
};

const handlePartialRender = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  renderPartialIframes(mesIdNumber);
};

const handleMessageDeleted = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  clearTempVariables();
  renderMessageAfterDelete(mesIdNumber);
  if (getSettingValue('render.render_hide_style')) {
    addCodeToggleButtonsToAllMessages();
  }
};

const handleVariableUpdated = (mesId: string) => {
  const mesIdNumber = parseInt(mesId, 10);
  shouldUpdateVariables(mesIdNumber);
};

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
    saveSettingValue('enabled_extension', enable);
  }
  if (enable) {
    // 指示器样式
    $('#extension-status-icon').css('color', 'green').next().text('扩展已启用');

    script_url.set('iframe_client', iframe_client);
    script_url.set('viewport_adjust_script', viewport_adjust_script);
    script_url.set('tampermonkey_script', tampermonkey_script);

    registerAllMacros();
    initializeToastr();
    initializeMacroOnExtension();
    initializeCharacterLevelOnExtension();
    buildScriptRepositoryOnExtension();

    // 重新注入前端卡优化的样式和设置
    if (userAction && getSettingValue('render.rendering_optimize')) {
      addRenderingOptimizeSettings();
    }
    if (userAction && getSettingValue('render.render_hide_style')) {
      addRenderingHideStyleSettings();
    }

    window.addEventListener('message', handleIframe);

    eventSource.on(event_types.CHAT_CHANGED, handleChatChanged);
    eventSource.on('chatLoaded', handleChatLoaded);

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

    script_url.delete('iframe_client');
    script_url.delete('viewport_adjust_script');
    script_url.delete('tampermonkey_script');

    unregisterAllMacros();
    destroyMacroOnExtension();
    destroyCharacterLevelOnExtension();
    destroyScriptRepositoryOnExtension();

    if (getSettingValue('render.rendering_optimize')) {
      removeRenderingOptimizeSettings();
    }

    if (getSettingValue('render.render_hide_style')) {
      removeRenderingHideStyleSettings();
    }

    window.removeEventListener('message', handleIframe);

    eventSource.removeListener(event_types.CHAT_CHANGED, handleChatChanged);
    eventSource.removeListener('chatLoaded', handleChatLoaded);
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
  saveSettingsDebounced();
}
