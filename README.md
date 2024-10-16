## 脚本注入

> 参考阡濯的[【SillyTavern / ST酒馆】html代码注入器](https://greasyfork.org/zh-CN/scripts/503174-sillytavern-st%E9%85%92%E9%A6%86-html%E4%BB%A3%E7%A0%81%E6%B3%A8%E5%85%A5%E5%99%A8)

---

**切勿在未经审查的情况下执行来自不明来源的 JavaScript 代码**

---

此扩展允许您在SillyTavern中运行外部JavaScript代码。由于SillyTavern默认不支持直接执行JavaScript代码，这个扩展通过使用iframe来隔离和执行脚本，从而让您在某些受限的上下文中运行外部脚本。
#### 使用方法
使用代码块包裹需要渲染的代码部分。
#### 示例
```html
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
    <h1>欢迎使用 JS 注入功能！</h1>
    <p>点击按钮显示一条消息：</p>
    <button onclick="showMessage()">点击我</button>
    <script>
      function showMessage() {
        alert("你点击了按钮！");
      }
    </script>
  </body>
</html>
```

### Quick Reply触发

triggerSlash 是扩展中内置的一个函数，允许在嵌入的 iframe 中执行 SillyTavern 内部的 Slash 命令（斜杠命令）。这些命令可以是任何已定义的 Slash 命令，如 /run、/echo 等。
#### 语法
```javascript
triggerSlash(commandText);
```
#### 参数
- `commandText`：一个字符串，表示要执行的 Slash 命令。
#### 示例
**触发 `/echo` 命令**：
```javascript
triggerSlash('/echo hello!');
```
执行 SillyTavern后页面将会弹出提示语 `hello!`
### 变量操作
扩展提供了两个函数用于获取和设置局部变量，这两个函数分别是 `getVariables()` 和 `setVariables()`。这些函数允许 `iframe` 中的脚本与主页面进行交互，从而实现持久化的状态管理。
#### 1. `getVariables()` 函数

- **功能**：获取当前聊天的局部变量并传递给 `iframe` 中的代码，该函数返回一个Promise，调用者可以使用 `.then()` 或 `async/await` 语法来处理异步结果。
- **返回值**：一个包含所有局部变量的对象。

##### 示例

```javascript
async function exampleUsage() {
  try {
    const variables = await getVariables();
    console.log("Retrieved variables from parent:", variables); // 可以在此处使用获取到的变量进行其他操作
  } catch (error) {
    console.error("Error retrieving variables:", error);
  }
}
exampleUsage();
```

- **说明**：
  - 主页面会向 `iframe` 返回当前的局部变量。
  - 变量会显示在浏览器的控制台中。

#### 2. `setVariables(newVariables)`函数

- **功能**：设置（或更新）当前聊天的局部变量并传递给 SillyTavern。
- **参数**：`newVariables` 是一个对象，包含你希望设置或更新的键值对。

##### 示例代码：设置局部变量

```javascript
function exampleUsage() {
    const newVariables = {
        theme: "dark",
        volume: 75, 
        isLoggedIn: true, 
        userInfo: { 
            name: "Alice",
            age: 30,
            preferences: {
                notifications: false,
                language: "en"
            }
        },
        recentActivities: ["login", "viewProfile", "updateSettings"],
    };
    setVariables(newVariables);
    console.log("Sent updated variables to parent:", newVariables);
}
// 调用示例函数以更新变量
exampleUsage();
```

- **说明**：
  - 如果键名一致，则更新值；如果不一致，则新增变量。
  - 主页面会更新这些局部变量，之后可以通过 `getVariables()` 函数再次获取到这些变量。

## 播放器功能

用于解决iframe之间难以继承播放进度的问题，变量操作的延伸功能。

### 基于酒馆扩展[Dynamic Audio](https://github.com/SillyTavern/Extension-Audio)的改动

- :wastebasket: 删除根据表情图切歌的功能

- :wastebasket: 删除从本地加载音频的功能

- :star: 现在从网络链接加载音频

- :star: 增加导入按钮，可以批量输入链接导入到歌单，重复链接会过滤，新插入的音频在最上方

- :star: 给音乐和音频播放器单独加上开关

- :star: 增加播放暂停按钮和播放进度显示

- :star: 新增几种播放模式，现在有【列表循环、随机播放、单曲循环、播完停止】四种模式

- :star: 注册了Quick Reply命令，现在不使用脚本注入，只启动播放器也可以使用快速回复听歌了

- :star: 音频的链接存储在当前聊天的局部变量中，切换聊天就会清空，切换回来时会再加载。可以使用listvar查看变量列表，变量名分别为`bgmurl`和`ambienturl`，支持使用Quick Reply对播放列表做更多自定义的改动

  

### 播放器Quick Reply命令

#### 1.播放器控制

```

/audioenable [type=bgm|ambient] [state=true|flase]?

```

控制音乐播放器或音效播放器的开启与关闭。

- type:音乐或音效

- state:开启或关闭，默认为true [可选]

例：`/audioenable type=ambient state=false`

  

#### 2.导入音频

```

/audioimport [type=bgm|ambient]  [play=true|flase]? url

```

导入音频链接到播放列表并播放

- type:音乐或音效

- play:是否导入之后立即播放第一个音频，默认为true [可选]

- url:要播放的音频链接，可以批量导入，多个链接之间用**英文**逗号隔开

  

例：`/audioimport type=ambient play=false url=https://example.com/sound1.mp3,https://example.com/sound2.mp3`

  

#### 3.选择音频

```

audioselect [type=bgm|ambient] url

```

选择指定的音频并播放

- type:音乐或音效

- url:要播放的音频链接，如果在播放列表里不存在则先导入再播放

例：`/audioselect type=bgm https://example.com/song.mp3`

#### 4.播放或暂停

```

/audioplay [type=bgm|ambient] [play=true|flase]?

```

- type:音乐或音效

- play:播放或暂停，不填写默认为true [可选]

例：`/audioplay type=ambient play=false`
