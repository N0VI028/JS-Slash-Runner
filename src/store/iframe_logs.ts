export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type Log = {
  level: LogLevel;
  message: string;
  timestamp: number;
};

export const useIframeLogsStore = defineStore('iframe_logs', () => {
  const iframe_logs = ref<Map<string, Log[]>>(new Map());
  const init = (iframe_id: string) => {
    iframe_logs.value.set(iframe_id, []);
  };
  const log = (iframe_id: string, level: LogLevel | 'log', ...args: any[]) => {
    if (!iframe_logs.value.has(iframe_id)) {
      iframe_logs.value.set(iframe_id, []);
    }
    // TODO: 尽量模拟 console.info 的字符串结果
    iframe_logs.value.get(iframe_id)?.push({
      level: level === 'log' ? 'info' : level,
      message: args.map(String).join(''),
      timestamp: Date.now(),
    });
  };
  const clear = (iframe_id: string) => {
    iframe_logs.value.delete(iframe_id);
  };
  return { iframe_logs, init, log, clear };
});
