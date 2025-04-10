import { substituteParamsExtended } from '@sillytavern/script';
import { triggerSlash } from '@/function/slash';

/**
 * 替换字符串中的酒馆宏
 *
 * @param text 要替换的字符串
 * @returns 替换结果
 *
 * @example
 * const text = substitudeMacros("{{char}} speaks in {{lastMessageId}}");
 * text == "少女歌剧 speaks in 5";
 */
export async function substitudeMacros(text: string): Promise<string> {
  // QUESTION: 像这样额外编写一个 request, 还是直接用 `await triggerSlashWithResult('/pass "{{char}} speaks in {{lastMessageId}}"')`?
  const text_demacroed = substituteParamsExtended(text);

  console.info(`替换字符串中的宏, 字符串: '${text}', 结果: '${text_demacroed}'`);
  return text_demacroed;
}

/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
export async function getLastMessageId(): Promise<number> {
  const result = await substitudeMacros('{{lastMessageId}}');
  if (result === '') {
    throw Error('[Util][getLastMessageId] 未找到任何消息楼层');
  }
  return parseInt(result);
}

/**
 * 包装 `fn` 函数，返回一个会将报错消息通过酒馆通知显示出来的同功能函数
 *
 * @param fn 要包装的函数
 * @returns 包装后的函数
 *
 * @example
 * // 包装 `test` 函数从而在酒馆通知中显示 'test' 文本
 * async function test() {
 *   throw Error(`test`);
 * }
 * errorCatched(test)();
 */
export function errorCatched<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U {
  const onError = (error: Error) => {
    triggerSlash(
      `/echo severity=error ${error.stack ? error.stack : error.name + ': ' + error.message}`,
    );
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
