interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  message: string;

  // 如果 `getChatMessages` 使用 `include_swipe: false`, 则以下内容为 `undefined`
  swipe_id?: number;
  swipes?: string[];
}

interface GetChatMessagesOption {
  role?: 'all' | 'system' | 'assistant' | 'user';  // 按 role 筛选消息; 默认为 `'all'`
  hide_state?: 'all' | 'hidden' | 'unhidden';      // 按是否被隐藏筛选消息; 默认为 `'all'`
  include_swipe?: boolean;                         // 是否包含消息楼层其他没被使用的消息页; 默认为 `false`
}

/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 与 `/messages` 相同
 * @param option 对获取消息进行可选设置
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipe:boolean`: 是否包含消息楼层其他没被使用的消息页; 默认为 `false`
 *
 * @returns 一个数组, 数组的元素是每楼的消息 `ChatMessage`. 该数组依据按 message_id 从低到高排序.
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
  // @todo @deprecated 在未来移除它
  if (Object.hasOwn(option, 'hidden')) {
    console.warn("`hidden` 已经被弃用, 请使用 `hide_state`");
    if (Object.hasOwn(option, 'include_swipe')) {
      console.warn("不要同时使用 hide_state 和 hidden, 请只使用 hide_state")
    } else {
      option.hide_state = option.hidden ? 'all' : 'unhidden';
    }
  }
  if (Object.hasOwn(option, 'swipe')) {
    console.warn("`swipe 已经被弃用, 请使用 `include_swipe`");
    if (Object.hasOwn(option, 'include_swipe')) {
      console.warn("不要同时使用 include_swipe 和 swipe, 请只使用 include_swipe")
    } else {
      option.include_swipe = option.swipe;
    }
  }

  option = {
    role: option.role ?? 'all',
    hide_state: option.hide_state ?? 'all',
    include_swipe: option.include_swipe ?? false,
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

interface SetChatMessageOption {
  swipe_id?: 'current' | number;  // 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`

  /**
   * 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
   * - `'none'`: 不更新页面的显示和 iframe 渲染
   * - `'display_current'`: 仅更新当前被替换楼层的显示, 如果替换的是没被使用的消息页, 则会自动切换为使用那一页
   * - `'display_and_render_current'`: 与 `display_current` 相同, 但还会重新渲染该楼的 iframe
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载全局脚本和楼层消息
   */
  refresh?: 'none' | 'display_current' | 'display_and_render_current' | 'all';

  // TODO: emit_event?: boolean;  // 是否根据替换时消息发生的变化发送对应的酒馆事件, 如 MESSAGE_UPDATED, MESSAGE_SWIPED 等; 默认为 `false`
}

/**
 * 替换某消息楼层的某聊天消息页. 如果替换的消息是当前会被发送给 ai 的消息 (正被使用且没被隐藏的消息页), 则 "仅格式提示词" 正则将会使用它还不是原来的消息.
 *
 * @param message 要用于替换的消息
 * @param message_id 消息楼层id
 * @param option 对获取消息进行可选设置
 * @enum
 *   - `swipe_id:'current'|number`: 要替换的消息页 (`'current'` 来替换当前使用的消息页, 或从 0 开始的序号来替换对应消息页), 如果消息中还没有该消息页, 则会创建该页; 默认为 `'current'`
 *   - `refresh:'none'|'display_current'|'display_and_render_current'|'all'`: 是否更新页面的显示和 iframe 渲染, 只会更新已经被加载显示在网页的楼层, 更新显示时会触发被更新楼层的 "仅格式显示" 正则; 默认为 `'display_and_render_current'`
 *     - `'none'`: 不更新页面的显示和 iframe 渲染
 *     - `'display_current'`: 仅更新当前被替换楼层的显示, 如果替换的是没被使用的消息页, 则会自动切换为使用那一页
 *     - `'display_and_render_current'`: 与 `display_current` 相同, 但还会重新渲染该楼的 iframe
 *     - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载全局脚本和楼层消息
 *
 * @example
 * setChatMessage("这是要设置在楼层 5 的消息, 它会替换该楼当前使用的消息", 5);
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息, 更新为显示它并渲染其中的 iframe", 5, {swipe_id: 3});
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息, 但不更新显示它", 5, {swipe_id: 3, refresh: 'none'});
 */
function setChatMessage(message: string, message_id: number, option: SetChatMessageOption = {}): void {
  option = {
    swipe_id: option.swipe_id ?? 'current',
    refresh: option.refresh ?? 'display_and_render_current',
  } as Required<SetChatMessageOption>;
  window.parent.postMessage({
    request: "iframe_set_chat_message",
    message: message,
    message_id: message_id,
    option: option,
  }, "*");
}

//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们
interface ChatMessage {
  /**
   * @deprecated 请使用 `role`. 它相当于 `role === 'user'`.
   */
  is_user: boolean;

  /**
   * @deprecated 这实际只相当于 `is_hidden`, 请使用它. 如果需要 system 消息, 请使用 `role` 获取.
   */
  is_system_or_hidden: boolean;
}

interface GetChatMessagesOption {
  /**
   * @deprecated 请使用 `hide_state`.
   * - `true` 相当于 `hide_state === 'all'`
   * - `false` 相当于 `hide_state === 'unhidden'`
   */
  hidden?: boolean;

  /**
   * @deprecated 请直接使用 `include_swipe`
   */
  swipe?: boolean;
}
