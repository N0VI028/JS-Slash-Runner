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

- 该脚本将会在切换聊天时被执行: 关闭聊天, 正则被开关或修改, 新建聊天, 切换角色卡... 总之玩家每次游玩的最开始时必然会触发该脚本. 具体什么时候执行很难说, **因此建议不要直接执行你要做的事情**, 而是用 [监听和发送事件](#监听和发送事件) 的方法来在某些事件发生时执行该脚本内容.
- 为了加载效率, 多脚本的加载是同时进行的, 如果需要一个脚本后于另一个脚本加载, 你应该使用 [监听和发送事件](#监听和发送事件) 让那个脚本等待.
- **不同正则下的脚本代码并不共享**, 如果非要拆分放在不同正则, 你需要使用 [监听和发送事件](#监听和发送事件) 进行通讯和数据传递.
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

#### `setVariables(, new_or_updated_variables)`

```typescript
/**
 * 用 `new_or_updated_variables` 更新消息楼层 `message_id` 对应的聊天变量, 相当于你在那个楼层更新了它.
 *   这样的更新与 `message_id` 对应, 如果比 `message_id` 更低的楼层也更新了它, 则通过 `getVariables()` 获取到的会是更低楼层更新的值.
 *   这意味着如果始终使用这个函数设置变量, 则在删除楼层、重 roll 等操作时, 变量会变为这些操作后应该对应的变量值.
 *
 * @param message_id 要绑定到的消息楼层 id
 * @param new_or_updated_variables 要更新的变量
 * @enum
 * - 如果该变量已经存在, 则更新值
 * - 如果不存在, 则新增变量
 *
 * @example
 * setVariables(0, {value: 5, data: 7});
 * setVariables(3, {value: 10});
 *
 * // 如果第 3 楼层还在, 我们将会得到 `{value: 10, data: 7}`
 * const variable = await getVariables();
 *
 * // 如果删去了/重刷了第 3 楼层, 我们将会得到 `{value: 5, data: 7}`
 * const variable = await getVariables();
 */
function setVariables(message_id: number, new_or_updated_variables: Object): void
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
function setChatMessage(message: string, message_id: number, option: SetChatMessagesOption = {}): void
```

### 监听和发送事件

扩展允许你设置当发生某种事件时, 运行想要的函数. 例如, 你也许想在玩家擅自更改你的世界书时警告玩家.

事件可以是,

- `iframe_events` 中的 iframe 事件
- `tavern_events` 中的酒馆事件
- 自定义的字符串事件

你可以监听事件, 在收到 ai 消息时弹出 `"hello"`:

```typescript
function hello() { alert("hello"); }
eventOn(tavern_events.MESSAGE_RECEIVED, hello);
```

你当然也可以取消监听:

```typescript
function hello() {
  alert("hello");
  eventRemoveListener(tavern_events.MESSAGE_RECEIVED, hello);
}
eventOn(tavern_events.MESSAGE_RECEIVED, hello);

//------------------------------------------------------------------------------------------------------------------------
// 上面的相当于只监听一次事件, 对此又专门的函数
eventOnce(tavern_events.MESSAGE_RECEIVED, hello);
```

你可以发送事件, 告诉其他 iframe 你想要它们做什么:

```typescript
//------------------------------------------------------------------------------------------------------------------------
// 负责存档的全局脚本
function save() { /*略*/ }
eventOn("进行存档", save);

//------------------------------------------------------------------------------------------------------------------------
// 消息楼层
await eventEmit("进行存档");
alert("存档完成!");
```

你可以等待事件:

```typescript
await eventWaitOnce("进行存档");
```

你可以等待某个函数因为监听到某个事件而执行了:

```typescript
eventOn(tavern_events.MESSAGE_RECEIVED, hello);
await eventWaitOnce(tavern_events.MESSAGE_RECEIVED, hello);
```

在发送事件时可以携带数据, 进而完成数据的传递:

```typescript
//------------------------------------------------------------------------------------------------------------------------
// 发送方
eventEmit("发送数据", data, time);

//------------------------------------------------------------------------------------------------------------------------
function receive(data, time) {/*略*/}
eventOn("发送数据", receive);
```

```typescript
function detectMessageEdited(message_id) {
  alert(`你刚刚更新了第 ${message_id} 条聊天消息对吧😡`);
}

// 酒馆事件 tavern_events.MESSAGE_UPDATED 会传递被更新的楼层 id
//   但酒馆事件太多了, 我们还没整理出每个传什么, 你也许可以自己试试?
tavernOn(tavern_events.MESSAGE_UPDATED, detectMessageEdited);
```

<details>
<summary>查看所有 iframe 事件</summary>

```typescript
const iframe_events = {
  MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
} as const;
```

</details>

<details>
<summary>查看所有酒馆事件</summary>

```typescript
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
  /** @deprecated The event is aliased to STREAM_TOKEN_RECEIVED. */
  SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',
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
```

</details>

#### 监听事件

```typescript
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
function eventOn(event_type: EventType, listener: Function): void
```

```typescript
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
function eventMakeLast(event_type: EventType, listener: Function): void
```

```typescript
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
function eventMakeFirst(event_type: EventType, listener: Function): void
```

```typescript
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
function eventOnce(event_type: EventType, listener: Function): void
```

#### 等待事件

```typescript
/**
 * 等待一次 `event_type` 事件
 *
 * @param event_type 要等待的事件
 *
 * @example
 * eventWaitOnce(tavern_events.MESSAGE_DELETED);
 */
async function eventWaitOnce(event_type: EventType): Promise<any | undefined>
```

```typescript
/**
 * 等待 `listener` 监听到一次 `event_type` 且执行完成, 返回 `listener` 的执行结果
 *
 * 在调用本函数前, `listener` 必须已经在监听 `event_type`
 *
 * @param event_type `listener` 在监听的事件
 * @param listener 已经在监听 `event_type` 的函数
 *
 * @returns  `listener` 得到的结果
 *
 * @example
 * eventOnce("存档", save);
 * eventWaitOnce("存档", save);
 */
async function eventWaitOnce(event_type: EventType, listener: Function): Promise<any | undefined>
```

#### 发送事件

```typescript
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
async function eventEmit(event_type: EventType, ...data: any[]): Promise<void>
```

#### 取消监听事件

```typescript
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
function eventRemoveListener(event_type: EventType, listener: Function): void
```

```typescript
/**
 * 取消本 iframe 中对 `event_type` 的所有监听
 *
 * @param event_type 要取消监听的事件
 */
function eventClearEvent(event_type: EventType): void
```

```typescript
/**
 * 取消本 iframe 中 `listener` 的的所有监听
 *
 * @param listener 要取消注册的函数
 */
function eventClearListener(listener: Function): void
```

```typescript
/**
 * 取消本 iframe 中对所有事件的所有监听
 */
function eventClearAll(): void
```

#### Quick Reply 命令

我们还提供了 Quick Reply 命令 `/event-emit`, 允许你通过在快速回复中发送事件来触发 js 代码.

快速回复部分:

```text
/event-emit data=8 "事件名称"
```

iframe 部分:

```typescript
tavernOn("事件名称", test);
```

当我们按下该快速回复的按钮后, 正在监听 "事件名称" 消息频道的 js 代码将会获得 `data` 并开始执行.

### 其他辅助功能

```typescript
/**
 * 获取 iframe 的名称
 *
 * @returns 对于楼层消息是 `message-楼层id-是该楼层第几个iframe`; 对于全局脚本是 `script-脚本名称`
 */
function getIframeName(): string
```

```typescript
/**
 * 从消息楼层 iframe 的 `iframe_name` 获取它所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @param iframe_name 消息楼层 iframe 的名称
 * @returns 楼层 id
 */
function getMessageId(iframe_name: string): number
```

```typescript
/**
 * 获取本消息楼层 iframe 所在楼层的楼层 id, **只能对楼层消息 iframe** 使用
 *
 * @returns 楼层 id
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
