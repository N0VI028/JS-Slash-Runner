/**
 * 切换音频播放模式
 */
async function audioMode(args: { type: string; mode: string }): Promise<void>;

/**
 * 切换播放器开关状态
 */
async function audioEnable(args: { type: string; state?: string }): Promise<void>;

/**
 * 切换播放/暂停状态
 */
async function audioPlay(args: { type: string; play?: string }): Promise<void>;

/**
 * 导入音频链接
 */
async function audioImport(args: { type: string; play?: string }, url: string): Promise<void>;

/**
 * 选择并播放音频
 */
async function audioSelect(args: { type: string }, url: string): Promise<void>;
const builtin: {
  addOneMessage: (
    mes: Record<string, any>,
    {
      type = 'normal',
      insertAfter = null,
      scroll = true,
      insertBefore = null,
      forceId = null,
      showSwipes = true,
    }?: {
      type?: string;
      insertAfter?: number;
      scroll?: boolean;
      insertBefore?: number;
      forceId?: number;
      showSwipes?: boolean;
    },
  ) => void;
  saveSettings: () => Promise<void>;
  reloadEditor: (file: string, load_if_not_selected?: boolean) => void;
  reloadEditorDebounced: (file: string, load_if_not_selected?: boolean) => void;
};
/**
 * 角色卡管理类
 * 用于封装角色卡数据操作和提供便捷的访问方法
 */
class Character {
  constructor(characterData: v1CharData);

  /**
   * 根据名称或头像id查找角色卡数据
   * @param options 查找选项
   * @returns 找到的角色卡数据，找不到为null
   */
  static find({ name, allowAvatar }?: { name?: string; allowAvatar?: boolean }): v1CharData;

  /**
   * 根据名称查找角色卡数据在characters数组中的索引（类似this_chid）
   * @param name 角色名称
   * @returns 角色卡数据在characters数组中的索引，未找到返回-1
   */
  static findCharacterIndex(name: string): any;

  /**
   * 从服务器获取每个聊天文件的聊天内容，并将其编译成字典。
   * 该函数遍历提供的聊天元数据列表，并请求每个聊天的实际聊天内容，
   *
   * @param {Array} data - 包含每个聊天的元数据的数组，例如文件名。
   * @param {boolean} isGroupChat - 一个标志，指示聊天是否为群组聊天。
   * @returns {Promise<Object>} chat_dict - 一个字典，其中每个键是文件名，值是
   * 从服务器获取的相应聊天内容。
   */
  static getChatsFromFiles(data: any[], isGroupChat: boolean): Promise<Record<string, any>>;

  /**
   * 获取角色管理内的数据
   * @returns 完整的角色管理内的数据对象
   */
  getCardData(): v1CharData;

  /**
   * 获取角色头像ID
   * @returns 头像ID/文件名
   */
  getAvatarId(): string;

  /**
   * 获取正则脚本
   * @returns 正则脚本数组
   */
  getRegexScripts(): Array<{
    id: string;
    scriptName: string;
    findRegex: string;
    replaceString: string;
    trimStrings: string[];
    placement: number[];
    disabled: boolean;
    markdownOnly: boolean;
    promptOnly: boolean;
    runOnEdit: boolean;
    substituteRegex: number | boolean;
    minDepth: number;
    maxDepth: number;
  }>;

  /**
   * 获取角色书
   * @returns 角色书数据对象或null
   */
  getCharacterBook(): {
    name: string;
    entries: Array<{
      keys: string[];
      secondary_keys?: string[];
      comment: string;
      content: string;
      constant: boolean;
      selective: boolean;
      insertion_order: number;
      enabled: boolean;
      position: string;
      extensions: any;
      id: number;
    }>;
  } | null;

  /**
   * 获取角色世界名称
   * @returns 世界名称
   */
  getWorldName(): string;
}

/**
 * 获取角色卡数据
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色卡数据
 */
function getCharData(name?: string, allowAvatar?: boolean): v1CharData | null;

/**
 * 获取角色头像路径
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 角色头像路径
 */
function getCharAvatarPath(name?: string, allowAvatar?: boolean): string | null;

/**
 * 获取角色聊天历史摘要
 * @param name 角色名称或头像ID
 * @param allowAvatar 是否允许通过头像ID查找
 * @returns 聊天历史摘要数组
 */
function getChatHistoryBrief(name?: string, allowAvatar?: boolean): Promise<any[] | null>;

/**
 * 获取聊天历史详情
 * @param data 聊天数据数组
 * @param isGroupChat 是否为群组聊天
 * @returns 聊天历史详情
 */
function getChatHistoryDetail(data: any[], isGroupChat?: boolean): Promise<Record<string, any> | null>;
interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  message: string;
  data: Record<string, any>;
  extra: Record<string, any>;
}

interface ChatMessageSwiped {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden: boolean;
  swipe_id: number;
  swipes: string[];
  swipes_data: Record<string, any>[];
  swipes_info: Record<string, any>[];
}

interface GetChatMessagesOption {
  /** 按 role 筛选消息; 默认为 `'all'` */
  role?: 'all' | 'system' | 'assistant' | 'user';
  /** 按是否被隐藏筛选消息; 默认为 `'all'` */
  hide_state?: 'all' | 'hidden' | 'unhidden';
  /** 是否包含未被 ai 使用的消息页信息, 如没选择的开局、通过点击箭头重 roll 的楼层. 如果不包含则返回类型为 `ChatMessage`, 否则返回类型为 `ChatMessageSwiped`; 默认为 `false` */
  include_swipes?: boolean;
}

/**
 * 获取聊天消息, 仅获取每楼被 ai 使用的消息页
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipes:false`: 不包含未被 ai 使用的消息页信息
 *
 * @returns 一个 `ChatMessage` 数组, 依据 message_id 从低到高排序
 *
 * @example
 * // 仅获取第 10 楼被 ai 使用的消息页
 * const chat_messages = getChatMessages(10);
 * const chat_messages = getChatMessages('10');
 * const chat_messages = getChatMessages('10', { include_swipes: false });
 *
 * @example
 * // 获取最新楼层被 ai 使用的消息页
 * const chat_message = getChatMessages(-1)[0];  // 或 getChatMessages('{{lastMessageId}}')[0]
 *
 * @example
 * // 获取所有楼层被 ai 使用的消息页
 * const chat_messages = getChatMessages('0-{{lastMessageId}}');
 */
function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: Omit<GetChatMessagesOption, 'include_swipes'> & { include_swipes?: false },
): ChatMessage[];

/**
 * 获取聊天消息, 获取每楼所有的消息页, 包含未被 ai 使用的消息页消息
 *
 * @param range 要获取的消息楼层号或楼层范围, 如 `0`, `'0-{{lastMessageId}}'`, `-1` 等. 负数表示深度, 如 `-1` 表示最新的消息楼层, `-2` 表示倒数第二条消息楼层.
 * @param option 可选选项
 *   - `role:'all'|'system'|'assistant'|'user'`: 按 role 筛选消息; 默认为 `'all'`
 *   - `hide_state:'all'|'hidden'|'unhidden'`: 按是否被隐藏筛选消息; 默认为 `'all'`
 *   - `include_swipes:true`: 包含未被 ai 使用的消息页信息
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
function getChatMessages(
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
 *   - `include_swipes:boolean`: 是否包含未被 ai 使用的消息页信息, 如没选择的开局、通过点击箭头重 roll 的楼层. 如果不包含则返回类型为 `ChatMessage`, 否则返回类型为 `ChatMessageSwiped`; 默认为 `false`
 *
 * @returns 一个数组, 数组的元素是每楼的消息, 依据 message_id 从低到高排序, 类型为 `ChatMessage` 或 `ChatMessageSwiped` (取决于 `include_swipes` 的值, 默认为 `ChatMessage`).
 */
function getChatMessages(
  range: string | number,
  { role, hide_state, include_swipes }?: GetChatMessagesOption,
): (ChatMessage | ChatMessageSwiped)[];

interface SetChatMessagesOption {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
   * - `'none'`: 不更新页面的显示
   * - `'affected'`: 仅更新被影响楼层的显示, 更新显示时会发送 `tavern_events.USER_MESSAGE_RENDERED` 或 `tavern_events.CHARACTER_MESSAGE_RENDERED` 事件
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'affected' | 'all';
}

/**
 * 修改聊天消息的数据
 *
 * @param chat_messages 要修改的消息, 必须包含 `message_id` 字段
 * @param option 可选选项
 *   - `refresh:'none'|'affected'|'all'`: 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
 *
 * @example
 * // 修改第 10 楼被 ai 使用的消息页的正文
 * await setChatMessages([{message_id: 10, message: '新的消息'}]);
 *
 * @example
 * // 补充倒数第二楼的楼层变量
 * const chat_message = getChatMessages(-2)[0];
 * _.set(chat_message.data, '神乐光好感度', 5);
 * await setChatMessages([{message_id: 0, data: chat_message.data}], {refresh: 'none'});
 *
 * @example
 * // 切换为开局 3
 * await setChatMessages([{message_id: 0, swipe_id: 2}]);
 *
 * @example
 * // 隐藏所有楼层
 * const last_message_id = getLastMessageId();
 * await setChatMessages(_.range(last_message_id + 1).map(message_id => ({message_id, is_hidden: true})));
 */
