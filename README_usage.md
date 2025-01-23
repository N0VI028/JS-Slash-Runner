# 使用方法

页面右上角有目录可以用.

![目录](README_usage_目录.png)

## 编写前端助手角色卡的推荐方案

### Cursor (推荐!)

如果你在电脑上写卡, **推荐安装 Cursor 来编写**, 参考[基于前端助手编写角色卡的 VSCode 环境配置](https://sillytavern-stage-girls-dog.readthedocs.io/tool_and_experience/js_slash_runner/index.html), 你可以关注[类脑帖子: 用前端助手编写角色卡的 VSCode/Cursor 环境搭建](https://discord.com/channels/1134557553011998840/1320081111451439166)来得知该教程的更新情况.

配置好后, iframe_client 文件夹和 slash_command.txt 文件中即分别记录了前端助手的功能和酒馆最新版本的所有 slash command. 你可以将它们连同 tsconfig.json 发给 ai, 让 ai 来写, 并说明 "所有内容均可直接使用, 不需要 import module", **具体在上面的配置文档链接中有提示.**

### html 工具角色卡

如果实在不想安装 Cursor, 或你想在手机上编写, 可以使用: https://discord.com/channels/1134557553011998840/1279910607348564079

但要注意它世界书中对前端助手和 slash command 的提示词是复制粘贴的, 因而在之后如果前端助手或酒馆更新, 则提示词不会涵盖更新内容.

- 如果前端助手更新, 你可以通过复制本文件列出的所有内容到对应条目中来更新提示词.
- 如果酒馆更新, 你可以通过复制 [slash_command.txt](https://gitgud.io/SmilingFace/tavern_resource/-/blob/main/%E5%B7%A5%E5%85%B7%E7%BB%8F%E9%AA%8C/frontend_writer/slash_command.txt?ref_type=heads) 中的内容到对应条目中来更新提示词.

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

#### 获取 User 头像

已设置为类, 命名为 `user_avatar`, 使用方法如下:

```html
// 在你想要放入用户头像的地方设置类为 user_avatar, 此时容器的背景图片就会变为当前用户头像
<div class="user_avatar"></div>
```

只导入了图片链接 `background-image: url('${avatarPath}');`, 没有特意设置其他样式, 具体的图片填充方式需使用者手动添加样式.

如果在聊天中途更换了 user 角色, 其显示逻辑与酒馆一致, 会在新的楼层显示新的头像; 如果想要将旧的楼层头像显示同步, 需要点击用户面板的同步按钮.

#### 禁用加载动画

界面代码任意位置输入 `<!-- disable-default-loading -->` 禁用内置的加载动画. 例如:

```html
<body>
<!-- disable-default-loading -->
</body>
```

### 全局脚本

在正则中新建一个 `脚本-你想要的脚本名称` 正则 (如果有多个脚本, 名字不要重复), 然后你就能在正则的替换区域中填写你想要的脚本内容.

![全局脚本示例](README_usage_全局脚本.png)

注意:

- 该脚本将会在切换聊天时被执行: 关闭聊天, 正则被开关或修改, 新建聊天, 切换角色卡... 总之玩家每次游玩的最开始时必然会触发该脚本. 具体什么时候执行很难说, **因此建议不要直接执行你要做的事情**, 而是用 [监听和发送事件](#监听和发送事件) 的方法来在某些事件发生时执行该脚本内容.
- 为了加载效率, 多脚本的加载是同时进行的, 如果需要一个脚本后于另一个脚本加载, 你应该使用 [监听和发送事件](#监听和发送事件) 让那个脚本等待.
- **不同正则下的脚本代码并不共享**, 如果非要拆分放在不同正则, 你需要使用 [监听和发送事件](#监听和发送事件) 进行通讯和数据传递.
- 脚本虽然被写在正则中, 但实际并没有作为正则使用, 只是为了利用局部正则能和角色卡一起导出这一点, 因此正则的具体设置对于脚本并没有意义. 唯一支持的选项是开关正则来开关脚本, "在编辑时运行" 来无视开关强制启用脚本.

### 库

在正则中新建一个 `库-你想要的库名称` 正则 (如果有多个库, 名字不要重复), 然后所有的楼层消息 iframe 和全局脚本 iframe 的 `<head>` 部分都会包含它. 你可以在这里统一地设置显示样式, 加入一些第三方库, 编辑一些你需要的便携库……

![库示例](README_usage_库.png)

注意:

- 全局脚本的所有注意事项在这里依旧适用.
- 如果有多个库, 将会按在正则中的显示顺序从上到下依次加入.

## 内置的第三方库

### Font Awesome

[Font Awesome](https://fontawesome.com/icons/) 网站内有非常多图标可供你使用.

<details>
<summary>示例: 电脑图标</summary>

````html
```
<html>

<body>
  <i class="fa-solid fa-laptop-code"></i>
</body>

</html>
```
````

</details>

### file-saver

通过 file-saver, 你可以很方便地下载文件, 所以你也许可以内置检查角色卡更新等? 这是 iframe 本来就支持的功能, 加入 file-saver 只是为了方便我们的某些功能.

<details>
<summary>示例: 利用 Blob 下载字符串或其他内容</summary>

```typescript
const blob = new Blob(["hello, world!"], {type: "text/plain;charset=utf-8"});
saveAs(blob, "filename.txt");
```

</details>

<details>
<summary>示例: 从链接下载文件</summary>

链接是本地链接或域外支持 CORS 的链接, 则直接下载:

```typescript
saveAs(`https://gitgud.io/api/v4/projects/${encodeURIComponent("SmilingFace/tavern_resource")}/repository/files/${encodeURIComponent("角色卡/妹妹请求你保护她露出/妹妹请求你保护她露出.png")}/raw?ref=main`, "妹妹请求你保护她露出.png");
```

否则将会弹窗到对应的链接 (浏览器会默认拦截):

```typescript
saveAs("https://gitgud.io/SmilingFace/tavern_resource/-/raw/main/角色卡/妹妹请求你保护她露出/妹妹请求你保护她露出.png?inline=false", "妹妹请求你保护她露出.png")
```

</details>

### JQuery

通过 JQuery, 你可以很方便地设置界面 DOM 元素.

<details>
<summary>示例: 向 body 末尾添加一行文本</summary>

````html
```
<html>
  <body>
    <script>
      const variables = {神乐光: {好感度: 5}};
      $("body").append($("<p></p>").text(JSON.stringify(variables)));
    </script>
  </body>
</html>
```
````

</details>

### JQuery UI

通过 JQuery UI, 你可以很方便地设置界面 DOM 元素可以如何被交互.

<details>
<summary>示例: 向 body 末尾添加一行可以拖动的文本</summary>

````html
```
<html>

<body>
  <div id="draggable" class="ui-widget-content">
    <p>随意拖动我</p>
  </div>

  <script>
    $(document).ready(function () {
      $("#draggable").draggable();
    });
  </script>
</body>

</html>
```
````

</details>

### Lodash

通过 Lodash, 你可以很方便地对 Array、Object 等类型进行操作.

<details>
<summary>示例: 对 Array 去重</summary>

````html
```
<html>
  <body>
    <script>
      const array = _.uniq([1, 3, 2, 3, 1, 4, 5, 4]);
      // => array == [1, 3, 2, 4, 5]
      $("body").append($("<p></p>").text(JSON.stringify(array)));
    </script>
  </body>
</html>
```
````

</details>

<details>
<summary>示例: 合并 Object</summary>

````html
```
<html>
  <body>
    <script>
      const result = {a: 1, b: 2};
      const source = {b: 3, c: 4};
      _.merge(result, source);
      // => result == {a: 1, b: 3, c: 4}
      $("body").append($("<p></p>").text(JSON.stringify(result)));
    </script>
  </body>
</html>
```
````

</details>

### yamljs

允许你像 JavaScript 内置的 JSON 那样解析 yaml 语法.

<details>
<summary>示例: 输出成 yaml</summary>

````html
```
<html>

<body>
  <script>
    const variables =
    {
      角色变量:
      {
        爱城华恋: {
          好感度: 10
        },
        神乐光: {
          好感度: 5
        },
      }
    }
    $("body").append($("<p></p>").text(YAML.stringify(variables)));
  </script>
</body>

</html>
```
````

</details>

<details>
<summary>示例: 解析 yaml</summary>

````html
```
<html>

<body>
  <script>
    const variables = `
    角色变量:
      爱城华恋:
        好感度: 10
      神乐光:
        好感度: 5
    `
    $("body").append($("<p></p>").text(JSON.stringify(YAML.parse(variables))));
  </script>
</body>

</html>
```
````

</details>

### 让 VSCode 的预览支持这些第三方库

为了让 VSCode 的预览支持这些第三方库, 你需要复制前端助手 `内置库安装` 中的文本, 将它加入到 `<head>` 中:

![内置库插入](README_usage_内置库插入.png)

## 脚本代码功能

### Quick Reply 触发

我们可以在嵌入的 iframe 中执行 SillyTavern 内部的 Slash 命令 (斜杠命令), 如 `/run`、`/echo` 等.

#### `triggerSlash(commandText)`

```typescript
/**
 * 运行 Slash 命令, 注意如果命令写错了将不会有任何反馈
 *
 * @param commandText 要运行的 Slash 命令
 */
async function triggerSlash(commandText: string): Promise<void>
```

示例:

```typescript
// 在酒馆界面弹出提示语 `hello!`
await triggerSlash('/echo hello!');
```

#### `triggerSlashWithResult(commandText)`

```typescript
/**
 * 运行 Slash 命令, 并返回命令管道的结果
 *
 * @param commandText 要运行的 Slash 命令
 * @returns Slash 管道结果, 如果命令出错或执行了 `/abort` 则返回 `undefined`
 */
async function triggerSlashWithResult(commandText: string): Promise<string | undefined>
```

示例:

```typescript
// 获取当前聊天消息最后一条消息对应的 id
const last_message_id = await triggerSlashWithResult('/pass {{lastMessageId}}');
```

### 变量操作

#### 获取变量表

```typescript
/**
 * 获取变量表
 *
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @returns 变量表
 */
async function getVariables(option: VariableOption = {}): Promise<JsonObject>
```

示例:

```typescript
// 获取所有聊天变量并弹窗输出结果
const variables = await getVariables();
alert(variables);
```

```typescript
// 获取所有全局变量
const variables = await getVariables({type: 'global'});
// 前端助手内置了 lodash 库, 你能用它做很多事, 比如查询某个变量是否存在
if (_.has(variables, "神乐光.好感度")) {
  /* ... */
}
```

#### 替换变量表

```typescript
/**
 * 完全替换变量表为 `variables`
 *
 * 之所以提供这么直接的函数, 是因为前端助手内置了 lodash 库:
 * `insertOrAssignVariables` 等函数其实就是先 `getVariables` 获取变量表, 用 lodash 库处理, 再 `replaceVariables` 替换变量表.
 *
 * @param variables 要用于替换的变量表
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 */
async function replaceVariables(variables: JsonObject, option: VariableOption = {}): Promise<void>
```

示例:

```typescript
// 执行前的聊天变量: `{爱城华恋: {好感度: 5}}`
await replaceVariables({神乐光: {好感度: 5, 认知度: 0}});
// 执行后的聊天变量: `{神乐光: {好感度: 5, 认知度: 0}}`
```

```typescript
// 删除 `{神乐光: {好感度: 5}}` 变量
let variables = await getVariables();
_.unset(variables, "神乐光.好感度");
await replaceVariables(variables);
```

#### 用一个函数更新变量表

```typescript
/**
 * 用 `updater` 函数更新变量表
 *
 * @param updater 用于更新变量表的函数. 它应该接收变量表作为参数, 并返回更新后的变量表.
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 对聊天变量表 (`'chat'`) 或全局变量表 (`'global'`) 进行操作, 默认为 `'chat'`
 *
 * @returns 更新后的变量表
 */
async function updateVariablesWith(updater: (variables: JsonObject) => JsonObject, option: VariableOption = {}): Promise<JsonObject>
```

示例:

```typescript
// 删除 `{神乐光: {好感度: 5}}` 变量
await updateVariablesWith(variables => {_.unset(variables, "神乐光.好感度"); return variables;});
```

```typescript
// 更新 "爱城华恋.好感度" 为原来的 2 倍, 如果该变量不存在则设置为 0
await updateVariablesWith(variables => _.update(variables, "爱城华恋.好感度", value => value ? value * 2 : 0));
```

通过 `updateVariablesWith` 函数预制的函数:

##### 插入或修改变量值

```typescript
/**
 * 插入或修改变量值, 取决于变量是否存在.
 *
 * @param variables 要更新的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则修改该变量的值
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertOrAssignVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertOrAssignVariables(variables: JsonObject, option: VariableOption = {}): Promise<void> {
  await updateVariablesWith(old_variables => _.merge(old_variables, variables), option);
}
```

##### 插入新变量

```typescript
/**
 * 插入新变量, 如果变量已经存在则什么也不做
 *
 * @param variables 要插入的变量
 *   - 如果变量不存在, 则新增该变量
 *   - 如果变量已经存在, 则什么也不做
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await insertVariables({爱城华恋: {好感度: 10}, 神乐光: {好感度: 5, 认知度: 0}});
 * // 执行后变量: `{爱城华恋: {好感度: 5}, 神乐光: {好感度: 5, 认知度: 0}}`
 */
async function insertVariables(variables: JsonObject, option: VariableOption = {}): Promise<void> {
  await updateVariablesWith(old_variables => _.defaultsDeep(old_variables, variables), option);
}
```

##### 删除变量

```typescript
/**
 * 删除变量, 如果变量不存在则什么也不做
 *
 * @param variable_path 要删除的变量路径
 *   - 如果变量不存在, 则什么也不做
 *   - 如果变量已经存在, 则删除该变量
 * @param option 可选选项
 *   - `type?:'chat'|'global'`: 聊天变量或全局变量, 默认为聊天变量 'chat'
 *
 * @returns 是否成功删除变量
 *
 * @example
 * // 执行前变量: `{爱城华恋: {好感度: 5}}`
 * await deleteVariable("爱城华恋.好感度");
 * // 执行后变量: `{爱城华恋: {}}`
 */
async function deleteVariable(variable_path: string, option: VariableOption = {}): Promise<boolean> {
  let result: boolean = false;
  await updateVariablesWith(old_variables => { result = _.unset(old_variables, variable_path); return old_variables; }, option);
  return result;
}
```

### 楼层消息操作

#### 获取楼层消息

酒馆虽然提供了 `/messages` 命令, 但是它获取的是一整个字符串, 并且不能获取楼层当前没在使用的消息 (点击箭头切换的那个 swipe 消息, 在前端助手中我们称之为 "消息页"), 前端助手为此提供了一个函数获取更便于处理的消息.

其获取到的结果是一个数组, 数组的元素类型为 `ChatMessage`, 有以下内容:

```typescript
interface ChatMessage {
  message_id: number;
  name: string;
  role: 'system' | 'assistant' | 'user'
  is_hidden: boolean;
  message: string;

  // 如果 `getChatMessages` 使用 `include_swipe: false`, 则以下内容为 `undefined`
  swipe_id?: number;
  swipes?: string[];
}
```

具体函数为:

```typescript
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
 */
async function getChatMessages(range: string | number, option: GetChatMessagesOption = {}): Promise<ChatMessage[]>
```

示例:

```typescript
// 仅获取第 10 楼会被 ai 使用的消息页
const messages = await getChatMessages(10);
const messages = await getChatMessages("10");

// 获取第 10 楼的所有消息页
const messages = await getChatMessages(10, {swipe: true});

// 获取所有楼层的所有消息页
const messages = await getChatMessages("0-{{lastMessageId}}", {swipe: true});
```

#### 修改楼层消息

酒馆本身没有提供修改楼层消息的命令. 为了方便存档、减少 token 或制作某些 meta 要素, 本前端助手提供这样的功能:

```typescript
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
 */
async function setChatMessage(message: string, message_id: number, option: SetChatMessageOption = {}): Promise<void>
```

示例:

```typescript
await setChatMessage("这是要设置在楼层 5 的消息, 它会替换该楼当前使用的消息", 5);
await setChatMessage("这是要设置在楼层 5 第 3 页的消息, 更新为显示它并渲染其中的 iframe", 5, {swipe_id: 3});
await setChatMessage("这是要设置在楼层 5 第 3 页的消息, 但不更新显示它", 5, {swipe_id: 3, refresh: 'none'});
```

### 消息显示操作

#### 将字符串处理为酒馆用于显示的 html 格式

```typescript
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
async function formatAsDisplayedMessage(text: string, option: FormatAsDisplayedMessageOption = {}): Promise<string>
```

示例:

```typescript
const text = await formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}");
text == "<p>少女歌剧 speaks in 5</p>";
```

#### 获取消息楼层号对应的消息内容 JQuery

**相比于一个实用函数, 这更像是一个告诉你可以这样用 JQuery 的示例.**

```typescript
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
 * const text = retrieveMessageTextHtml(0).text();
 *
 * @example
 * // 修改第 0 楼的消息内容文本
 * // - 这样的修改只会影响本次显示, 不会保存到消息文件中, 因此重新加载消息或刷新网页等操作后就会回到原样;
 * // - 如果需要实际修改消息文件, 请使用 `setChatMessage`
 * retrieveDisplayedMessage(0).text("new text");
 * retrieveDisplayedMessage(0).append("<pre>new text</pre>");
 * retrieveDisplayedMessage(0).append(formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}"));
 */
function retrieveDisplayedMessage(message_id: number): JQuery<HTMLDivElement> {
  return $(`div.mes[mesid = "${message_id}"]`, window.parent.document).find(`div.mes_text`);
}
```

示例:

```typescript
// 获取第 0 楼的消息内容文本
const text = retrieveMessageTextHtml(0).text();
```

```typescript
// 修改第 0 楼的消息内容文本
// - 这样的修改只会影响本次显示, 不会保存到消息文件中, 因此重新加载消息或刷新网页等操作后就会回到原样;
// - 如果需要实际修改消息文件, 请使用 `setChatMessage`
retrieveDisplayedMessage(0).text("new text");
retrieveDisplayedMessage(0).append("<pre>new text</pre>");
retrieveDisplayedMessage(0).append(formatAsDisplayedMessage("{{char}} speaks in {{lastMessageId}}"));
```

### 酒馆正则操作

酒馆正则将会以以下类型表示:

```typescript
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
```

#### 获取局部正则是否被启用

```typescript
/**
 * 判断酒馆局部正则是否被启用. 注意, 前端插件已经更新了 "自动启用局部正则" 选项, 所以你其实没必要用这个?
 *
 * 如果你是在局部正则中调用这个函数, **请保证"在编辑时运行"被启用**, 这样这个脚本才会无视局部正则开启情况而运行.
 *
 * @returns 局部正则是否被启用
 */
async function isCharacterTavernRegexEnabled(): Promise<boolean>;
```

#### 获取酒馆正则

```typescript
interface GetRegexDataOption {
  scope?: 'all' | 'global' | 'character';         // 按所在区域筛选正则; 默认为 `'all'`
  enable_state?: 'all' | 'enabled' | 'disabled';  // 按是否被开启筛选正则; 默认为 `'all'`
}

/**
 * 获取酒馆正则
 *
 * @param option 可选设置
 *   - `scope?:'all'|'global'|'character'`:         // 按所在区域筛选酒馆正则; 默认为 `'all'`
 *   - `enable_state?:'all'|'enabled'|'disabled'`:  // 按是否被开启筛选酒馆正则; 默认为 `'all'`
 *
 * @returns 一个数组, 数组的元素是酒馆正则 `TavernRegex`. 该数组依据正则作用于文本的顺序排序, 也就是酒馆显示正则的地方从上到下排列.
 */
async function getRegexData(option: GetRegexDataOption = {}): Promise<RegexData[]>
```

示例:

```typescript
// 获取所有酒馆正则
const regexes = await getTavernRegexes();
```

```typescript
// 获取当前角色卡目前被启用的局部正则
const regexes = await getTavernRegexes({scope: 'character', enable_state: 'enabled'});
```

#### 替换酒馆正则

```typescript
interface ReplaceTavernRegexesOption {
  scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'.
}

/**
 * 完全替换酒馆正则为 `regexes`
 *
 * 之所以提供这么直接的函数, 是因为你可能需要调换正则顺序等操作, 且前端助手内置了 lodash 库:
 *   `setTavernRegexes` 等函数其实就是先 `getTavernRegexes` 获取酒馆正则, 用 lodash 或其他方式进行处理, 再 `replaceTavernRegexes` 替换酒馆正则.
 *
 * @param regexes 要用于替换的酒馆正则
 * @param option 可选设置
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 */
async function replaceTavernRegexes(regexes: TavernRegex[], option: ReplaceTavernRegexesOption = {}): Promise<void>
```

示例:

```typescript
// 开启所有名字里带 "舞台少女" 的正则
let regexes = await getTavernRegexes();
regexes.forEach(regex => {
  if (regex.script_name.includes('舞台少女')) {
    regex.enabled = true;
  }
});
await replaceTavernRegexes(regexes);
```

#### 用一个函数更新酒馆正则

```typescript
/**
 * 用 `updater` 函数更新酒馆正则
 *
 * @param updater 用于更新酒馆正则的函数. 它应该接收酒馆正则作为参数, 并返回更新后的酒馆正则.
 * @param option 可选选项
 *   - scope?: 'all' | 'global' | 'character';  // 要替换的酒馆正则部分; 默认为 'all'
 *
 * @returns 更新后的酒馆正则
 */
async function updateTavernRegexesWith(updater: (variables: TavernRegex[]) => TavernRegex[], option: ReplaceTavernRegexesOption = {}): Promise<TavernRegex[]>
```

示例:

```typescript
await updateTavernRegexesWith(regexes => {
  regexes.forEach(regex => {
    if (regex.script_name.includes('舞台少女')) {
      regex.enabled = true;
    }
  });
  return regexes;
});
```

### 世界书操作

#### 获取世界书全局设置

```typescript
interface LorebookSettings {
  selected_global_lorebooks: string[];

  scan_depth: number;
  context_percentage: number;
  budget_cap: number;  // 0 表示禁用
  min_activations: number;
  max_depth: number;  // 0 表示无限制
  max_recursion_steps: number;

  include_names: boolean;
  recursive: boolean;
  case_sensitive: boolean;
  match_whole_words: boolean;
  use_group_scoring: boolean;
  overflow_alert: boolean;

  insertion_strategy: 'evenly' | 'character_first' | 'global_first';
};

/**
 * 获取当前的世界书全局设置
 *
 * @returns 当前的世界书全局设置
 */
async function getLorebookSettings(): Promise<LorebookSettings>
```

示例:

```typescript
// 获取全局启用的世界书
const settings = await getLorebookSettings();
alert(settings.selected_global_lorebooks);
```

#### 修改世界书全局设置

示例:

```typescript
// 修改上下文百分比为 100%, 启用递归扫描
await setLorebookSettings({context_percentage: 100, recursive: true});
```

#### 获取角色卡绑定的世界书

```typescript
interface GetCharLorebooksOption {
  name?: string;  // 要查询的角色卡名称; 不指明则为当前角色卡
};

interface CharLorebooks {
  primary: string | null;
  additional: string[];
}

/**
 * 获取角色卡绑定的世界书
 *
 * @param option 可选选项
 *   - `name?:string`: 要查询的角色卡名称; 默认为当前角色卡
 *
 * @returns 角色卡绑定的世界书
 */
async function getCharLorebooks(option: GetCharLorebooksOption = {}): Promise<CharLorebooks>
```

```typescript
/**
 * 获取当前角色卡绑定的主要世界书
 *
 * @returns 如果当前角色卡有绑定并使用世界书 (地球图标呈绿色), 返回该世界书的名称; 否则返回 `null`
 */
async function getCurrentCharPrimaryLorebook(): Promise<string | null>
```

```typescript
/**
 * 将当前角色卡换为绑定 `lorebooks`
 *
 * @param lorebooks 要新绑定的世界书, 不指明 primary 或 additional 字段则表示不变
 */
async function setCharLorebooks(lorebooks: Partial<CharLorebooks>): Promise<void>
```

#### 获取聊天绑定的世界书

```typescript
/**
 * 获取或创建当前聊天绑定的世界书
 *
 * @returns 聊天世界书的名称
 */
async function getOrCreateChatLorebook(): Promise<string>
```

#### 获取世界书列表

```typescript
/**
 * 获取世界书列表
 *
 * @returns 世界书名称列表
 */
async function getLorebooks(): Promise<string[]>
```

#### 新建世界书

```typescript
/**
 * 新建世界书
 *
 * @param lorebook 世界书名称
 *
 * @returns 是否成功创建, 如果已经存在同名世界书会失败
 */
async function createLorebook(lorebook: string): Promise<boolean>
```

#### 删除世界书

```typescript
/**
 * 删除世界书
 *
 * @param lorebook 世界书名称
 * @returns 是否成功删除, 可能因世界书不存在等原因而失败
 */
async function deleteLorebook(lorebook: string): Promise<boolean>
```

### 世界书条目操作

相比于酒馆给的 slash command, 前端助手允许你更批量和更直接的获取世界书条目内容. 具体地, 你可以访问每个条目的以下信息:

```typescript
interface LorebookEntry {
  uid: number;            // uid 是相对于世界书内部的, 不要跨世界书使用
  display_index: number;  // 酒馆中将排序设置为 "自定义" 时的显示顺序

  comment: string;
  enabled: boolean;
  type: 'constant' | 'selective' | 'vectorized'
  position:
  'before_character_definition'   // 角色定义之前
  | 'after_character_definition'  // 角色定义之后
  | 'before_example_messages'     // 示例消息之前
  | 'after_example_messages'      // 示例消息之后
  | 'before_author_note'          // 作者注释之前
  | 'after_author_note'           // 作者注释之后
  | 'at_depth_as_system'          // @D⚙
  | 'at_depth_as_assistant'       // @D👤
  | 'at_depth_as_user';           // @D🤖
  depth: number | null;  // 仅对于 `position === 'at_depth_as_???'` 有意义; 其他情况为 null
  order: number;
  probability: number;

  key: string[];
  logic: 'and_any' | 'and_all' | 'not_all' | 'not_any';
  filter: string[];

  scan_depth: 'same_as_global' | number;
  case_sensitive: 'same_as_global' | boolean;
  match_whole_words: 'same_as_global' | boolean;
  use_group_scoring: 'same_as_global' | boolean;
  automation_id: string | null;

  exclude_recursion: boolean;
  prevent_recursion: boolean;
  delay_until_recursion: boolean | number;  // 启用则是 true, 如果设置了具体的 Recursion Level 则是数字 (具体参考酒馆中勾选这个选项后的变化)

  content: string;

  group: string;
  group_prioritized: boolean;
  group_weight: number;
  sticky: number | null;
  cooldown: number | null;
  delay: number | null;
}
```

#### 获取世界书中的条目信息

```typescript
interface GetLorebookEntriesOption {
  filter?: 'none' | Partial<LorebookEntry>;  // 按照指定字段值筛选条目, 如 `{position: 'at_depth_as_system'}` 表示仅获取处于 @D⚙ 的条目; 默认为不进行筛选. 由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选.
};

/**
 * 获取世界书中的条目信息. **请务必阅读示例**.
 *
 * @param lorebook 世界书名称
 * @param option 可选选项
 *   - `filter:'none'|LorebookEntry的一个子集`: 按照指定字段值筛选条目, 要求对应字段值包含制定的内容; 默认为不进行筛选.
 *                                       如 `{content: '神乐光'}` 表示内容中必须有 `'神乐光'`, `{type: 'selective'}` 表示仅获取绿灯条目.
 *                                       由于实现限制, 只能做到这样的简单筛选; 如果需要更复杂的筛选, 请获取所有条目然后自己筛选.
 *
 * @returns 一个数组, 元素是各条目信息.
 */
async function getLorebookEntries(lorebook: string, option: GetLorebookEntriesOption = {}): Promise<LorebookEntry[]>
```

示例:

```typescript
// 获取世界书中所有条目的所有信息
const entries = await getLorebookEntries("eramgt少女歌剧");
```

```typescript
// 按内容筛选, content 中必须出现 `'神乐光'`
const entries = await getLorebookEntries("eramgt少女歌剧", {filter: {content: '神乐光'}})
```

#### 修改世界书中的条目信息

```typescript
/**
 * 将条目信息修改回对应的世界书中, 如果某个字段不存在, 则该字段采用原来的值.
 *
 * 这只是修改信息, 不能创建新的条目, 因此要求条目必须已经在世界书中.
 *
 * @param lorebook 条目所在的世界书名称
 * @param entries 一个数组, 元素是各条目信息. 其中必须有 `uid`, 而其他字段可选.
 */
async function setLorebookEntries(lorebook: string, entries: (Pick<LorebookEntry, "uid"> & Partial<Omit<LorebookEntry, "uid">>)[]): void
```

示例:

```typescript
const lorebook = "eramgt少女歌剧";

// 禁止所有条目递归, 保持其他设置不变
const entries = await getLorebookEntries(lorebook);
// `...entry` 表示展开 `entry` 中的内容; 而 `prevent_recursion: true` 放在后面会覆盖或设置 `prevent_recursion` 字段
await setLorebookEntries(lorebook, entries.map(entry => ({ ...entry, prevent_recursion: true })));

// 实际上我们只需要为条目指出它的 uid, 并设置 `prevent_recursion: true`
const entries = await getLorebookEntries(lorebook);
await setLorebookEntries(lorebook, entries.map(entry => ({ uid: entry.uid, prevent_recursion: true })));

// 当然你也可以做一些更复杂的事, 比如不再是禁用, 而是反转开关
const entries = await getLorebookEntries(lorebook);
await setLorebookEntries(lorebook, entries.map(entry => ({ uid: entry.uid, prevent_recursion: !entry.prevent_recursion })));
```

#### 在世界书中新增条目

```typescript
/**
 * 向世界书中新增一个条目
 *
 * @param lorebook 世界书名称
 * @param field_values 要对新条目设置的字段值, 如果不设置则采用酒馆给的默认值. **不能设置 `uid`**.
 *
 * @returns 新条目的 `uid`
 */
async function createLorebookEntry(lorebook: string, field_values: Partial<Omit<LorebookEntry, "uid">>): Promise<number> 
```

示例:

```typescript
const uid = await createLorebookEntry("eramgt少女歌剧", {comment: "revue", content: "歌唱吧跳舞吧相互争夺吧"});
```

#### 删除世界书中的某个条目

```typescript
/**
 * 删除世界书中的某个条目
 *
 * @param lorebook 世界书名称
 * @param uid 要删除的条目 uid
 *
 * @returns 是否成功删除, 可能因世界书不存在、对应条目不存在等原因失败
 */
async function deleteLorebookEntry(lorebook: string, uid: number): Promise<boolean>
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
eventOn(tavern_events.MESSAGE_UPDATED, detectMessageEdited);
```

<details>
<summary>查看所有 iframe 事件</summary>

```typescript
const iframe_events = {
  MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
  MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
};
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
  STREAM_TOKEN_RECEIVED: 'stream_token_received',
  FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
  WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
  OPEN_CHARACTER_LIBRARY: 'open_character_library',
  ONLINE_STATUS_CHANGED: 'online_status_changed',
  IMAGE_SWIPED: 'image_swiped',
  CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
  TOOL_CALLS_PERFORMED: 'tool_calls_performed',
  TOOL_CALLS_RENDERED: 'tool_calls_rendered',
};
```

</details>

<details>
<summary> 查看事件发生时会发送的数据 </summary>

```typescript
type ListenerType = {
  [iframe_events.MESSAGE_IFRAME_RENDER_STARTED]: (iframe_name: string) => void;
  [iframe_events.MESSAGE_IFRAME_RENDER_ENDED]: (iframe_name: string) => void;
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
  [tavern_events.GENERATION_AFTER_COMMANDS]: (type: string, option: { automatic_trigger?: boolean, force_name2?: boolean, quiet_prompt?: string, quietToLoud?: boolean, skipWIAN?: boolean, force_chid?: number, signal?: AbortSignal, quietImage?: string, quietName?: string, depth?: number }, dry_run: boolean) => void;
  [tavern_events.GENERATION_STARTED]: (type: string, option: { automatic_trigger?: boolean, force_name2?: boolean, quiet_prompt?: string, quietToLoud?: boolean, skipWIAN?: boolean, force_chid?: number, signal?: AbortSignal, quietImage?: string, quietName?: string, depth?: number }, dry_run: boolean) => void;
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
  [tavern_events.OAI_PRESET_CHANGED_BEFORE]: (result: { preset: Object, presetName: string, settingsToUpdate: Object, settings: Object, savePreset: Function }) => void;
  [tavern_events.OAI_PRESET_CHANGED_AFTER]: () => void;
  [tavern_events.OAI_PRESET_EXPORT_READY]: (preset: Object) => void;
  [tavern_events.OAI_PRESET_IMPORT_READY]: (result: { data: Object, presetName: string }) => void;
  [tavern_events.WORLDINFO_SETTINGS_UPDATED]: () => void;
  [tavern_events.WORLDINFO_UPDATED]: (name: string, data: Object) => void;
  [tavern_events.CHARACTER_EDITED]: (result: { detail: { id: string, character: Object } }) => void;
  [tavern_events.CHARACTER_PAGE_LOADED]: () => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE]: (state: number) => void;
  [tavern_events.CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER]: (state: number) => void;
  [tavern_events.USER_MESSAGE_RENDERED]: (message_id: string) => void;
  [tavern_events.CHARACTER_MESSAGE_RENDERED]: (message_id: string) => void;
  [tavern_events.FORCE_SET_BACKGROUND]: (background: { url: string, path: string }) => void;
  [tavern_events.CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.CHAT_CREATED]: () => void;
  [tavern_events.GROUP_CHAT_DELETED]: (chat_file_name: string) => void;
  [tavern_events.GROUP_CHAT_CREATED]: () => void;
  [tavern_events.GENERATE_BEFORE_COMBINE_PROMPTS]: () => void;
  [tavern_events.GENERATE_AFTER_COMBINE_PROMPTS]: (result: { prompt: string, dryRun: boolean }) => void;
  [tavern_events.GENERATE_AFTER_DATA]: (generate_data: Object) => void;
  [tavern_events.GROUP_MEMBER_DRAFTED]: (character_id: string) => void;
  [tavern_events.WORLD_INFO_ACTIVATED]: (entries: any[]) => void;
  [tavern_events.TEXT_COMPLETION_SETTINGS_READY]: () => void;
  [tavern_events.CHAT_COMPLETION_SETTINGS_READY]: (generate_data: Object) => void;
  [tavern_events.CHAT_COMPLETION_PROMPT_READY]: (event_data: { chat: Object[], dryRun: boolean }) => void;
  [tavern_events.CHARACTER_FIRST_MESSAGE_SELECTED]: (event_args: { input: string, output: string, character: Object }) => void;
  [tavern_events.CHARACTER_DELETED]: (result: { id: string, character: Object }) => void;
  [tavern_events.CHARACTER_DUPLICATED]: (result: { oldAvatar: string, newAvatar: string }) => void;
  [tavern_events.STREAM_TOKEN_RECEIVED]: (text: string) => void;
  [tavern_events.FILE_ATTACHMENT_DELETED]: (url: string) => void;
  [tavern_events.WORLDINFO_FORCE_ACTIVATE]: (entries: Object[]) => void;
  [tavern_events.OPEN_CHARACTER_LIBRARY]: () => void;
  [tavern_events.ONLINE_STATUS_CHANGED]: () => void;
  [tavern_events.IMAGE_SWIPED]: (result: { message: Object, element: JQuery<HTMLElement>, direction: 'left' | 'right' }) => void;
  [tavern_events.CONNECTION_PROFILE_LOADED]: (profile_name: string) => void;
  [tavern_events.TOOL_CALLS_PERFORMED]: (tool_invocations: Object[]) => void;
  [tavern_events.TOOL_CALLS_RENDERED]: (tool_invocations: Object[]) => void;
  [custom_event: string]: Function;
};
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
async function eventOn(event_type: EventType, listener: Function): Promise<void>
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
async function eventMakeLast(event_type: EventType, listener: Function): Promise<void>
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
async function eventMakeFirst(event_type: EventType, listener: Function): Promise<void>
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
async function eventOnce(event_type: EventType, listener: Function): Promise<void>
```

#### 等待事件

```typescript
/**
 * 等待一次 `event_type` 事件
 *
 * @param event_type 要等待的事件
 *
 * @example
 * await eventWaitOnce(tavern_events.MESSAGE_DELETED);
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
 * await eventWaitOnce("存档", save);
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
 */
async function eventEmit(event_type: EventType, ...data: any[]): Promise<void>
```

示例:

```typescript
// 发送 "角色阶段更新完成" 事件, 所有监听该事件的 `listener` 都会被运行
eventEmit("角色阶段更新完成");
```

```typescript
// 发送 "存档" 事件, 并等待所有 `listener` (也许是负责存档的函数) 执行完毕后才继续
await eventEmit("存档");
```

```typescript
// 发送时携带数据 ["你好", 0]
eventEmit("事件", "你好", 0);
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
async function eventRemoveListener(event_type: EventType, listener: Function): Promise<void>
```

```typescript
/**
 * 取消本 iframe 中对 `event_type` 的所有监听
 *
 * @param event_type 要取消监听的事件
 */
async function eventClearEvent(event_type: EventType): Promise<void>
```

```typescript
/**
 * 取消本 iframe 中 `listener` 的的所有监听
 *
 * @param listener 要取消注册的函数
 */
async function eventClearListener(listener: Function): Promise<void>
```

```typescript
/**
 * 取消本 iframe 中对所有事件的所有监听
 */
async function eventClearAll(): Promise<void>
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
 * 替换字符串中的酒馆宏
 *
 * @param text 要替换的字符串
 * @returns 替换结果
 *
 * @example
 * const text = substitudeMacros("{{char}} speaks in {{lastMessageId}}");
 * text == "少女歌剧 speaks in 5";
 */
async function substitudeMacros(text: string): Promise<string>
```

```typescript
/**
 * 获取最新楼层 id
 *
 * @returns 最新楼层id
 */
async function getLastMessageId(): Promise<number>;
```

```typescript
/**
 * 生成唯一的 uuidv4 标识符
 *
 * @returns 唯一的 uuidv4 标识符
 */
function generateUuidv4(): string
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
