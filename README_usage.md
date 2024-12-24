# 使用方法

## 在哪使用?

### 在楼层消息中使用

使用代码块包裹需要渲染的代码部分即可进行渲染; 如果代码块中没有同时存在 `<body>` 和 `</body>` 标签, 则不进行渲染.

````html
```
<html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f0f0f0;
        margin: 0;
        padding: 20px;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <h1>欢迎使用脚本注入功能！</h1>
    <button onclick="showMessage()">点击我</button>
    <script>
      function showMessage() {
        alert("你点击了按钮！");
      }
    </script>
  </body>
</html>
```
````

`<body>` 标签的父容器宽度已设定为聊天框的宽度, 即对于 `<body>` 的宽度设定为 `width:50%` 时, 将使其宽度以及 iframe 的宽度设定为聊天框的一半. 你还可以使用`var(--parent-width)` 来基于聊天框宽度设定样式.

### 全局脚本

在正则中新建一个 `脚本-你想要的脚本名称` 正则 (如果有多个脚本, 名字不要重复), 然后你就能在正则的替换区域中填写你想要的脚本内容.

![全局脚本示例](README_usage_全局脚本.png)

注意:

- 该脚本将会在切换聊天时被执行: 关闭聊天, 正则被开关或修改, 新建聊天, 切换角色卡... 总之玩家每次游玩的最开始时必然会触发该脚本. 具体什么时候执行很难说, **因此建议不要直接执行你要做的事情**, 而是用 [监听酒馆事件](#监听酒馆事件) 的方法来在某些酒馆事件发生时执行该脚本内容.
- 为了加载效率, 多脚本的加载是同时进行的, 如果需要一个脚本后于另一个脚本加载, 你应该使用 [消息频道](#消息频道) 让那个脚本等待.
- **不同正则下的脚本代码并不共享**, 如果非要拆分放在不同正则, 你需要使用 [消息频道](#消息频道) 进行通讯和数据传递.
- 脚本虽然被写在正则中, 但实际并没有作为正则使用, 只是为了利用局部正则能和角色卡一起导出这一点, 因此正则的具体设置对于脚本并没有意义. 唯一支持的选项是开关正则来开关脚本.

## 怎么用最好?

[基于前端助手编写角色卡的 VSCode 环境配置](https://sillytavern-stage-girls-dog.readthedocs.io/tool_and_experience/js_slash_runner/index.html)

## 脚本代码功能

### Quick Reply 触发

我们可以在嵌入的 iframe 中执行 SillyTavern 内部的 Slash 命令 (斜杠命令), 如 `/run`、`/echo` 等.

#### `triggerSlash(commandText)`

```typescript
/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param commandText 要运行的 Slash 命令
 * 
 * @example
 * // 在酒馆界面弹出提示语 `hello!`
 * triggerSlash('/echo hello!');
 */
function triggerSlash(commandText: string): void
```

#### `triggerSlashWithResult(commandText)`

```typescript
/**
 * 运行 Slash 命令, 并返回命令管道的结果
 *
 * @param commandText 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 * 
 * @example
 * // 获取当前聊天消息最后一条消息对应的 id
 * const last_message_id = await triggerSlashWithResult('/pass {{lastMessageId}}');
 */
function triggerSlashWithResult(commandText: string): Promise<string | undefined>
```

### 变量操作

扩展提供了两个函数用于获取和设置 SillyTavern 中绑定到聊天的局部变量, 这两个函数分别是 `getVariables()` 和 `setVariables()`. 这些函数允许 `iframe` 中的脚本与主页面进行交互, 从而实现持久化的状态管理.

#### `getVariables()`

```typescript
/**
 * 获取所有聊天变量
 *
 * @returns 所有聊天变量
 * 
 * @example
 * // 获取所有变量并弹窗输出结果
 * const variables = await getVariables();
 * alert(variables);
 */
async function getVariables(): Promise<Object> 
```

#### `setVariables(newVariables)`

```typescript
/**
 * 用 `newVaraibles` 更新聊天变量
 * 
 * - 如果键名一致, 则更新值
 * - 如果不一致, 则新增变量
 *
 * @param newVariables 要更新的变量
 * 
 * @example
 * const newVariables = { theme: "dark", userInfo: { name: "Alice", age: 30} };
 * setVariables(newVariables);
 */
function setVariables(newVariables: Object): void
```

### 楼层消息操作

#### 获取楼层消息

酒馆虽然提供了 `/messages` 命令, 但是它获取的是一整个字符串, 并且不能获取楼层当前没在使用的消息 (点击箭头切换的那个 swipe 消息, 在前端助手中我们称之为 "消息页"), 前端助手为此提供了一个函数获取更便于处理的消息.

其获取到的结果是一个数组, 数组的元素类型为 `ChatMessage`, 有以下内容:

```typescript
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
```

具体函数为:

```typescript
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
function getChatMessages(range: string | number, option: GetChatMessagesOption = {}): Promise<ChatMessage[]>
```

#### 修改楼层消息

酒馆本身没有提供修改楼层消息的命令. 为了方便存档、减少 token 或制作某些 meta 要素, 本前端助手提供这样的功能:

```typescript
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
 *   - `render:'none'|'only_message_id'|'all'`: 是否在替换后重新渲染该消息中的 iframe; 默认为 `only_message_id`
 *     - 'none': 不重新渲染
 *     - 'only_message_id': 仅渲染当前被替换的楼层
 *     - 'all': 渲染所有被加载的楼层
 *
 * @example
 * setChatMessage("这是要设置在楼层 5 的消息, 它会替换该楼当前使用的消息", 5);
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息", 5, 3);
 * setChatMessage("这是要设置在楼层 5 第 3 页的消息, 立即刷新它", 5, 3, {reload: true});
 */
function setChatMessage(message: string, message_id: number, option: SetChatMessagesOption = {}): void
```

### 监听酒馆事件

扩展允许你设置当酒馆发生某种事件时, 运行想要的函数. 例如, 你也许想在玩家擅自更改你的世界书时警告玩家.

#### 可被监听的酒馆事件: `tavern_event_types`

```typescript
/**
 * 可被监听的酒馆事件, 一些酒馆事件可能会在触发时返回事件对应的某些信息回来
 *
 * @example
 * // 收到 ai 消息时弹窗输出 `hello`;
 * function hello() { alert("hello"); }
 * tavernOn(tavern_events.MESSAGE_RECEIVED, hello);
 *
 * @example
 * // 消息被修改时监听是哪一条消息被修改
 * // 能这么做是因为酒馆 MESSAGE_EDITED 会发送消息 id 回来, 但是这个发送太自由了, 我还没整理出每种消息会发送什么
 * function detectMessageEdited(message_id) {
 *   alert(`你刚刚修改了第 ${message_id} 条聊天消息对吧😡`);
 * }
 * tavernOn(tavern_events.MESSAGE_EDITED, detectMessageEdited);
 */
const tavern_events = {
  MESSAGE_SWIPED: 'message_swiped',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_RECEIVED: 'message_received',
  MESSAGE_EDITED: 'message_edited',
  MESSAGE_DELETED: 'message_deleted',
  MESSAGE_UPDATED: 'message_updated',
  // ...总共 63 种事件
}
```

<details>
<summary>查看所有事件</summary>
  APP_READY: 'app_ready',<br>
  EXTRAS_CONNECTED: 'extras_connected',<br>
  MESSAGE_SWIPED: 'message_swiped',<br>
  MESSAGE_SENT: 'message_sent',<br>
  MESSAGE_RECEIVED: 'message_received',<br>
  MESSAGE_EDITED: 'message_edited',<br>
  MESSAGE_DELETED: 'message_deleted',<br>
  MESSAGE_UPDATED: 'message_updated',<br>
  MESSAGE_FILE_EMBEDDED: 'message_file_embedded',<br>
  IMPERSONATE_READY: 'impersonate_ready',<br>
  CHAT_CHANGED: 'chat_id_changed',<br>
  GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',<br>
  GENERATION_STARTED: 'generation_started',<br>
  GENERATION_STOPPED: 'generation_stopped',<br>
  GENERATION_ENDED: 'generation_ended',<br>
  EXTENSIONS_FIRST_LOAD: 'extensions_first_load',<br>
  EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',<br>
  SETTINGS_LOADED: 'settings_loaded',<br>
  SETTINGS_UPDATED: 'settings_updated',<br>
  GROUP_UPDATED: 'group_updated',<br>
  MOVABLE_PANELS_RESET: 'movable_panels_reset',<br>
  SETTINGS_LOADED_BEFORE: 'settings_loaded_before',<br>
  SETTINGS_LOADED_AFTER: 'settings_loaded_after',<br>
  CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed',<br>
  CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',<br>
  OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before',<br>
  OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',<br>
  OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready',<br>
  OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',<br>
  WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated',<br>
  WORLDINFO_UPDATED: 'worldinfo_updated',<br>
  CHARACTER_EDITED: 'character_edited',<br>
  CHARACTER_PAGE_LOADED: 'character_page_loaded',<br>
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE: 'character_group_overlay_state_change_before',<br>
  CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER: 'character_group_overlay_state_change_after',<br>
  USER_MESSAGE_RENDERED: 'user_message_rendered',<br>
  CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',<br>
  FORCE_SET_BACKGROUND: 'force_set_background',<br>
  CHAT_DELETED: 'chat_deleted',<br>
  CHAT_CREATED: 'chat_created',<br>
  GROUP_CHAT_DELETED: 'group_chat_deleted',<br>
  GROUP_CHAT_CREATED: 'group_chat_created',<br>
  GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',<br>
  GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',<br>
  GENERATE_AFTER_DATA: 'generate_after_data',<br>
  GROUP_MEMBER_DRAFTED: 'group_member_drafted',<br>
  WORLD_INFO_ACTIVATED: 'world_info_activated',<br>
  TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',<br>
  CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',<br>
  CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',<br>
  CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',<br>
  // TODO: Naming convention is inconsistent with other events<br>
  CHARACTER_DELETED: 'characterDeleted',<br>
  CHARACTER_DUPLICATED: 'character_duplicated',<br>
  /** @deprecated The event is aliased to STREAM_TOKEN_RECEIVED. */<br>
  SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',<br>
  STREAM_TOKEN_RECEIVED: 'stream_token_received',<br>
  FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',<br>
  WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',<br>
  OPEN_CHARACTER_LIBRARY: 'open_character_library',<br>
  ONLINE_STATUS_CHANGED: 'online_status_changed',<br>
  IMAGE_SWIPED: 'image_swiped',<br>
  CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',<br>
  TOOL_CALLS_PERFORMED: 'tool_calls_performed',<br>
  TOOL_CALLS_RENDERED: 'tool_calls_rendered',<br>
</details>

```typescript
/**
 * 如果代码要随消息变化而运行, 则监听这些事件.
 *
 * @example
 * tavern_messagelike_events.forEach((event_type) => { tavernOn(event_type, 要注册的函数); });
 */
const tavern_messagelike_events = [
  tavern_events.MESSAGE_EDITED,
  tavern_events.MESSAGE_DELETED,
  tavern_events.MESSAGE_SWIPED,
  tavern_events.MESSAGE_RECEIVED
]
```

#### 监听事件

```typescript
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册的函数
 *
 * @example
 * // 收到 ai 消息时弹窗输出 `hello`;
 * function hello() { alert("hello"); }
 * tavernOn(tavern_events.MESSAGE_RECEIVED, hello);
 *
 * @example
 * // 消息被修改时监听是哪一条消息被修改
 * // 能这么做是因为酒馆 MESSAGE_EDITED 会发送消息 id 回来, 但是这个发送太自由了, 我还没整理出每种消息会发送什么
 * function detectMessageEdited(message_id) {
 *   alert(`你刚刚修改了第 ${message_id} 条聊天消息对吧😡`);
 * }
 * tavernOn(tavern_events.MESSAGE_EDITED, detectMessageEdited);
 */
function tavernOn(event_type: TavernEventType, listener: Callback): void
```

```typescript
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最后运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最后运行.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册/调整到最后运行的函数
 * 
 * @example
 * tavernMakeLast(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernMakeLast(event_type: TavernEventType, listener: Callback): void
```

```typescript
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最先运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最先运行.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册/调整为最先运行的函数
 * 
 * @example
 * tavernMakeFirst(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernMakeFirst(event_type: TavernEventType, listener: Callback): void
```

```typescript
/**
 * 让 `listener` 仅监听下一次 `event_type`, 当该次事件发生时运行 `listener`, 此后取消监听.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册的函数
 * 
 * @example
 * tavernMakeOnce(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernOnce(event_type: TavernEventType, listener: Callback): void
```

#### 取消监听事件

```typescript
/**
 * 让 `listener` 取消对 `event_type` 的监听.
 *
 * - 如果 `listener` 没有监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要取消注册的函数
 * 
 * @example
 * tavernRemoveListener(tavern_events.MESSAGE_RECEIVED, 要取消注册的函数);
 */
function tavernRemoveListener(event_type: TavernEventType, listener: Callback): void
```

```typescript
/**
 * 取消本 iframe 中对 `event_type` 的所有监听
 *
 * @param event_type 要取消监听的事件
 *
 * @example
 * tavernRemoveListeners(tavern_events.MESSAGE_EDITED);
 */
function tavernClearEvent(event_type: TavernEventType): void
```

```typescript
/**
 * 取消本 iframe 中 `listener` 的的所有监听
 *
 * @param listener 要取消注册的函数
 *
 * @example
 * tavernRemoveListeners(tavern_events.MESSAGE_EDITED);
 */
function tavernClearListener(listener: Callback): void
```

```typescript
/**
 * 取消本 iframe 中对所有酒馆事件的所有监听
 */
function tavernClearAll(): void
```

### 消息频道

通过消息频道, 我们可以实现不同 iframe 间数据的通讯. 例如, 你可能想等上一条消息里的存档功能保存好了, 再显示下一条消息 (虽然不知道你为什么要这么做).

#### Quick Reply 命令

消息频道的功能其实是额外的, 做这个功能主要是为了**让快速回复按钮也能触发 js 代码**. 这是新增的 Slash Command `/notify-all` 和 iframe 里的函数 `wait` 来做到的, 例如:

快速回复部分:

```text
/notify-all data={{getvar::数据}} "频道名称"
```

iframe 部分:

```typescript
const data = await wait("频道名称");
```

当我们按下该快速回复的按钮后, 正在等待 "频道名称" 消息频道的 js 代码将会获得 `data` 并开始执行.

#### 发送消息

```typescript
/**
 * 发送消息到 `channel` 消息频道, 同时可以发送一些数据 `data`.
 *
 * 所有正在等待 `channel` 消息频道的都会收到该消息并接收到 `data`.
 *
 * @param channel 要发送到的消息频道名称
 * @param data 要随着消息发送的数据
 *
 * @example
 * // 发送 ["你好"] 到 "频道名称" 消息频道
 * notifyAll("频道名称", "你好");
 * // 发送 ["你好", 0] 到 "频道名称" 消息频道
 * notifyAll("频道名称", "你好", 0);
 *
 * @example
 * // 啥都不发送, 单纯提示在等 "频道名称" 消息频道消息的家伙别等了
 * notifyAll("频道名称");
 */
function notifyAll(channel: string, ...data: any[]): void
```

#### 等待消息

```typescript
/**
 * 等待 `channel` 消息频道发送来消息, 并接收该条消息携带的数据
 *
 * @param channel 要等待的消息频道名称
 * @returns 从消息频道发送来的数据
 *
 * @example
 * // 开始等待 "频道名称" 消息频道有消息传来, 直到等到消息才继续执行
 * const result = await wait("频道名称");
 *
 * @example
 * // 开始等待 "频道名称" 消息频道有消息传来
 * const promise = wait("频道名称");
 * // 等待期间做些别的事
 * other_work();
 * // 事情做完了, 看看消息等到了吗
 * const result = await promise;
 *
 * @example
 * // 消息要求我们调用某个函数
 * const result = await wait("频道名称");
 * const function = window[result[0]];  // 返回的第一个数据是函数名, 我们查找该函数
 * function(...result.slice(1));  // 用剩下的数据作为函数的参数
 */
async function wait(channel: string): Promise<any[]>
```

### 其他辅助功能

```typescript
/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-楼层id-属于该楼层第几个代码块`; 对于全局脚本是 `script-脚本名称`
 */
function getIframeName(): string
```

```typescript
/**
 * 获取楼层消息 iframe 的所在楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层消息 iframe 的所在楼层 id
 */
function getCurrentMessageId(): number
```

```typescript
/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
async function getLastMessageId(): Promise<number>;
```

```

## 播放器功能

用于解决iframe之间难以继承播放进度的问题，变量操作的延伸功能。

### 基于 Dynamic Audio 的改动

- :wastebasket: 删除根据表情图切歌的功能

- :wastebasket: 删除从本地加载音频的功能

- :star: 现在从网络链接加载音频

- :star: 对音频列表中音频的排序，编辑和删除

- :star: 增加导入按钮，可以批量输入链接导入到歌单，重复链接会过滤，新插入的音频在最上方

- :star: 给音乐和音频播放器单独加上开关

- :star: 增加播放暂停按钮和播放进度显示

- :star: 新增几种播放模式，现在有【列表循环、随机播放、单曲循环、播完停止】四种模式

- :star: 注册了Quick Reply命令，现在不使用脚本注入，只启动播放器也可以使用快速回复听歌了

- :star: 音频的链接存储在当前聊天的局部变量中，切换聊天就会清空，切换回来时会再加载。可以使用listvar查看变量列表，变量名分别为`bgmurl`和`ambienturl`，支持使用Quick Reply对播放列表做更多自定义的改动

### 播放器 Quick Reply 命令

#### 播放器控制

```text
/audioenable [type=bgm|ambient] [state=true|flase]?
```

控制音乐播放器或音效播放器的开启与关闭。

- `type`: 音乐或音效
- `state` (可选): 开启或关闭, 不填写默认为 `true`

例：`/audioenable type=ambient state=false`

#### 导入音频到播放界面

```text
/audioimport [type=bgm|ambient] [play=true|flase]? url
```

- `type`: 音乐或音效
- `play` (可选): 是否导入之后立即播放第一个音频, 不填写默认为 `true`
- `url`: 要播放的音频链接，可以批量导入, 多个链接之间用**英文**逗号隔开

例：`/audioimport type=ambient play=false url=https://example.com/sound1.mp3,https://example.com/sound2.mp3`

#### 选择音频并播放

```text
/audioselect [type=bgm|ambient] url
```

- `type`: 音乐或音效
- `url`: 要播放的音频链接，如果在播放列表里不存在则先导入再播放

例: `/audioselect type=bgm https://example.com/song.mp3`

#### 播放或暂停

```text
/audioplay [type=bgm|ambient] [play=true|flase]?
```

- `type`: 音乐或音效
- `play` (可选): 播放或暂停, 不填写默认为 `true`

例: `/audioplay type=ambient play=false`

#### 模式切换

```text
/audiomode [type=bgm|ambient] [mode=repeat|random|single|stop]
```

- `type`: 音乐或音效
- `mode`: 播放模式, 分别是列表循环、随机播放、单曲循环、播完停止

例: `/audiomode type=ambient mode=random`