async function setChatMessages(
  chat_messages: Array<{ message_id: number } & (Partial<ChatMessage> | Partial<ChatMessageSwiped>)>,
  { refresh }?: SetChatMessagesOption,
);

interface ChatMessageCreating {
  name?: string;
  role: 'system' | 'assistant' | 'user';
  is_hidden?: boolean;
  message: string;
  data?: Record<string, any>;
}

interface CreateChatMessagesOption {
  /** 插入到指定楼层前或末尾 */
  insert_at?: number | 'end';

  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'affected'`
   * - `'none'`: 不更新页面的显示
   * - `'affected'`: 仅更新被影响楼层的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'affected' | 'all';
}

/**
 * 创建聊天消息
 *
 * @param chat_messages 要创建的消息, 必须包含 `role` 和 `message` 字段
 * @param option 可选选项
 *   - `insert_at:number|'end'`: 插入到指定楼层前或末尾
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
async function createChatMessages(
  chat_messages: ChatMessageCreating[],
  { insert_at, refresh }?: CreateChatMessagesOption,
): Promise<void>;

interface DeleteChatMessagesOption {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
   * - `'none'`: 不更新页面的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'all';
}

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
async function deleteChatMessages(message_ids: number[], { refresh }?: DeleteChatMessagesOption): Promise<void>;

interface RotateChatMessagesOption {
  /**
   * 是否更新楼层在页面上的显示, 只会更新已经被加载在网页上的楼层, 并触发被更新楼层的 "仅格式显示" 正则; 默认为 `'all'`
   * - `'none'`: 不更新页面的显示
   * - `'all'`: 重新载入整个聊天消息, 将会触发 `tavern_events.CHAT_CHANGED` 事件
   */
  refresh?: 'none' | 'all';
}

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
async function rotateChatMessages(
  begin: number,
  middle: number,
  end: number,
  { refresh }?: RotateChatMessagesOption,
): Promise<void>;
interface FormatAsDisplayedMessageOption {
  /** 消息所在的楼层, 要求该楼层已经存在, 即在 `[0, await getLastMessageId()]` 范围内; 默认为 'last' */
  message_id?: 'last' | 'last_user' | 'last_char' | number;
}

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
 *
 * @example
 * const text = formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}");
 * => "<p>少女歌剧 speaks in 5</p>";
 */
function formatAsDisplayedMessage(text: string, { message_id }?: FormatAsDisplayedMessageOption): string;

/**
 * 获取消息楼层号对应的消息内容 JQuery
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
function retrieveDisplayedMessage(message_id: number): JQuery<HTMLDivElement>;
interface GenerateConfig {
  /** 用户输入 */
  user_input?: string;

  /**
   * 图片输入，支持以下格式：
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string;

  /**
   * 是否启用流式传输; 默认为 `false`.
   *
   * 若启用流式传输, 每次得到流式传输结果时, 函数将会发送事件:
   * - `ifraem_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
   * - `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
   *
   * @example
   * eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, text => console.info(text));
   */
  should_stream?: boolean;

  /**
   * 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词.
   *   如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述.
   */
  overrides?: Overrides;

  /** 要额外注入的提示词 */
  injects?: InjectionPrompt[];

  /** 最多使用多少条聊天历史; 默认为 'all' */
  max_chat_history?: 'all' | number;
}

interface GenerateRawConfig {
  /**
   * 用户输入.
   *
   * 如果设置, 则无论 ordered_prompts 中是否有 'user_input' 都会加入该用户输入提示词; 默认加入在 'chat_history' 末尾.
   */
  user_input?: string;

  /**
   * 图片输入，支持以下格式：
   * - File 对象：通过 input[type="file"] 获取的文件对象
   * - Base64 字符串：图片的 base64 编码
   * - URL 字符串：图片的在线地址
   */
  image?: File | string;

  /**
   * 是否启用流式传输; 默认为 `false`.
   *
   * 若启用流式传输, 每次得到流式传输结果时, 函数将会发送事件:
   * - `ifraem_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
   * - `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
   *
   * @example
   * eventOn(iframe_events.STREAM_TOKEN_RECEIVED_FULLY, text => console.info(text));
   */
  should_stream?: boolean;

  /**
   * 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词.
   *   如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖提示词
   */
  overrides?: Overrides;

  injects?: InjectionRawPrompt[];

  /**
   * 一个提示词数组, 数组元素将会按顺序发给 ai, 因而相当于自定义预设. 该数组允许存放两种类型:
   * - `BuiltinPrompt`: 内置提示词. 由于不使用预设, 如果需要 "角色描述" 等提示词, 你需要自己指定要用哪些并给出顺序
   *                      如果不想自己指定, 可通过 `builtin_prompt_default_order` 得到酒馆默认预设所使用的顺序 (但对于这种情况, 也许你更应该用 `generate`).
   * - `RolePrompt`: 要额外给定的提示词.
   */
  ordered_prompts?: (BuiltinPrompt | RolePrompt)[];

  /** 最多使用多少条聊天历史; 默认为 'all' */
  max_chat_history?: 'all' | number;
}

interface RolePrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;
  image?: File | string;
}

interface InjectionPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;

  /** 要注入的位置. 'none' 不会发给 ai, 但能用来激活世界书条目. */
  position: 'before_prompt' | 'in_chat' | 'after_prompt' | 'none';

  depth: number;

  /** 是否要加入世界书扫描中 */
  should_scan: boolean;
}

interface InjectionRawPrompt {
  role: 'system' | 'assistant' | 'user';
  content: string;

  /** 要注入的位置. 'none' 不会发给 ai, 但能用来激活世界书条目. */
  position: 'in_chat' | 'none';

  depth: number;

  /** 是否要加入世界书扫描中 */
  should_scan: boolean;
}

interface Overrides {
  world_info_before?: string;
  persona_description?: string;
  char_description?: string;
  char_personality?: string;
  scenario?: string;
  world_info_after?: string;
  dialogue_examples?: string;

  /**
   * 聊天历史
   * - `with_depth_entries`: 是否启用世界书中按深度插入的条目; 默认为 `true`
   * - `author_note`: 若设置, 覆盖 "作者注释" 为给定的字符串
   * - `prompts`: 若设置, 覆盖 "聊天历史" 为给定的提示词
   */
  chat_history?: {
    with_depth_entries?: boolean;
    author_note?: string;
    prompts?: RolePrompt[];
  };
}

/**
 * 预设为内置提示词设置的默认顺序
 */
const builtin_prompt_default_order: BuiltinPrompt[];

type BuiltinPrompt =
  | 'world_info_before'
  | 'persona_description'
  | 'char_description'
  | 'char_personality'
  | 'scenario'
  | 'world_info_after'
  | 'dialogue_examples'
  | 'chat_history'
  | 'user_input';

/**
 * 使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - `iframe_events.GENERATION_STARTED`: 生成开始
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - `iframe_events.GENERATION_ENDED`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - `user_input?:string`: 用户输入
 *   - `should_stream?:boolean`: 是否启用流式传输; 默认为 'false'
 *   - `image?:File|string`: 图片输入
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:InjectionPrompt[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 * @returns 生成的最终文本
 *
 * @example
 * // 流式生成
 * const result = await generate({ user_input: '你好', should_stream: true });
 *
 * @example
 * // 图片输入
 * const result = await generate({ user_input: '你好', image: 'https://example.com/image.jpg' });
 *
 * @example
 * // 注入、覆盖提示词
 * const result = await generate({
 *   user_input: '你好',
 *   injects: [{ role: 'system', content: '思维链...', position: 'in_chat', depth: 0, should_scan: true, }]
 *   overrides: {
 *     char_personality: '温柔',
 *     world_info_before: '',
 *     chat_history: {
 *       prompts: [],
 *     }
 *   }
 * });
 */
async function generate(config: GenerateConfig): Promise<string>;

/**
 * 不使用酒馆当前启用的预设, 让 ai 生成一段文本.
 *
 * 该函数在执行过程中将会发送以下事件:
 * - `iframe_events.GENERATION_STARTED`: 生成开始
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_FULLY`: 监听它可以得到流式传输的当前完整文本 ("这是", "这是一条", "这是一条流式传输")
 * - 若启用流式传输, `iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY`: 监听它可以得到流式传输的当前增量文本 ("这是", "一条", "流式传输")
 * - `iframe_events.GENERATION_ENDED`: 生成结束, 监听它可以得到生成的最终文本 (当然也能通过函数返回值获得)
 *
 * @param config 提示词和生成方式设置
 *   - `user_input?:string`: 用户输入
 *   - `should_stream?:boolean`: 是否启用流式传输; 默认为 'false'
 *   - `image?:File|string`: 图片输入
 *   - `overrides?:Overrides`: 覆盖选项. 若设置, 则 `overrides` 中给出的字段将会覆盖对应的提示词. 如 `overrides.char_description = '覆盖的角色描述';` 将会覆盖角色描述
 *   - `injects?:InjectionPrompt[]`: 要额外注入的提示词
 *   - `max_chat_history?:'all'|number`: 最多使用多少条聊天历史
 *   - `ordered_prompts?:(BuiltinPrompt|RolePrompt)[]`: 一个提示词数组, 数组元素将会按顺序发给 ai, 因而相当于自定义预设
 * @returns 生成的最终文本
 *
 * @example
 * // 自定义内置提示词顺序, 未在 ordered_prompts 中给出的将不会被使用
 * const result = await generateRaw({
 *   user_input: '你好',
 *   ordered_prompts: [
 *     'char_description',
 *     { role: 'system', content: '系统提示' },
 *     'chat_history',
 *     'user_input',
 *   ]
 * })
 */
async function generateRaw(config: GenerateRawConfig): Promise<string>;
interface Window {
  /**
   * 酒馆助手提供的额外功能, 具体内容见于 https://n0vi028.github.io/JS-Slash-Runner-Doc
   * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.TavernHelper` 来查看当前酒馆助手所提供的接口
   */
  TavernHelper: {
    // audio
    readonly audioEnable: typeof audioEnable;
    readonly audioImport: typeof audioImport;
    readonly audioMode: typeof audioMode;
    readonly audioPlay: typeof audioPlay;
    readonly audioSelect: typeof audioSelect;

    // builtin
    readonly builtin: typeof builtin;

    // character
    readonly Character: typeof Character;
    readonly getCharData: typeof getCharData;
    readonly getCharAvatarPath: typeof getCharAvatarPath;
    readonly getChatHistoryBrief: typeof getChatHistoryBrief;
    readonly getChatHistoryDetail: typeof getChatHistoryDetail;

    // chat_message
    readonly getChatMessages: typeof getChatMessages;
    readonly setChatMessages: typeof setChatMessages;
    readonly deleteChatMessages: typeof deleteChatMessages;
    readonly rotateChatMessages: typeof rotateChatMessages;
    readonly createChatMessages: typeof createChatMessages;

    // displayed_message
    readonly formatAsDisplayedMessage: typeof formatAsDisplayedMessage;
    readonly retrieveDisplayedMessage: typeof retrieveDisplayedMessage;

    // generate
    readonly builtin_prompt_default_order: typeof builtin_prompt_default_order;
    readonly generate: typeof generate;
    readonly generateRaw: typeof generateRaw;

    // lorebook_entry
    readonly getLorebookEntries: typeof getLorebookEntries;
    readonly replaceLorebookEntries: typeof replaceLorebookEntries;
    readonly updatelorebookEntriesWith: typeof updateLorebookEntriesWith;
    readonly setLorebookEntries: typeof setLorebookEntries;
    readonly createLorebookEntries: typeof createLorebookEntries;
    readonly deleteLorebookEntries: typeof deleteLorebookEntries;

    // lorebook
    readonly getLorebookSettings: typeof getLorebookSettings;
    readonly setLorebookSettings: typeof setLorebookSettings;
    readonly getLorebooks: typeof getLorebooks;
    readonly deleteLorebook: typeof deleteLorebook;
    readonly createLorebook: typeof createLorebook;
    readonly getCharLorebooks: typeof getCharLorebooks;
    readonly setCurrentCharLorebooks: typeof setCurrentCharLorebooks;
    readonly getCurrentCharPrimaryLorebook: typeof getCurrentCharPrimaryLorebook;
    readonly getOrCreateChatLorebook: typeof getOrCreateChatLorebook;

    // macrolike
    readonly registerMacroLike: typeof registerMacroLike;

    // script_repository
    readonly getScriptButtons: typeof getScriptButtons;
    readonly replaceScriptButtons: typeof replaceScriptButtons;

    // slash
    readonly triggerSlash: typeof triggerSlash;

    // tavern_regex
    readonly isCharacterTavernRegexesEnabled: typeof isCharacterTavernRegexesEnabled;
    readonly getTavernRegexes: typeof getTavernRegexes;
    readonly replaceTavernRegexes: typeof replaceTavernRegexes;
    readonly updateTavernRegexesWith: typeof updateTavernRegexesWith;

    // util
    readonly substitudeMacros: typeof substitudeMacros;
    readonly getLastMessageId: typeof getLastMessageId;
    readonly errorCatched: typeof errorCatched;

    // variables
    readonly getVariables: typeof getVariables;
    readonly replaceVariables: typeof replaceVariables;
    readonly updateVariablesWith: typeof updateVariablesWith;
    readonly insertOrAssignVariables: typeof insertOrAssignVariables;
    readonly deleteVariable: typeof deleteVariable;
    readonly insertVariables: typeof insertVariables;

    // version
    readonly getTavernHelperVersion: typeof getTavernHelperVersion;
    readonly updateTavernHelper: typeof updateTavernHelper;
  };
}
interface LorebookSettings {
  selected_global_lorebooks: string[];
  scan_depth: number;
  context_percentage: number;
  budget_cap: number;
  min_activations: number;
  max_depth: number;
  max_recursion_steps: number;
  insertion_strategy: 'evenly' | 'character_first' | 'global_first';
  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;
}

interface GetCharLorebooksOption {
  name?: string;
  type?: 'all' | 'primary' | 'additional';
}

/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 *
 * @example
 * // 获取全局启用的世界书
 * const settings = getLorebookSettings();
 * alert(settings.selected_global_lorebooks);
 */
function getLorebookSettings(): LorebookSettings;

/**
 * 修改世界书全局设置
 *
 * @returns 修改世界书全局设置
 *
 * @example
 * // 修改上下文百分比为 100%, 启用递归扫描
 * await setLorebookSettings({context_percentage: 100, recursive: true});
 *
 * @example
 * // setLorebookSettings 因为酒馆问题很慢, 建议先 getLorebookSetting, 进行比较, 再 setLorebookSettings
 * const expected_settings = { 预期设置 };
 * const settings = getLorebookSettings();
 * if (_.isEqual(_.merge({}, settings, expected_settings), settings)) {
 *   setLorebookSettings(expected_settings);
 * }
 */
function setLorebookSettings(settings: Partial<LorebookSettings>): void;

/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
function getLorebooks(): string[];

/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
async function deleteLorebook(lorebook: string): Promise<boolean>;

/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
async function createLorebook(lorebook: string): Promise<boolean>;

interface CharLorebooks {
  primary: string | null;
  additional: string[];
}

/**
 * 获取角色卡绑定的世界书
 *
 * @param option 可选选项
 *   - `name?:string`: 要查询的角色卡名称; 默认为当前角色卡
 *   - `type?:'all'|'primary'|'additional'`: 按角色世界书的绑定类型筛选世界书; 默认为 `'all'`
 *
 * @returns 一个 CharLorebook 数组
 */
function getCharLorebooks({ name, type }?: GetCharLorebooksOption): CharLorebooks;

/**
 * 获取当前角色卡绑定的主要世界书
 *
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 `null`
 */
function getCurrentCharPrimaryLorebook(): string | null;

/**
 * 设置当前角色卡绑定的世界书
 *
 * @param lorebooks 要设置的世界书信息
 *    - `primary: string | null;`: 主要世界书名称，设为null或空字符串表示移除
 *    - `additional: string[];`: 附加世界书名称数组，设为空数组表示移除所有附加世界书
 */
async function setCurrentCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void>;

/**
 * 获取当前聊天绑定的世界书
 *
 * @returns 当前聊天绑定的世界书名称, 或 null 表示没有绑定世界书
 */
async function getChatLorebook(): Promise<string | null>;

/**
 * 设置当前聊天绑定的世界书
 *
 * @param lorebook 世界书名称, 或 null 表示移除世界书
 */
async function setChatLorebook(lorebook: string | null): Promise<void>;

/**
 * 获取或创建当前聊天绑定的世界书
 *
 * @param lorebook 可选参数, 指定世界书名称; 如果未指定, 则根据聊天文件名自动生成一个世界书名称
 *
 * @returns 聊天世界书的名称
 */
async function getOrCreateChatLorebook(lorebook?: string): Promise<string>;
interface LorebookEntry {
  /** uid 是相对于世界书内部的, 不要跨世界书使用 */
  uid: number;
  /** 酒馆中将排序设置为 "自定义" 时的显示顺序 */
  display_index: number;

