import { ScriptType } from '@/component/script_repository/index';
import { ScriptManager } from '@/component/script_repository/script_controller';
import {
  extensionFolderPath,
  getOrSaveSettingValue,
  getSettingValue,
  saveSettingValue,
} from '@/util/extension_variables';

import { characters, reloadCurrentChat, saveChatConditional, this_chid } from '@sillytavern/script';
import { renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';

import log from 'loglevel';
import { io } from 'socket.io-client';

const templatePath = `${extensionFolderPath}/src/component/listener`;
const default_settings = {
  enabled: false,
  url: 'http://localhost:6621',
  duration: 1000,
  enable_echo: true,
} as const;

let socket: ReturnType<typeof io>;

let refresh_iframe_debounced: _.DebouncedFunc<() => Promise<void>>;
function reset_refresh_duration() {
  refresh_iframe_debounced = _.debounce(refresh_iframe, getSettingValue('listener.duration'));
}
async function refresh_iframe(): Promise<void> {
  log.info(`[Listener] 已将 iframe 刷新为最新版本`);

  // @ts-expect-error
  const character = characters[this_chid];
  if (character) {
    await saveChatConditional();
  }

  const scriptManager = ScriptManager.getInstance();
  const globalScripts = scriptManager.getGlobalScripts();

  await scriptManager.stopScriptsByType(globalScripts, ScriptType.GLOBAL);
  await scriptManager.runScriptsByType(globalScripts, ScriptType.GLOBAL);
  await reloadCurrentChat();
}

function toggle_status(should_enable: boolean) {
  if (should_enable) {
    $('#online_status_indicator').addClass('success');
  } else {
    $('#online_status_indicator').removeClass('success');
  }
}

function connect_socket(url: string): void {
  if (socket) {
    toggle_status(false);
    socket.close();
  }
  if (!getSettingValue('listener.enabled') || !getSettingValue('listener.url')) {
    return;
  }

  socket = io(url);

  socket.on('connect_error', (error: Error) => {
    toggle_status(false);
    if (socket.active) {
      if (getSettingValue('listener.enable_echo')) {
        toastr.error(`连接酒馆助手实时监听功能出错, 尝试重连...\n${error.name}: ${error.message}`);
      }
      log.error(`${error.name}: ${error.message}${error.stack ?? ''}`);
    } else {
      if (getSettingValue('listener.enable_echo')) {
        toastr.error(`连接酒馆助手实时监听功能出错, 请手动连接重试!\n${error.name}: ${error.message}`);
      }
      log.error(`${error.name}: ${error.message}${error.stack ?? ''}`);
    }
  });

  socket.on('connect', () => {
    toggle_status(true);
    log.info('[Listener] 成功连接至服务器');
  });

  socket.on('iframe_updated', () => {
    refresh_iframe_debounced();
  });

  socket.on('disconnect', (reason, details) => {
    if (getSettingValue('listener.enable_echo')) {
      toastr.warning(`酒馆助手实时监听器断开连接: ${reason}`);
    }
    toggle_status(false);
    log.info(`[Listener] 与服务器断开连接: ${reason}\n${details}`);
  });
}

/**
 * 初始化实时监听
 */
export async function initListener() {
  const $listener_container = $(await renderExtensionTemplateAsync(`${templatePath}`, 'index'));

  $listener_container
    .find('#iframe_update_listener_enabled')
    .prop('checked', await getOrSaveSettingValue('listener.enabled', default_settings.enabled))
    .on('click', async function (this: HTMLInputElement) {
      saveSettingValue('listener.enabled', $(this).prop('checked'));
      connect_socket(getSettingValue('listener.url'));
    });

  $listener_container
    .find('#iframe_update_listener_enable_echo')
    .prop('checked', await getOrSaveSettingValue('listener.enable_echo', default_settings.enable_echo))
    .on('click', function (this: HTMLInputElement) {
      saveSettingValue('listener.enable_echo', $(this).prop('checked'));
    });

  $listener_container
    .find('#iframe_update_listener_url')
    .val(await getOrSaveSettingValue('listener.url', default_settings.url))
    .on('input', async function (this: HTMLInputElement) {
      const url = saveSettingValue('listener.url', String($(this).val()));
      connect_socket(url);
    });

  $listener_container
    .find('#iframe_update_listener_duration')
    .val(await getOrSaveSettingValue('listener.duration', default_settings.duration))
    .on('input', async function (this: HTMLInputElement) {
      saveSettingValue('listener.duration', Number($(this).val()));
      reset_refresh_duration();
    });

  $('#extension-listener').append($listener_container);

  reset_refresh_duration();
  connect_socket(getSettingValue('listener.url'));
}
