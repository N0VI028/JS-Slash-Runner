import { substituteParamsExtended } from '@sillytavern/script';
import isPromise from 'is-promise';
import { ZodError } from 'zod';

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
    toastr.error(
      `<pre style="white-space: pre-wrap">${error.stack ? (error instanceof ZodError ? [error.message, error.stack].join('\n') : error.stack) : error.message}</pre>`,
      error.name,
      {
        escapeHtml: false,
        toastClass: 'toastr w-fit! min-w-[300px]',
      },
    );
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
export function _errorCatched<T extends any[], U>(this: Window, fn: (...args: T) => U): (...args: T) => U {
  const onError = (error: Error) => {
    const message = error.stack
      ? error instanceof ZodError
        ? [error.message, error.stack].join('\n')
        : error.stack
      : error.message;
    toastr.error(`<pre style="white-space: pre-wrap">${message}</pre>`, error.name, {
      escapeHtml: false,
      toastClass: 'toastr w-fit! min-w-[300px]',
    });
    // @ts-expect-error _th_impl 是存在的
    this._th_impl._log(_getIframeName.call(this), 'error', message);
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
  const frameElement = this.frameElement as Element | null;
  const cachedId = (this as typeof window & { __TH_IFRAME_ID?: string }).__TH_IFRAME_ID || this.name;

  if (frameElement?.id) {
    // Persist id so we can still resolve it after the iframe is removed (Firefox srcdoc teardown).
    (this as typeof window & { __TH_IFRAME_ID?: string }).__TH_IFRAME_ID = frameElement.id;
    if (!this.name) {
      this.name = frameElement.id;
    }
    return frameElement.id;
  }

  if (cachedId) {
    if (!this.name) {
      this.name = cachedId;
    }
    return cachedId;
  }

  throw new TypeError('frameElement is null while resolving iframe id');
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