  comment: string;
  enabled: boolean;
  type: 'constant' | 'selective' | 'vectorized';
  position:
    | 'before_character_definition'
    | 'after_character_definition'
    | 'before_example_messages'
    | 'after_example_messages'
    | 'before_author_note'
    | 'after_author_note'
    | 'at_depth_as_system'
    | 'at_depth_as_assistant'
    | 'at_depth_as_user';

  /** 仅对于 `position === 'at_depth_as_???'` 有意义; 其他情况为 null */
  depth: number | null;
  order: number;
  probability: number;

  keys: string[];
  logic: 'and_any' | 'and_all' | 'not_all' | 'not_any';
  filters: string[];

  scan_depth: 'same_as_global' | number;
  case_sensitive: 'same_as_global' | boolean;
  match_whole_words: 'same_as_global' | boolean;
  use_group_scoring: 'same_as_global' | boolean;
  automation_id: string | null;

  exclude_recursion: boolean;
  prevent_recursion: boolean;
  /** 启用则是 true, 如果设置了具体的 Recursion Level 则是数字 (具体参考酒馆中勾选这个选项后的变化) */
  delay_until_recursion: boolean | number;

  content: string;

  group: string;
  group_prioritized: boolean;
  group_weight: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
}

interface GetLorebookEntriesOption {
  /** 按照指定字段值筛选条目, 如 `{position: 'at_depth_as_system'}` 表示仅获取处于 @D⚙ 的条目; 默认为不进行筛选. 由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选. */
  filter?: 'none' | Partial<LorebookEntry>;
}

/**
 * 获取世界书中的条目信息
 *
 * @param lorebook 世界书名称
 *
 * @returns 一个数组, 元素是各条目信息
 *
 * @example
 * // 获取世界书中所有条目的所有信息
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 */
async function getLorebookEntries(lorebook: string): Promise<LorebookEntry[]>;

/**
 * 完全替换世界书 `lorebook` 的所有条目为 `entries`
 *
 * @param lorebook 世界书名称
 * @param entries 要用于替换的世界书条目数组. 如果 `uid` 没有设置或有重复则会新设置 `uid`; 如果某些字段没设置, 则会使用酒馆默认会设置的值.
 *
 * @example
 * // 禁止所有条目递归, 保持其他设置不变
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 * await replaceLorebookEntries("eramgt少女歌剧", entries.map(entry => ({ ...entry, prevent_recursion: true })));
 *
 * @example
 * // 删除所有名字中包含 `神乐光` 的条目
 * const entries = await getLorebookEntries("eramgt少女歌剧");
 * _.remove(entries, entry => entry.comment.includes('神乐光'));
 * await replaceLorebookEntries("eramgt少女歌剧", entries);
 */
async function replaceLorebookEntries(lorebook: string, entries: Partial<LorebookEntry>[]): Promise<void>;

type LorebookEntriesUpdater =
  | ((entries: LorebookEntry[]) => Partial<LorebookEntry>[])
  | ((entries: LorebookEntry[]) => Promise<Partial<LorebookEntry>[]>);

/**
 * 用 `updater` 函数更新世界书 `lorebook`
 *
 * @param updater 用于更新世界书的函数. 它应该接收世界书条目作为参数, 并返回更新后的世界书条目.
 *
 * @returns 更新后的世界书条目
 *
 * @example
 * // 删除所有名字中包含 `神乐光` 的条目
 * await updateLorebookEntriesWith("eramgt少女歌剧", entries => entries.filter(entry => entry.comment.includes('神乐光')))
 */
async function updateLorebookEntriesWith(lorebook: string, updater: LorebookEntriesUpdater): Promise<LorebookEntry[]>;

/**
 * 将条目信息修改回对应的世界书中, 如果某个字段不存在, 则该字段采用原来的值.
 *
 * 这只是修改信息, 不能创建新的条目, 因此要求条目必须已经在世界书中.
 *
 * @param lorebook 条目所在的世界书名称
 * @param entries 一个数组, 元素是各条目信息. 其中必须有 "uid", 而其他字段可选.
 *
 * @returns 更新后的世界书条目
 */
async function setLorebookEntries(
  lorebook: string,
  entries: Array<Pick<LorebookEntry, 'uid'> & Partial<LorebookEntry>>,
): Promise<LorebookEntry[]>;

/**
 * 向世界书中新增条目
 *
 * @param lorebook 世界书名称
 * @param entries 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值. **不能设置 `uid`**.
 *
 * @returns 更新后的世界书条目, 以及新条目的 uid
 */
async function createLorebookEntries(
  lorebook: string,
  entries: Partial<LorebookEntry>[],
): Promise<{ entries: LorebookEntry[]; new_uids: number[] }>;

/**
 * 删除世界书中的某个条目
 *
 * @param lorebook 世界书名称
 * @param uids 要删除的所有条目 uid
 *
 * @returns 更新后的世界书条目, 以及是否有发生删除
 */
async function deleteLorebookEntries(
  lorebook: string,
  uids: number[],
): Promise<{ entries: LorebookEntry[]; delete_occurred: boolean }>;

//----------------------------------------------------------------------------------------------------------------------
/** @deprecated 请使用 `createLorebookEntries` 代替 */
async function createLorebookEntry(lorebook: string, field_values: Partial<LorebookEntry>): Promise<number>;

/** @deprecated 请使用 `deleteLorebookEntries` 代替 */
async function deleteLorebookEntry(lorebook: string, lorebook_uid: number): Promise<boolean>;
interface MacroLike {
  regex: RegExp;
  replace: (context: Context, substring: string, ...args: any[]) => string;
}

interface Context {
  message_id?: number;
  role?: 'user' | 'assistant' | 'system';
}

/**
 * 注册一个新的助手宏
 *
 * @param regex 匹配的正则表达式
 * @param replace 针对匹配到的文本所要进行的替换
 *
 * @example
 * registerMacros(
 *   /<checkbox>(.*?)<checkbox>/gi,
 *   (context: Context, substring: string, content: string) => { return content; });
 */
function registerMacroLike(
  regex: RegExp,
  replace: (context: Context, substring: string, ...args: any[]) => string,
): void;

interface ScriptButton {
  name: string;
  visible: boolean;
}

/**
 * 获取指定脚本的按钮设置
 * @param script_id 脚本ID
 * @returns 按钮
 *
 * @example
 * // 在脚本内获取当前脚本的按钮设置
 * const buttons = getScriptButtons(getScriptId());
 */
function getScriptButtons(script_id: string): ScriptButton[] {
  if (!script_id) {
    throw new Error('脚本ID不能为空');
  }
  return ScriptManager.getInstance().getScriptButton(script_id);
}

/**
 * 替换指定脚本的按钮设置
 * @param script_id 脚本ID
 * @param buttons 按钮
 *
 * @example
 * // 在脚本内设置脚本按钮为一个"开始游戏"按钮
 * replaceScriptButtons(getScriptId(), [{name: '开始游戏', visible: true}])
 *
 * @example
 * // 点击"前往地点"按钮后，切换为地点选项按钮
 * eventOnButton("前往地点" () => {
 *   replaceScriptButtons(getScriptId(), [{name: '学校', visible: true}, {name: '商店', visible: true}])
 * })
 */
function replaceScriptButtons(script_id: string, buttons: ScriptButton[]): void {
  if (!script_id) {
    throw new Error(`脚本ID不能为空`);
  }

  const script = ScriptManager.getInstance().getScriptById(script_id);
  if (!script) {
    throw new Error(`脚本不存在: ${script_id}`);
  }

  const type = ScriptData.getInstance().getScriptType(script);

  script.buttons = buttons;
  ScriptManager.getInstance().setScriptButton(script, type);
}
/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param command 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 *
 * @example
 * // 在酒馆界面弹出提示语 `运行成功!`
 * triggerSlash('/echo severity=success 运行成功!');
 * // 但更建议你直接用 toastr 弹出提示
 * toastr.success('运行成功!');
 *
 * @example
 * // 获取当前聊天消息最后一条消息对应的 id
 * const last_message_id = await triggerSlash('/pass {{lastMessageId}}');
 */
async function triggerSlash(command: string): Promise<string>;
interface TavernRegex {
  id: string;
  script_name: string;
  enabled: boolean;
  run_on_edit: boolean;
  scope: 'global' | 'character';
  find_regex: string;
  replace_string: string;
  source: {
    user_input: boolean;
    ai_output: boolean;
    slash_command: boolean;
    world_info: boolean;
  };
  destination: {
    display: boolean;
    prompt: boolean;
  };
  min_depth: number | null;
  max_depth: number | null;
}

/**
 * 判断局部正则是否启用
 */
function isCharacterTavernRegexesEnabled(): boolean;

interface GetTavernRegexesOption {
  scope?: 'all' | 'global' | 'character';
  enable_state?: 'all' | 'enabled' | 'disabled';
}

/**
 * 获取酒馆正则
 *
 * @param option 可选选项
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 `TavernRegex`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 */
function getTavernRegexes({ scope, enable_state }?: GetTavernRegexesOption): TavernRegex[];

interface ReplaceTavernRegexesOption {
  scope?: 'all' | 'global' | 'character';
}

/**
 * 完全替换酒馆正则为 `regexes`.
 * - **这是一个很慢的操作!** 尽量对正则做完所有事后再一次性 replaceTavernRegexes.
 * - **为了重新应用正则, 它会重新载入整个聊天消息**, 将会触发 `tavern_events.CHAT_CHANGED` 进而重新加载楼层消息.
 *
 * 之所以提供这么直接的函数, 是因为你可能需要调换正则顺序等.
 *
 * @param regexes 要用于替换的酒馆正则
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 */
function replaceTavernRegexes(regexes: TavernRegex[], { scope }: ReplaceTavernRegexesOption): Promise<void>;

type TavernRegexUpdater =
  | ((regexes: TavernRegex[]) => TavernRegex[])
  | ((regexes: TavernRegex[]) => Promise<TavernRegex[]>);

/**
 * 用 `updater` 函数更新酒馆正则
 *
 * @param updater 用于更新酒馆正则的函数. 它应该接收酒馆正则作为参数, 并返回更新后的酒馆正则.
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 *
 * @returns 更新后的酒馆正则
 *
 * @example
 * // 开启所有名字里带 "舞台少女" 的正则
 * await updateTavernRegexesWith(regexes => {
 *   regexes.forEach(regex => {
 *     if (regex.script_name.includes('舞台少女')) {
 *       regex.enabled = true;
 *     }
 *   });
 *   return regexes;
 * });
 */
function updateTavernRegexesWith(
  updater: TavernRegexUpdater,
  option?: ReplaceTavernRegexesOption,
): Promise<TavernRegex[]>;
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
function substitudeMacros(text: string): string;

/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
function getLastMessageId(): number;

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
function errorCatched<T extends any[], U>(fn: (...args: T) => U): (...args: T) => U;
interface VariableOption {
  /**
   * 对某一楼层的聊天变量 (`message`)、聊天变量 (`'chat'`)、角色卡变量 (`'character'`)、聊天变量 (`'script'`) 或全局变量 (`'global'`) 进行操作, 默认为 `'chat'`
   */
  type?: 'message' | 'chat' | 'character' | 'script' | 'global';

