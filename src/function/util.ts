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
