import { substituteParamsExtended } from '@sillytavern/script';
import isPromise from 'is-promise';

export function _reloadIframe(this: Window): void {
  this.location.reload();
}

export function substitudeMacros(text: string): string {
  return substituteParamsExtended(text);
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
      if (isPromise(result)) {
        return result.then(undefined, error => {
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
  const iframe_name = _getIframeName.call(this);
  if (!iframe_name.startsWith('TH-script--')) {
    throw new Error('你只能在脚本 iframe 内获取 getScriptId!');
  }
  return iframe_name.replace(/TH-script--.+--/, '');
}

export function _getCurrentMessageId(this: Window): number {
  return getMessageId(_getIframeName.call(this));
}

export function getMessageId(iframe_name: string): number {
  const match = iframe_name.match(/^TH-message--(\d+)--\d+$/);
  if (!match) {
    throw Error(`获取 ${iframe_name} 所在楼层 id 时出错: 不要对全局脚本 iframe 调用 getMessageId!`);
  }
  return parseInt(match[1].toString());
}
