import { chat, messageFormatting } from '@sillytavern/script';
import { getLastMessageId } from '@sillytavern/scripts/macros';

interface FormatAsDisplayedMessageOption {
  message_id?: 'last' | 'last_user' | 'last_char' | number;  // 消息所在的楼层, 要求该楼层已经存在, 即在 `[0, await getLastMessageId()]` 范围内; 默认为 'last'
};

/**
 * 将字符串处理为酒馆用于显示的 html 格式. 将会,
 * 1. 替换字符串中的酒馆宏
 * 2. 对字符串应用对应的酒馆正则
 * 3. 将字符串调整为 html 格式
 *
 * @param text 要处理的字符串
 * @param option 可选选项
 *   - `message_id?:number`: 消息所在的楼层, 要求该楼层已经存在, 即在 `[0, await getLastMessageId()]` 范围内; 默认为最新楼层
 *
 * @returns 处理结果
 */
export function formatAsDisplayedMessage(text: string, option: FormatAsDisplayedMessageOption = { message_id: 'last' }): string {
  let { message_id = 'last' } = option;
  if (typeof message_id !== 'number' && !['last', 'last_user', 'last_char'].includes(message_id)) {
    throw Error(
      `提供的 message_id 无效, 请提供 'last', 'last_user', 'last_char' 或楼层消息号, 你提供的是: ${message_id}`,
    );
  }
  const last_message_id = getLastMessageId();
  if (last_message_id === null) {
    throw Error(`未找到任何消息楼层, 你提供的是: ${message_id}`);
  }
  switch (message_id) {
    case 'last':
      message_id = last_message_id;
      break;
    case 'last_user': {
      const last_user_message_id = getLastMessageId({ filter: (m: any) => m.is_user && !m.is_system }) as number;
      if (last_user_message_id === null) {
        throw Error(`未找到任何 user 消息楼层, 你提供的是: ${message_id}`);
      }
      message_id = last_user_message_id;
      break;
    }
    case 'last_char': {
      const last_char_message_id = getLastMessageId({ filter: (m: any) => !m.is_user && !m.is_system }) as number;
      if (last_char_message_id === null) {
        throw Error(`未找到任何 char 消息楼层, 你提供的是: ${message_id}`);
      }
      message_id = last_char_message_id;
      break;
    }
  }
  if (message_id < 0 || message_id > last_message_id) {
    throw Error(`提供的 message_id 不在 [0, ${last_message_id}] 内, 你提供的是: ${message_id} `);
  }

  const chat_message = chat[message_id];
  const result = messageFormatting(
    text,
    chat_message.name,
    chat_message.is_system,
    chat_message.is_user,
    message_id,
  );

  console.info(
    `将字符串处理为酒馆用于显示的 html 格式, 字符串: '${text}', 选项: '${JSON.stringify({ message_id })}', 结果: '${result}'`,
  );
  return result;
}

/**
 * 获取消息楼层号对应的消息内容 JQuery
 *
 * 相比于一个实用函数, 这更像是一个告诉你可以这样用 JQuery 的示例
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
export function retrieveDisplayedMessage(message_id: number): JQuery<HTMLDivElement> {
  return $(`div.mes[mesid = "${message_id}"]`, window.parent.document).find(`div.mes_text`);
}