  /**
   * 当 `type` 为 `'message'` 时, 该参数指定要获取变量的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
   */
  message_id?: number | 'latest';

  /**
   * 当 `type` 为 `'script'` 时, 该参数指定要获取变量的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
   */
  script_id?: string;
}

/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 变量表
 *
 * @example
 * // 获取所有聊天变量并弹窗输出结果
 * const variables = getVariables({type: 'chat'});
 * alert(variables);
 *
 * @example
 * // 获取所有全局变量
 * const variables = getVariables({type: 'global'});
 * // 酒馆助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
 * if (_.has(variables, "神乐光.好感度")) {
 *   ...
 * }
 *
 * @example
 * // 获取倒数第二楼层的聊天变量
 * const variables = getVariables({type: 'message', message_id: -2});
 *
 * @example
 * // 在脚本内获取该脚本绑定的变量
 * const variables = getVariables({type: 'script', script_id: getScriptId()});
 */
function getVariables({ type, message_id, script_id }?: VariableOption): Record<string, any>;

/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为酒馆助手内置了 lodash 库:
 *   `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @example
 * // 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * let variables = getVariables();
 * _.unset(variables, "神乐光.好感度");
 * await replaceVariables(variables);
 *
 * @example
 * // 在脚本内替换该脚本绑定的变量
 * await replaceVariables({神乐光: {好感度: 5, 认知度: 0}}, {type: 'script', script_id: getScriptId()});
 */
async function replaceVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<void>;

type VariablesUpdater =
  | ((variables: Record<string, any>) => Record<string, any>)
  | ((variables: Record<string, any>) => Promise<Record<string, any>>);

/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 更新后的变量表
 *
 * @example
 * // 删除 `{神乐光: {好感度: 5}}` 变量
 * await updateVariablesWith(variables => {_.unset(variables, "神乐光.好感度"); return variables;});
 *
 * @example
 * // 更新 "爱城华恋.好感度" 为原来的 2 倍, 如果该变量不存在则设置为 0
 * await updateVariablesWith(variables => _.update(variables, "爱城华恋.好感度", value => value ? value * 2 : 0));
 */
async function updateVariablesWith(
  updater: VariablesUpdater,
  { type, message_id, script_id }?: VariableOption,
): Promise<Record<string, any>>;

/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertOrAssignVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<void>;

/**
 * 插入新变量, 如果变量已经存在则什么也不做
 *
 * @param variables 要插入的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则什么也不做
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 5}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertVariables(
  variables: Record<string, any>,
  { type, message_id, script_id }?: VariableOption,
): Promise<void>;

/**
 * 删除变量, 如果变量不存在则什么也不做
 *
 * @param variable_path 要删除的变量路径
 *   - 如果变量不存在, 则什么也不做
 *   - 如果变量已经存在, 则删除该变量
 * @param option 可选选项
 *   - `type?:'message'|'chat'|'character'|'global'`: 对某一楼层的聊天变量 (`message`)、聊天变量表 (`'chat'`)、角色卡变量 (`'character'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *   - `message_id?:number|'latest'`: 当 `type` 为 `'message'` 时, 该参数指定要获取的消息楼层号, 如果为负数则为深度索引, 例如 `-1` 表示获取最新的消息楼层; 默认为 `'latest'`
 *   - `script_id?:string`: 当 `type` 为 `'script'` 时, 该参数指定要获取的脚本 ID; 如果在脚本内调用, 则你可以用 `getScriptId()` 获取该脚本 ID
 *
 * @returns 是否成功删除变量
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await deleteVariable("爱城华恋.好感度");
 * // 执行后变量: `{爱城华恋: {}}`
 */
async function deleteVariable(
  variable_path: string,
  { type, message_id, script_id }?: VariableOption,
): Promise<boolean>;
/**
 * 获取酒馆助手版本号
 */
async function getTavernHelperVersion(): Promise<string>;

/**
 * 更新酒馆助手
 */
async function updateTavernHelper(): Promise<boolean>;
/**
 * 事件可以是
 * - `iframe_events` 中的 iframe 事件
 * - `tavern_events` 中的酒馆事件
 * - 自定义的字符串事件
 */
type EventType = IframeEventType | TavernEventType | string;

/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * function hello() { alert("hello"); }
 * eventOn(要监听的事件, hello);
 *
 * @example
 * // 消息被修改时监听是哪一条消息被修改
 * // 能这么做是因为酒馆 MESSAGE_UPDATED 会发送消息 id 回来, 但是这个发送太自由了, 我还没整理出每种消息会发送什么
 * function detectMessageUpdated(message_id) {
 *   alert(`你刚刚修改了第 ${message_id} 条聊天消息对吧😡`);
 * }
 * eventOn(tavern_events.MESSAGE_UPDATED, detectMessageUpdated);
 */
function eventOn<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 让 `listener` 监听 `event_type`, 按下脚本库中附加了按钮的脚本时自动运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * function hello() { alert("hello"); }
 * eventOnButton(对应的按钮名称, hello);
 */
function eventOnButton<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最后运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最后运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整到最后运行的函数
 *
 * @example
 * eventMakeLast(要监听的事件, 要注册的函数);
 */
function eventMakeLast<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最先运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最先运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整为最先运行的函数
 *
 * @example
 * eventMakeFirst(要监听的事件, 要注册的函数);
 */
function eventMakeFirst<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 让 `listener` 仅监听下一次 `event_type`, 当该次事件发生时运行 `listener`, 此后取消监听.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * eventOnce(要监听的事件, 要注册的函数);
 */
function eventOnce<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 等待一次 `event_type` 事件
 *
 * @param event_type 要等待的事件
 *
 * @example
 * await eventWaitOnce(tavern_events.MESSAGE_DELETED);
 */
async function eventWaitOnce(event_type: EventType): Promise<any | undefined>;

/**
 * 等待 `listener` 监听到一次 `event_type` 且执行完成, 返回 `listener` 的执行结果
 *
 * 如果填入 `listener`, 则在调用本函数前 `listener` 必须已经在监听 `event_type`
 *
 * @param event_type `listener` 在监听的事件
 * @param listener 已经在监听 `event_type` 的函数
 *
 * @returns  `listener` 得到的结果
 *
 * @example
 * eventOnce("存档", save);
 * await eventWaitOnce("存档", save);
 */
async function eventWaitOnce<T extends EventType>(event_type: T, listener: ListenerType[T]): Promise<any | undefined>;

/**
 * 发送 `event_type` 事件, 同时可以发送一些数据 `data`.
 *
 * 所有正在监听 `event_type` 消息频道的都会收到该消息并接收到 `data`.
 *
 * @param event_type 要发送的事件
 * @param data 要随着事件发送的数据
 *
 * @example
 * // 发送 "角色阶段更新完成" 事件, 所有监听该事件的 `listener` 都会被运行
 * eventEmit("角色阶段更新完成");
 *
 * @example
 * // 发送 "存档" 事件, 并等待所有 `listener` (也许是负责存档的函数) 执行完毕后才继续
 * await eventEmit("存档");
 *
 * @example
 * // 发送时携带数据 ["你好", 0]
 * eventEmit("事件", "你好", 0);
 */
async function eventEmit<T extends EventType>(event_type: T, ...data: Parameters<ListenerType[T]>): Promise<void>;

/**
 * 携带 `data` 而发送 `event_type` 事件并等待事件处理结束.
 *
 * @param event_type 要发送的事件
 * @param data 要随着事件发送的数据
 */
function eventEmitAndWait<T extends EventType>(event_type: T, ...data: Parameters<ListenerType[T]>): void

/**
 * 让 `listener` 取消对 `event_type` 的监听.
 *
 * - 如果 `listener` 没有监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要取消注册的函数
 *
 * @example
 * eventRemoveListener(要监听的事件, 要取消注册的函数);
 */
function eventRemoveListener<T extends EventType>(event_type: T, listener: ListenerType[T]): void;

/**
 * 取消本 iframe 中对 `event_type` 的所有监听
 *
 * @param event_type 要取消监听的事件
 */
function eventClearEvent(event_type: EventType): void;

/**
 * 取消本 iframe 中 `listener` 的的所有监听
 *
 * @param listener 要取消注册的函数
 */
function eventClearListener(listener: Function): void;

/**
 * 取消本 iframe 中对所有事件的所有监听
 */
function eventClearAll(): void;

//------------------------------------------------------------------------------------------------------------------------
// 以下是可用的事件, 你可以发送和监听它们

type IframeEventType = (typeof iframe_events)[keyof typeof iframe_events];

// iframe 事件
const iframe_events = {
  MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
  /** `generate` 函数开始生成 */
  GENERATION_STARTED: 'js_generation_started',
  /** 启用流式传输的 `generate` 函数传输当前完整文本: "这是", "这是一条", "这是一条流式传输" */
  STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully',
  /** 启用流式传输的 `generate` 函数传输当前增量文本: "这是", "一条", "流式传输" */
  STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally',
  /** `generate` 函数完成生成 */
  GENERATION_ENDED: 'js_generation_ended',
} as const;

type TavernEventType = (typeof tavern_events)[keyof typeof tavern_events];

// 酒馆事件. **不建议自己发送酒馆事件, 因为你并不清楚它需要发送什么数据**
const tavern_events = {
  APP_READY: 'app_ready',
  EXTRAS_CONNECTED: 'extras_connected',
  MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_UPDATED: 'message_updated',
  MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
  IMPERSONATE_READY: 'impersonate_ready',
  CHAT_CHANGED: 'chat_id_changed',
  GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
  GENERATION_STARTED: 'generation_started',
  GENERATION_STOPPED: 'generation_stopped',
  GENERATION_ENDED: 'generation_ended',
  EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
  EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
  SETTINGS_LOADED: 'settings_loaded',
  SETTINGS_UPDATED: 'settings_updated',
  GROUP_UPDATED: 'group_updated',
  MOVABLE_PANELS_RESET: 'movable_panels_reset',
  SETTINGS_LOADED_BEFORE: 'settings_loaded_before',
  SETTINGS_LOADED_AFTER: 'settings_loaded_after',
  CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed',
  CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',
  OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before',
  OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',
  OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready',
  OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',
  WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated',
  WORLDINFO_UPDATED: 'worldinfo_updated',
  CHARACTER_EDITED: 'character_edited',
  CHARACTER_PAGE_LOADED: 'character_page_loaded',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE: 'character_group_overlay_state_change_before',
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER: 'character_group_overlay_state_change_after',
  USER_MESSAGE_RENDERED: 'user_message_rendered',
  CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
  FORCE_SET_BACKGROUND: 'force_set_background',
  CHAT_DELETED: 'chat_deleted',
  CHAT_CREATED: 'chat_created',
  GROUP_CHAT_DELETED: 'group_chat_deleted',
  GROUP_CHAT_CREATED: 'group_chat_created',
  GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',
  GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
  GENERATE_AFTER_DATA: 'generate_after_data',
  GROUP_MEMBER_DRAFTED: 'group_member_drafted',
  WORLD_INFO_ACTIVATED: 'world_info_activated',
  TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',
  CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
  CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',
  CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
  // TODO: Naming convention is inconsistent with other events
  CHARACTER_DELETED: 'characterDeleted',
  CHARACTER_DUPLICATED: 'character_duplicated',
  STREAM_TOKEN_RECEIVED: 'stream_token_received',
  FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
  WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
  OPEN_CHARACTER_LIBRARY: 'open_character_library',
  ONLINE_STATUS_CHANGED: 'online_status_changed',
  IMAGE_SWIPED: 'image_swiped',
  CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
  TOOL_CALLS_PERFORMED: 'tool_calls_performed',
  TOOL_CALLS_RENDERED: 'tool_calls_rendered',
} as const;

type ListenerType = {
  [iframe_events.MESSAGE_IFRAME_RENDER_STARTED]: (iframe_name: string) => void;
  [iframe_events.MESSAGE_IFRAME_RENDER_ENDED]: (iframe_name: string) => void;
  [iframe_events.GENERATION_STARTED]: () => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_FULLY]: (full_text: string) => void;
  [iframe_events.STREAM_TOKEN_RECEIVED_INCREMENTALLY]: (incremental_text: string) => void;
  [iframe_events.GENERATION_ENDED]: (text: string) => void;

