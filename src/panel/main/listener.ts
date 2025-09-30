import { useMessageIframeRuntimesStore, useScriptIframeRuntimesStore } from '@/store/iframe_runtimes';
import { io, Socket } from 'socket.io-client';

let socket: Socket | null;
export function useListener(
  enabled: Readonly<Ref<boolean>>,
  enabled_echo: Readonly<Ref<boolean>>,
  url: Readonly<Ref<string>>,
  duration: Readonly<Ref<number>>,
) {
  const refreshMessageDebounced = useDebounceFn(() => {
    useMessageIframeRuntimesStore().reloadAll();
  }, duration);
  const refreshScriptDebounced = useDebounceFn(() => {
    useScriptIframeRuntimesStore().reloadAll();
  }, duration);
  const refreshAllDebounced = () => {
    refreshMessageDebounced();
    refreshScriptDebounced();
  };

  watchEffect(() => {
    if (socket) {
      socket.close();
      socket = null;
    }

    if (!enabled.value) {
      return;
    }

    socket = io(url.value, {
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.info('[Listener] 成功连接至服务器');
    });

    socket.on('connect_error', (error: Error) => {
      if (enabled_echo.value) {
        toastr.error(`连接酒馆助手实时监听功能出错, 尝试重连...\n${error.name}: ${error.message}`);
      }
      console.error(`${error.name}: ${error.message}${error.stack ?? ''}`);
    });
    socket.on('disconnect', (reason, details) => {
      if (enabled_echo.value) {
        toastr.warning(`酒馆助手实时监听器断开连接: ${reason}`);
      }
      console.info(`[Listener] 与服务器断开连接: ${reason}\n${details}`);
    });

    socket.on('iframe_updated', () => refreshAllDebounced());
    socket.on('script_iframe_updated', () => refreshScriptDebounced());
    socket.on('message_iframe_updated', () => refreshMessageDebounced());

    return result;
  });
}
