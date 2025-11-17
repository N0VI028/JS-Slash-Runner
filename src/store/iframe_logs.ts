export type LogLevel = 'debug' | 'info' | 'warn' | 'error';


export type Log = {
  level: LogLevel;
  message: string;
  timestamp: number;
};

type IframeLogs = {
  [iframe_id: string]: Log[];
};

export const useIframeLogsStore = defineStore('iframe_logs', () => {
  const iframe_logs = ref<IframeLogs>({});
  const init = (iframe_id: string) => {
    if (!_.isArray(_.get(iframe_logs.value, iframe_id))) {
      _.set(iframe_logs.value, iframe_id, []);
    }
  }
  const log = (iframe_id: string, level: LogLevel | 'log', ...args: any[]) => {
    if (!_.isArray(_.get(iframe_logs.value, iframe_id))) {
      _.set(iframe_logs.value, iframe_id, []);
    }
    // TODO: 尽量模拟 console.info 的字符串结果
    iframe_logs.value[iframe_id].push({
      level: level === 'log' ? 'info' : level,
      message: args.map(String).join(''),
      timestamp: Date.now(),
    });
  };
  const clear = (iframe_id: string) => {
    _.unset(iframe_logs.value, iframe_id);
  };
  const clearAll = () => {
    iframe_logs.value = {};
  };
  return { iframe_logs, init, log, clear, clearAll };
});
