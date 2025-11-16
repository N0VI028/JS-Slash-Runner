type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type Log = {
  level: LogLevel;
  message: string;
};

type IframeLogs = {
  [iframe_id: string]: Log[];
};

export const useIframeLogsStore = defineStore('iframe_logs', () => {
  const iframe_logs = ref<IframeLogs>({});
  const init = (iframe_id: string) => {
    if (!_.has(iframe_logs.value, iframe_id)) {
      _.set(iframe_logs.value, iframe_id, []);
    }
  }
  const log = (iframe_id: string, level: LogLevel, ...args: any[]) => {
    if (!_.has(iframe_logs.value, iframe_id)) {
      _.set(iframe_logs.value, iframe_id, []);
    }
    // TODO: 尽量模拟 console.info 的字符串结果
    iframe_logs.value[iframe_id].push({ level, message: args.map(String).join('') });
  };
  const clear = (iframe_id: string) => {
    _.unset(iframe_logs.value, iframe_id);
  };
  return { iframe_logs, init, log, clear };
});
