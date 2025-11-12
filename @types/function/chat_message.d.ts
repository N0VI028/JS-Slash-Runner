type ChatMessage = {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  message: string;
  data: Record<string, any>;
  extra: Record<string, any>;
};

type ChatMessageSwiped = {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  swipe_id: number;
  swipes: string[];
  swipes_data: Record<string, any>[];
  swipes_info: Record<string, any>[];
};

type GetChatMessagesOption = {
  /** 按 role 筛选消息; 默认为 `'all'` */
  role?: 'all' | 'system' | 'assistant' | 'user';
  /** 按是否被隐藏筛选消息; 默认为 `'all'` */
  hide_state?: 'all' | 'hidden' | 'unhidden';
  /** 是否包含未被 AI 使用的消息页信息, 如没选择的开局、通过点击箭头重 roll 的楼层. 如果不包含则返回类型为 `ChatMessage`, 否则返回类型为 `ChatMessageSwiped`; 默认为 `false` */
  include_swipes?: boolean;
};

/**
 * 获取聊天消息, 仅获取每楼被 AI 使用的消息页
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipes:false`: 不包含未被 AI 使用的消息页信息
 *
 * @returns 一个 `ChatMessage` 数组, 依据 message_id 从低到高排序
 *
 * @throws 如果提供的范围 `range` 无效, 将会抛出错误
 *
 * @example
 * // 仅获取第 10 楼被 AI 使用的消息页
 * const chat_messages = getChatMessages(10);
 * const chat_messages = getChatMessages('10');
 * const chat_messages = getChatMessages('10', { include_swipes: false });
 *
 * @example
 * // 获取最新楼层被 AI 使用的消息页
 * const chat_message = getChatMessages(-1)[0];  // 或 getChatMessages('{{lastMessageId}}')[0]
 *
 * @example
 * // 获取所有楼层被 AI 使用的消息页
 * const chat_messages = getChatMessages('0-{{lastMessageId}}');
 */
declare function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: Omit<GetChatMessagesOption, 'include_swipes'> & { include_swipes?: false },
): ChatMessage[];

/**
 * 获取聊天消息, 获取每楼所有的消息页, 包含未被 AI 使用的消息页消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipes:true`: 包含未被 AI 使用的消息页信息
 *
 * @returns 一个 `ChatMessageSwiped` 数组, 依据 message_id 从低到高排序
 *
 * @example
 * // 获取第 10 楼所有的消息页
 * const chat_messages = getChatMessages(10, { include_swipes: true });
 * const chat_messages = getChatMessages('10', { include_swipes: true });
 *
 * @example
 * // 获取最新楼层所有的消息页
 * const chat_message = getChatMessages(-1, { include_swipes: true })[0];  // 或 getChatMessages('{{lastMessageId}}', { include_swipes: true })[0]
 *
 * @example
 * // 获取所有楼层所有的消息页
 * const chat_messages = getChatMessages('0-{{lastMessageId}}', { include_swipes: true });
 */
declare function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: Omit<GetChatMessagesOption, 'include_swipes'> & { include_swipes?: true },
): ChatMessageSwiped[];

/**
 * 获取聊天消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipes:boolean`: 是否包含未被 AI 使用的消息页信息, 如没选择的开局、通过点击箭头重 roll 的楼层. 如果不包含则返回类型为 `ChatMessage`, 否则返回类型为 `ChatMessageSwiped`; 默认为 `false`
 *
 * @returns 一个数组, 数组的元素是每楼的消息, 依据 message_id 从低到高排序, 类型为 `ChatMessage` 或 `ChatMessageSwiped` (取决于 `include_swipes` 的值, 默认为 `ChatMessage`).
 */
declare function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: GetChatMessagesOption,
): (ChatMessage | ChatMessageSwiped)[];

type SetChatMessagesOption = {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
   * - `'none'`: 不更新页面的显示
   * - `'affected'`: 仅更新被影响楼层的显示, 更新显示时会发送 `tavern_events.USER_MESSAGE_RENDERED` 或 `tavern_events.CHARACTER_MESSAGE_RENDERED` 事件
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'affected' | 'all';
};

