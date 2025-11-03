/**
 * 获取消息楼层号对应的消息内容 JQuery 实例
 *
 * 相比于一个实用函数, 这更像是一个告诉你可以用 JQuery 的示例
 *
 * @param message_id 要获取的消息楼层号, 必须要酒馆页面显示了该消息楼层才能获取到
 * @returns 如果能获取到该消息楼层的 html, 则返回对应的 JQuery; 否则返回空 JQuery
 *
 * @example
 * // 获取第 0 楼的消息内容文本
 * const text = retrieveDisplayedMessage(0).text();
 *
 * @example
 * // 修改第 0 楼的消息内容文本
 * // - 这样的修改只会影响本次显示, 不会保存到消息文件中, 因此重新加载消息或刷新网页等操作后就会回到原样;
 * // - 如果需要实际修改消息文件, 请使用 `setChatMessage`
 * retrieveDisplayedMessage(0).text("new text");
 * retrieveDisplayedMessage(0).append("<pre>new text</pre>");
 * retrieveDisplayedMessage(0).append(formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}"));
 */
declare function retrieveDisplayedMessage(message_id: number): JQuery<HTMLDivElement>;

type FormatAsDisplayedMessageOption = {
  /** 消息所在的楼层, 要求该楼层已经存在, 即在 `[0, getLastMessageId()]` 范围内; 默认为 'last' */
  message_id?: 'last' | 'last_user' | 'last_char' | number;
};

/**
 * 将字符串处理为酒馆用于显示的 html 格式. 将会,
 * 1. 替换字符串中的酒馆宏
 * 2. 对字符串应用对应的酒馆正则
 * 3. 将字符串调整为 html 格式
 *
 * @param text 要处理的字符串
 * @param option 可选选项
 *   - `message_id?:number`: 消息所在的楼层, 要求该楼层已经存在, 即在 `[0, getLastMessageId()]` 范围内; 默认为最新楼层
 *
 * @returns 处理结果
 *
 * @throws 如果提供的消息楼层号 `message_id` 不在 `[0, getLastMessageId()]` 范围内, 将会抛出错误
 *
 * @example
 * const text = formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}");
 * => "<p>少女歌剧 speaks in 5</p>";
 */
declare function formatAsDisplayedMessage(text: string, { message_id }?: FormatAsDisplayedMessageOption): string;