  [tavern_events.APP_READY]: () => void;
  [tavern_events.EXTRAS_CONNECTED]: (modules: any) => void;
  [tavern_events.MESSAGE_SWIPED]: (message_id: number) => void;
  [tavern_events.MESSAGE_SENT]: (message_id: number) => void;
  [tavern_events.MESSAGE_RECEIVED]: (message_id: number) => void;
  [tavern_events.MESSAGE_EDITED]: (message_id: number) => void;
  [tavern_events.MESSAGE_DELETED]: (message_id: number) => void;
  [tavern_events.MESSAGE_UPDATED]: (message_id: number) => void;
  [tavern_events.MESSAGE_FILE_EMBEDDED]: (message_id: number) => void;
  [tavern_events.IMPERSONATE_READY]: (message: string) => void;
  [tavern_events.CHAT_CHANGED]: (chat_file_name: string) => void;
  [tavern_events.GENERATION_AFTER_COMMANDS]: (
    type: string,
    option: {
      automatic_trigger?: boolean;
      force_name2?: boolean;
      quiet_prompt?: string;
      quietToLoud?: boolean;
      skipWIAN?: boolean;
      force_chid?: number;
      signal?: AbortSignal;
      quietImage?: string;
      quietName?: string;
      depth?: number;
    },
    dry_run: boolean,
  ) => void;
  [tavern_events.GENERATION_STARTED]: (
    type: string,
    option: {
      automatic_trigger?: boolean;
      force_name2?: boolean;
      quiet_prompt?: string;
      quietToLoud?: boolean;
      skipWIAN?: boolean;
      force_chid?: number;
      signal?: AbortSignal;
      quietImage?: string;
      quietName?: string;
      depth?: number;
    },
    dry_run: boolean,
  ) => void;
  [tavern_events.GENERATION_STOPPED]: () => void;
  [tavern_events.GENERATION_ENDED]: (message_id: number) => void;
  [tavern_events.EXTENSIONS_FIRST_LOAD]: () => void;
  [tavern_events.EXTENSION_SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_LOADED]: () => void;
  [tavern_events.SETTINGS_UPDATED]: () => void;
  [tavern_events.GROUP_UPDATED]: () => void;
  [tavern_events.MOVABLE_PANELS_RESET]: () => void;
  [tavern_events.SETTINGS_LOADED_BEFORE]: (settings: Object) => void;
  [tavern_events.SETTINGS_LOADED_AFTER]: (settings: Object) => void;
  [tavern_events.CHATCOMPLETION_SOURCE_CHANGED]: (source: string) => void;
  [tavern_events.CHATCOMPLETION_MODEL_CHANGED]: (model: string) => void;
  [tavern_events.OAI_PRESET_CHANGED_BEFORE]: (result: {
    preset: Object;
    presetName: string;
    settingsToUpdate: Object;
    settings: Object;
    savePreset: Function;
  }) => void;
  [tavern_events.OAI_PRESET_CHANGED_AFTER]: () => void;
  [tavern_events.OAI_PRESET_EXPORT_READY]: (preset: Object) => void;
  [tavern_events.OAI_PRESET_IMPORT_READY]: (result: { data: Object; presetName: string }) => void;
  [tavern_events.WORLDINFO_SETTINGS_UPDATED]: () => void;
  [tavern_events.WORLDINFO_UPDATED]: (name: string, data: { entries: Object[] }) => void;
  [tavern_events.CHARACTER_EDITED]: (result: { detail: { id: string; character: Object } }) => void;
  [tavern_events.CHARACTER_PAGE_LOADED]: () => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE]: (state: number) => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER]: (state: number) => void;
  [tavern_events.USER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.CHARACTER_MESSAGE_RENDERED]: (message_id: number) => void;
  [tavern_events.FORCE_SET_BACKGROUND]: (background: { url: string; path: string }) => void;
  [tavern_events.CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.CHAT_CREATED]: () => void;
  [tavern_events.GROUP_CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.GROUP_CHAT_CREATED]: () => void;
  [tavern_events.GENERATE_BEFORE_COMBINE_PROMPTS]: () => void;
  [tavern_events.GENERATE_AFTER_COMBINE_PROMPTS]: (result: { prompt: string; dryRun: boolean }) => void;
  [tavern_events.GENERATE_AFTER_DATA]: (generate_data: Object) => void;
  [tavern_events.GROUP_MEMBER_DRAFTED]: (character_id: string) => void;
  [tavern_events.WORLD_INFO_ACTIVATED]: (entries: any[]) => void;
  [tavern_events.TEXT_COMPLETION_SETTINGS_READY]: () => void;
  [tavern_events.CHAT_COMPLETION_SETTINGS_READY]: (generate_data: {
    messages: { role: string; content: string }[];
    model: string;
    temprature: number;
    frequency_penalty: number;
    presence_penalty: number;
    top_p: number;
    max_tokens: number;
    stream: boolean;
    logit_bias: Object;
    stop: string[];
    chat_comletion_source: string;
    n?: number;
    user_name: string;
    char_name: string;
    group_names: string[];
    include_reasoning: boolean;
    reasoning_effort: string;
    [others: string]: any;
  }) => void;
  [tavern_events.CHAT_COMPLETION_PROMPT_READY]: (event_data: {
    chat: { role: string; content: string }[];
    dryRun: boolean;
  }) => void;
  [tavern_events.CHARACTER_FIRST_MESSAGE_SELECTED]: (event_args: {
    input: string;
    output: string;
    character: Object;
  }) => void;
  [tavern_events.CHARACTER_DELETED]: (result: { id: string; character: Object }) => void;
  [tavern_events.CHARACTER_DUPLICATED]: (result: { oldAvatar: string; newAvatar: string }) => void;
  [tavern_events.STREAM_TOKEN_RECEIVED]: (text: string) => void;
  [tavern_events.FILE_ATTACHMENT_DELETED]: (url: string) => void;
  [tavern_events.WORLDINFO_FORCE_ACTIVATE]: (entries: Object[]) => void;
  [tavern_events.OPEN_CHARACTER_LIBRARY]: () => void;
  [tavern_events.ONLINE_STATUS_CHANGED]: () => void;
  [tavern_events.IMAGE_SWIPED]: (result: {
    message: Object;
    element: JQuery<HTMLElement>;
    direction: 'left' | 'right';
  }) => void;
  [tavern_events.CONNECTION_PROFILE_LOADED]: (profile_name: string) => void;
  [tavern_events.TOOL_CALLS_PERFORMED]: (tool_invocations: Object[]) => void;
  [tavern_events.TOOL_CALLS_RENDERED]: (tool_invocations: Object[]) => void;
  [custom_event: string]: (...args: any) => any;
};
/**
 * 提示词模板语法插件所提供的额外功能, 必须额外安装提示词模板语法插件, 具体内容见于 https://github.com/zonde306/ST-Prompt-Template
 * 你也可以在酒馆页面按 f12,在控制台中输入 `window.EjsTemplate` 来查看当前提示词模板语法所提供的接口
 */
