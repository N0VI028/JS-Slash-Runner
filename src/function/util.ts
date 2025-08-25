import { substituteParamsExtended } from '@sillytavern/script';

import log from 'loglevel';

export function substitudeMacros(text: string): string {
  const text_demacroed = substituteParamsExtended(text);

  log.info(`替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
  return text_demacroed;
}

export function getLastMessageId(): number {
  return Number(substitudeMacros('{{lastMessageId}}'));
}

export function errorCatched<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U {
  const onError = (error: Error) => {
    toastr.error(`${error.stack ? error.stack : error.name + ': ' + error.message}`);
    throw error;
  };
  return (...args: T): U => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        return result.catch(error => {
          onError(error);
        }) as U;
      }
      return result;
    } catch (error) {
      return onError(error as Error);
    }
  };
}

export function _getIframeName(this: Window): string {
  return (this.frameElement as Element).id;
}

export function _getScriptId(this: Window): string {
  const script_id = $(this.frameElement as Element).attr('script-id');
  if (!script_id) {
    throw new Error('你只能在脚本 iframe 内获取 getScriptId!');
  }
  return script_id;
}

export function _getCurrentMessageId(this: Window): number {
  return getMessageId(_getIframeName.call(this));
}

export function getMessageId(iframe_name: string): number {
  const match = iframe_name.match(/^message-iframe-(\d+)-\d+$/);
  if (!match) {
    throw Error(`获取 ${iframe_name} 所在楼层 id 时出错: 不要对全局脚本 iframe 调用 getMessageId!`);
  }
  return parseInt(match[1].toString());
}
