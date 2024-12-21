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

该脚本将会在切换聊天时被执行: 关闭聊天, 正则被开关或修改, 新建聊天, 切换角色卡... 总之玩家每次游玩的最开始时必然会触发该脚本. 具体什么时候执行很难说, **因此建议不要直接执行你要做的事情**, 而是用 [监听酒馆事件](#监听酒馆事件) 的方法来在某些酒馆事件发生时执行该脚本内容.

脚本虽然被写在正则中, 但实际并没有作为正则使用, 只是为了利用局部正则能和角色卡一起导出这一点, 因此正则的具体设置对于脚本并没有意义. 唯一支持的选项是开关正则来开关脚本.

## 怎么用最好?

[基于前端插件编写角色卡的 VSCode 环境配置](https://sillytavern-stage-girls-dog.readthedocs.io/tool_and_experience/js_slash_runner/index.html)

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

### 监听酒馆事件

扩展允许你设置当酒馆发生某种事件时, 运行想要的函数. 例如, 你也许想在玩家擅自更改你的世界书时警告玩家.

#### 可被监听的酒馆事件: `tavern_event_types`

```typescript
/**
 * 可被监听的酒馆事件
 * 
 * @example
 * // 收到 ai 消息时弹窗输出 `hello`;
 * function hello() { alert("hello"); }
 * tavernOn(tavern_events.MESSAGE_RECEIVED, hello);
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