const EjsTemplate: {
  /**
   * 对文本进行模板语法处理
   * @note `context` 一般从 `prepareContext` 获取, 若要修改则应直接修改原始对象
   *
   * @param code 模板代码
   * @param context 执行环境 (上下文)
   * @param options ejs 参数
   * @returns 对模板进行计算后的内容
   *
   * @example
   * // 使用提示词模板语法插件提供的函数创建一个临时的酒馆正则, 对消息楼层进行一次处理
   * await EjsTemplate.evalTemplate('<%_ await activateRegex(/<thinking>.*?<\/thinking>/gs, '') _%>')
   *
   * @example
   * const env    = await EjsTemplate.prepareContext({ a: 1 });
   * const result = await EjsTemplate.evalTemplate('a is <%= a _%>', env);
   * => result === 'a is 1'
   * // 但这种用法更推荐用 _.template 来做, 具体见于 https://lodash.com/docs/4.17.15#template
   * const compiled = _.template('hello <%= user %>!');
   * const result   = compiled({ 'user': 'fred' });;
   * => result === 'hello user!'
   */
  evaltemplate: (code: string, context: Record<string, any> = {}, options: Record<string, any> = {}) => Promise<string>;

  /**
   * 创建模板语法处理使用的执行环境 (上下文)
   *
   * @param additional_context 附加的执行环境 (上下文)
   * @param last_message_id 合并消息变量的最大 ID
   * @returns 执行环境 (上下文)
   */
  prepareContext: (
    additional_context: Record<string, any> = {},
    last_message_id: number = 65535,
  ) => Promise<Record<string, any>>;

  /**
   * 检查模板是否存在语法错误
   * 并不会实际执行
   *
   * @param content 模板代码
   * @param output_line_count 发生错误时输出的附近行数
   * @returns 语法错误信息, 无错误返回空字符串
   */
  getSyntaxErrorInfo: (code: string, output_line_count: number = 4) => Promise<string>;

  /**
   * 获取全局变量、聊天变量、消息楼层变量的并集
   *
   * @param end_message_id 要合并的消息楼层变量最大楼层数
   * @returns 合并后的变量
   */
  allVariables: (end_message_id?: number) => Record<string, any>;

  /**
   * 设置提示词模板语法插件的设置
   *
   * @param features 设置
   */
  setFeatures: (
    features: Partial<{
      enabled: boolean;
      generate_enabled: boolean;
      generate_loader_enabled: boolean;
      render_enabled: boolean;
      render_loader_enabled: boolean;
      with_context_disabled: boolean;
      debug_enabled: boolean;
      autosave_enabled: boolean;
      preload_worldinfo_enabled: boolean;
      code_blocks_enabled: boolean;
      world_active_enabled: boolean;
      raw_message_evaluation_enabled: boolean;
      filter_message_enabled: boolean;
      cache_enabled: boolean;
    }>,
  ) => void;

  /**
   * 重置提示词模板语法插件的设置
   */
  resetFeatures: () => void;
};
namespace SillyTavern {
  interface ChatMessage {
    message_id: number;
    name: string;
    /**
     * 实际的 role 为:
     * - 'system': extra?.type === 'narrator' && !is_user
     * - 'user': extra?.type !== 'narrator' && is_user
     * - 'assistant': extra?.type !== 'narrator' && !is_user
     */
    is_user: boolean;
    /**
     * 实际是表示消息是否被隐藏不会发给 llm
     */
    is_system: boolean;
    mes: string;
    swipe_id?: number;
    swipes?: string[];
    variables?: Record<string, any>[];
    extra?: Record<string, any>;
  }
}

