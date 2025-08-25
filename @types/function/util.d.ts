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
declare function substitudeMacros(text: string): string;

/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
declare function getLastMessageId(): number;

/**
 * 包装 `fn` 函数，返回一个会将报错消息通过酒馆通知显示出来的同功能函数
 *
 * @param fn 要包装的函数
 * @returns 包装后的函数
 *
 * @example
 * // 包装 `test` 函数从而在酒馆通知中显示 'test' 文本
 *  function test() {
 *   throw Error(`test`);
 * }
 * errorCatched(test)();
 */
declare function errorCatched<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U;

/**
 * 从消息楼层 iframe 的 `iframe_name` 获取它所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @param iframe_name 消息楼层 iframe 的名称
 * @returns 楼层 id
 */
declare function getMessageId(iframe_name: string): number;
