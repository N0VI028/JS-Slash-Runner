interface ChatMessage {
  message_id: number;
  name: string;
  is_user: boolean;
  is_system_or_hidden: boolean;
  message: string;

  // 如果 getChatMessages 时 swipe === false, 则以下内容为 undefined
  swipe_id?: number;
  swipes?: string[];
}

interface GetChatMessagesOption {
  role?: 'all' | 'system' | 'assistant' | 'user';  // 按 role 筛选消息; 默认为 `'all'`
  hidden?: boolean;                                // 是否包含被隐藏的消息楼层; 默认为 `true`
  swipe?: boolean;                                 // 是否包含消息楼层其他没被使用的消息页; 默认为 `false`
}

/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 与 `/messages` 相同
 * @param option 对获取消息进行可选设置
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hidden:boolean`: 是否包含被隐藏的消息楼层; 默认为 `true`
 *   - `swipe:boolean`: 是否包含消息楼层其他没被 ai 使用的消息页; 默认为 `false`
 *
 * @returns 一个数组, 数组的元素是每楼的消息
 *
 * @example
 * // 仅获取第 10 楼会被 ai 使用的消息页
 * const messages = await getChatMessages(10);
 * const messages = await getChatMessages("10");
 * // 获取第 10 楼的所有消息页
 * const messages = await getChatMessages(10, {swipe: true});
 * // 获取所有楼层的所有消息页
 * const messages = await getChatMessages("0-{{lastMessageId}}", {swipe: true});
 */
function getChatMessages(range: string | number, option: GetChatMessagesOption = {}): Promise<ChatMessage[]> {
  option = {
    role: option.role ?? 'all',
    hidden: option.hidden ?? true,
    swipe: option.swipe ?? false,
  } as Required<GetChatMessagesOption>;
  return new Promise((resolve, _) => {
    const uid = Date.now() + Math.random();
    function handleMessage(event: MessageEvent) {
      if (event.data?.request === "iframe_get_chat_messages_callback" && event.data.uid == uid) {
        window.removeEventListener("message", handleMessage);
        resolve(event.data.result);
      }
    }
    window.addEventListener("message", handleMessage);
    window.parent.postMessage({
      request: "iframe_get_chat_messages",
      uid: uid,
      range: range.toString(),
      option: option,
    }, "*");
  });
}

interface SetChatMessagesOption {
  swipe_id?: 'current' | number;  // 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
  switch?: boolean;      // 是否在该楼当前使用的消息页不是替换的消息页时, 自动切换为使用替换的消息页; 默认为 `false`
  reload?: boolean;      // 是否在替换后重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED`; 默认为 `false`
  // TODO: emit_event?: boolean;  // 是否根据替换时消息发生的变化发送对应的酒馆事件, 如 MESSAGE_UPDATED, MESSAGE_SWIPED 等; 默认为 `false`
}

/**
 * 替换某消息楼层的某聊天消息页. 如果替换的消息是当前在显示的消息, 则会应用正则对它进行处理然后更新显示.
 *
 * @param message 要用于替换的消息
 * @param message_id 消息楼层id
 * @param option 对获取消息进行可选设置
 *   - `swipe_id:'current'|number`: 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
 *   - `switch:boolean`: 是否在该楼当前使用的消息页不是替换的消息页时, 自动切换为使用替换的消息页; 默认为 `false`
 *   - `reload:boolean`: 是否在替换后重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED`; 默认为 `false`
 *
 * @example
 * setChatMessage("这是要设置在楼层 5 的消息, 它会替换该楼当前使用的消息", 5);
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息", 5, 3);
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息, 立即刷新它", 5, 3, {reload: true});
 */
function setChatMessage(message: string, message_id: number, option: SetChatMessagesOption = {}): void {
  option = {
    swipe_id: option.swipe_id ?? 'current',
    switch: option.switch ?? false,
    reload: option.reload ?? false,
  } as Required<SetChatMessagesOption>;
  window.parent.postMessage({
    request: "iframe_set_chat_message",
    message: message,
    message_id: message_id,
    option: option,
  }, "*");
}