/**
 * 修改聊天消息的数据
 *
 * @param chat_messages 要修改的消息, 必须包含 `message_id` 字段
 * @param option 可选选项
 *   - `refresh:'none'|'affected'|'all'`: 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
 *
 * @example
 * // 修改第 10 楼被 AI 使用的消息页的正文
 * await setChatMessages([{message_id: 10, message: '新的消息'}]);
 *
 * @example
 * // 设置开局
 * await setChatMessages([{message_id: 0, swipes: ['开局1', '开局2']}])
 *
 * @example
 * // 切换为开局 3
 * await setChatMessages([{message_id: 0, swipe_id: 2}]);
 *
 * @example
 * // 重新渲染第 4 楼的前端界面 (利用 `{render: 'affected'}`)
 * await setChatMessages([{message_id: 4}]);
 *
 * @example
 * // 补充倒数第二楼的楼层变量
 * const chat_message = getChatMessages(-2)[0];
 * _.set(chat_message.data, '神乐光好感度', 5);
 * await setChatMessages([{message_id: 0, data: chat_message.data}], {refresh: 'none'});
 *
 * @example
 * // 隐藏所有楼层
 * const last_message_id = getLastMessageId();
 * await setChatMessages(_.range(last_message_id + 1).map(message_id => ({message_id, is_hidden: true})));
 */
declare function setChatMessages(
  chat_messages: Array<{ message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>)>,
  { refresh }?: SetChatMessagesOption,
): Promise<void>;

type ChatMessageCreating = {
  name?: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden?: boolean;
  message: string;
  data?: Record<string, any>;
  extra?: Record<string, any>;
};

type CreateChatMessagesOption = {
  /** 插入到指定楼层前或末尾; 默认为末尾 */
  insert_at?: number | 'end';

  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
   * - `'none'`: 不更新页面的显示
   * - `'affected'`: 仅更新被影响楼层的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'affected' | 'all';
};

/**
 * 创建聊天消息
 *
 * @param chat_messages 要创建的消息, 必须包含 `role` 和 `message` 字段
 * @param option 可选选项
 *   - `insert_at:number|'end'`: 插入到指定楼层前或末尾; 默认为末尾
 *   - `refresh:'none'|'affected'|'all'`: 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
 *
 * @example
 * // 在第 10 楼前插入一条消息
 * await createChatMessages([{role: 'user', message: '你好'}], {insert_at: 10});
 *
 * @example
 * // 在末尾插入一条消息
 * await createChatMessages([{role: 'user', message: '你好'}]);
 */
declare function createChatMessages(
  chat_messages: ChatMessageCreating[],
  { insert_at, refresh }?: CreateChatMessagesOption,
): Promise<void>;

type DeleteChatMessagesOption = {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
   * - `'none'`: 不更新页面的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'all';
};

/**
 * 删除聊天消息
 *
 * @param message_ids 要删除的消息楼层号数组
 * @param option 可选选项
 *   - `refresh:'none'|'all'`: 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
 *
 * @example
 * // 删除第 10 楼、第 15 楼、倒数第二楼和最后一楼
 * await deleteChatMessages([10, 15, -2, getLastMessageId()]);
 *
 * @example
 * // 删除所有楼层
 * await deleteChatMessages(_.range(getLastMessageId() + 1));
 */
declare function deleteChatMessages(message_ids: number[], { refresh }?: DeleteChatMessagesOption): Promise<void>;

type RotateChatMessagesOption = {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
   * - `'none'`: 不更新页面的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'all';
};

/**
 * 将原本顺序是 `[begin, middle) [middle, end)` 的楼层旋转为 `[middle, end) [begin, middle)`
 *
 * @param begin 旋转前开头楼层的楼层号
 * @param middle 旋转后将会被放到最开头的楼层号
 * @param end 旋转前结尾楼层的楼层号 + 1
 * @param option 可选选项
 *   - `refresh:'none'|'all'`: 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
 *
 * @example
 * // 将最后一楼放到第 5 楼之前
 * await rotateChatMessages(5, getLastMessageId(), getLastMessageId() + 1);
 *
 * // 将最后 3 楼放到第 1 楼之前
 * await rotateChatMessages(1, getLastMessageId() - 2, getLastMessageId() + 1);
 *
 * // 将前 3 楼放到最后
 * await rotateChatMessages(0, 3, getLastMessageId() + 1);
 */
declare function rotateChatMessages(
  begin: number,
  middle: number,
  end: number,
  { refresh }?: RotateChatMessagesOption,
): Promise<void>;