/**
 * 酒馆提供给插件的稳定接口, 具体内容见于 SillyTavern/public/scripts/st-context.js 或 https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/st-context.js
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.SillyTavern.getContext()` 来查看当前酒馆所提供的接口
 */
const SillyTavern: {
  readonly accountStorage: any;
  readonly chat: Array<SillyTavern.ChatMessage>;
  readonly characters: any;
  readonly groups: any;
  readonly name1: any;
  readonly name2: any;
  /* this_chid */
  readonly characterId: any;
  readonly groupId: any;
  readonly chatId: any;
  readonly getCurrentChatId: () => any;
  readonly getRequestHeaders: () => {
    'Content-Type': string;
    'X-CSRF-TOKEN': string;
  };
  readonly reloadCurrentChat: () => Promise<void>;
  readonly renameChat: (old_name: string, new_name: string) => Promise<void>;
  readonly saveSettingsDebounced: () => Promise<void>;
  readonly onlineStatus: string;
  readonly maxContext: number;
  /** chat_metadata */
  readonly chatMetadata: Record<string, any>;
  readonly streamingProcessor: any;
  readonly eventSource: {
    on: typeof eventOn,
    makeLast: typeof eventMakeLast,
    makeFirst: typeof eventMakeFirst,
    removeListener: typeof eventRemoveListener,
    emit: typeof eventEmit,
    emitAndWait: typeof eventEmitAndWait,
    once: typeof eventOnce,
  };
  readonly eventTypes: typeof tavern_events;
  readonly addOneMessage: (mes: object, options: any) => Promise<void>;
  readonly deleteLastMessage: () => Promise<void>;
  readonly generate: Function;
  readonly sendStreamingRequest: (type: string, data: object) => Promise<void>;
  readonly sendGenerationRequest: (type: string, data: object) => Promise<void>;
  readonly stopGeneration: () => boolean;
  readonly tokenizers: any;
  readonly getTextTokens: (tokenizer_type: number, string: string) => Promise<void>;
  readonly getTokenCountAsync: (string: string, padding?: number | undefined) => Promise<void>;
  readonly extensionPrompts: any;
  readonly setExtensionPrompt: (
    key: string,
    value: string,
    position: number,
    depth: number,
    scan?: boolean,
    role?: number,
    filter?: () => Promise<boolean> | boolean,
  ) => Promise<void>;
  readonly updateChatMetadata: (new_values: any, reset: boolean) => void;
  readonly saveChat: () => Promise<void>;
  readonly openCharacterChat: (file_name: any) => Promise<void>;
  readonly openGroupChat: (group_id: any, chat_id: any) => Promise<void>;
  readonly saveMetadata: () => Promise<void>;
  readonly sendSystemMessage: (type: any, text: any, extra?: any) => Promise<void>;
  readonly activateSendButtons: () => void;
  readonly deactivateSendButtons: () => void;
  readonly saveReply: (options: any, ...args: any[]) => Promise<void>;
  readonly substituteParams: (
    content,
    name1?: string,
    name2?: string,
    original?: string,
    group?: string,
    replace_character_card?: boolean,
    additional_macro: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly substituteParamsExtended: (
    content: string,
    additional_macro?: Record<string, any>,
    post_process_function?: (text: string) => string,
  ) => Promise<void>;
  readonly SlashCommandParser: Type;
  readonly SlashCommand: Type;
  readonly SlashCommandArgument: Type;
  readonly SlashCommandNamedArgument: Type;
  readonly ARGUMENT_TYPE: {
    STRING: string;
    NUMBER: string;
    RANGE: string;
    BOOLEAN: string;
    VARIABLE_NAME: string;
    CLOSURE: string;
    SUBCOMMAND: string;
    LIST: string;
    DICTIONARY: string;
  };
  readonly executeSlashCommandsWithOptions: (text: string, options?: any) => Promise<void>;
  readonly timestampToMoment: (timestamp: string | number) => any;
  readonly registerMacro: (key: string, value: string | ((text: string) => string), description?: string) => void;
  readonly unregisterMacro: (key: string) => void;
  readonly registerFunctionTool: (options: any, ...args: any[]) => void;
  readonly unregisterFunctionTool: (name: string) => void;
  readonly isToolCallingSupported: () => boolean;
  readonly canPerformToolCalls: (type: string) => boolean;
  readonly ToolManager: Type;
  readonly registerDebugFunction: (function_id: string, name: string, description: string, fn: Function) => void;
  readonly renderExtensionTemplateAsync: (
    extension_name: string,
    template_id: string,
    template_data?: object,
    sanitize?: boolean,
    localize?: boolean,
  ) => Promise<string>;
  readonly registerDataBankScraper: (scraper: any) => Promise<void>;
  readonly callGenericPopup: (
    content: JQuery<HTMLElement> | string | Element,
    type: number,
    inputValue?: string,
    popupOptions?: any,
  ) => Promise<number | string | boolean | undefined>;
  readonly showLoader: () => void;
  readonly hideLoader: () => Promise<any>;
  readonly mainApi: any;
  readonly extensionSettings: Record<string, any>;
  readonly ModuleWorkerWrapper: Type;
  readonly getTokenizerModel: () => string;
  readonly generateQuietPrompt: () => (
    quiet_prompt: string,
    quiet_to_loud: boolean,
    skip_wian: boolean,
    quiet_iamge?: string,
    quiet_name?: string,
    response_length?: number,
    force_chid?: number,
  ) => Promise<string>;
  readonly writeExtensionField: (character_id: number, key: string, value: any) => Promise<void>;
  readonly getThumbnailUrl: (type: any, file: any) => string;
  readonly selectCharacterById: (id: number, { switchMenu }?: { switchMenu?: boolean }) => Promise<void>;
  readonly messageFormatting: (
    message: string,
    ch_name: string,
    is_system: boolean,
    is_user: boolean,
    message_id: number,
    sanitizerOverrides?: object,
    isReasoning?: boolean,
  ) => string;
  readonly shouldSendOnEnter: () => boolean;
  readonly isMobile: () => boolean;
  readonly t: (strings: string, ...values: any[]) => string;
  readonly translate: (text: string, key?: string | null) => string;
  readonly getCurrentLocale: () => string;
  readonly addLocaleData: (localeId: string, data: Record<string, string>) => void;
  readonly tags: any[];
  readonly tagMap: {
    [identifier: string]: string[];
  };
  readonly menuType: any;
  readonly createCharacterData: record<string, any>;
  readonly Popup: Type;
  readonly POPUP_TYPE: {
    TEXT: number;
    CONFIRM: number;
    INPUT: number;
    DISPLAY: number;
    CROP: number;
  };
  readonly POPUP_RESULT: {
    AFFIRMATIVE: number;
    NEGATIVE: number;
    CANCELLED: any;
    CUSTOM1: number;
    CUSTOM2: number;
    CUSTOM3: number;
    CUSTOM4: number;
    CUSTOM5: number;
    CUSTOM6: number;
    CUSTOM7: number;
    CUSTOM8: number;
    CUSTOM9: number;
  };
  /** oai_settings */
  readonly chatCompletionSettings: any;
  /** textgenerationwebui_settings */
  readonly textCompletionSettings: any;
  /** power_user */
  readonly powerUserSettings: any;
  readonly getCharacters: () => Promise<void>;
  readonly getCharacterCardFields: ({ chid }?: { chid?: number }) => any;
  readonly uuidv4: () => string;
  readonly humanizedDateTime: () => string;
  readonly updateMessageBlock: (
    message_id: number,
    message: object,
    { rerenderMessage }?: { rerenderMessage?: boolean },
  ) => void;
  readonly appendMediaToMessage: (mes: object, messageElement: JQuery<HTMLElement>, adjust_scroll?: boolean) => void;

  readonly loadWorldInfo: (name: string) => Promise<any | null>;
  readonly saveWorldInfo: (name: string, data: any, immediately?: boolean) => Promise<void>;
  /** reloadEditor */
  readonly reloadWorldInfoEditor: (file: string, loadIfNotSelected?: boolean) => void;
  readonly updateWorldInfoList: () => Promise<void>;
  readonly convertCharacterBook: (character_book: any) => {
    entries: Record<string, any>;
    originalData: Record<string, any>;
  };
  readonly getWorldInfoPrompt: (
    chat: string[],
    max_context: number,
    is_dry_run: boolean,
  ) => Promise<{
    worldInfoString: string;
    worldInfoBefore: string;
    worldInfoAfter: string;
    worldInfoExamples: any[];
    worldInfoDepth: any[];
    anBefore: any[];
    anAfter: any[];
  }>;
  readonly CONNECT_API_MAP: Record<string, any>;
  readonly getTextGenServer: (type?: string) => string;
  readonly extractMessageFromData: (data: object, activateApi?: string) => string;
  readonly getPresetManager: (apiId?: string) => any;
  readonly getChatCompletionModel: (source?: string) => string;
  readonly printMessages: () => Promise<void>;
  readonly clearChat: () => Promise<void>;
  readonly ChatCompletionService: Type;
  readonly TextCompletionService: Type;
  readonly ConnectionManagerRequestService: Type;
  readonly updateReasoningUI: (
    message_id_or_element: number | JQuery<HTMLElement> | HTMLElement,
    { reset }?: { reset?: boolean },
  ) => void;
  readonly parseReasoningFromString: (string: string, { strict }?: { strict?: boolean }) => any | null;
  readonly unshallowCharacter: (character_id?: string) => Promise<void>;
  readonly unshallowGroupMembers: (group_id: string) => Promise<void>;
  readonly symbols: {
    ignore: IGNORE_SYMBOL;
  };
};
/**
 * 酒馆助手提供的额外功能, 具体内容见于 https://n0vi028.github.io/JS-Slash-Runner-Doc
 * 你也可以在酒馆页面按 f12, 在控制台中输入 `window.TavernHelper` 来查看当前酒馆助手所提供的接口
 */
const TavernHelper: typeof window.TavernHelper;
/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-iframe-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-iframe-脚本名称`; 对于脚本库是 `tavern-helper-script-脚本名称`
 */
function getIframeName(): string;

/**
 * 获取脚本的脚本库 id, **只能在脚本内使用**
 *
 * @returns 脚本库的 id
 */
function getScriptId(): string;

/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
 */
function getCurrentMessageId(): number;

/**
 * 从消息楼层 iframe 的 `iframe_name` 获取它所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @param iframe_name 消息楼层 iframe 的名称
 * @returns 楼层 id
 */
function getMessageId(iframe_name: string): number;
