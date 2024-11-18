## 脚本注入

> 参考：
阡濯的[【SillyTavern / ST酒馆】html代码注入器](https://greasyfork.org/zh-CN/scripts/503174-sillytavern-st%E9%85%92%E9%A6%86-html%E4%BB%A3%E7%A0%81%E6%B3%A8%E5%85%A5%E5%99%A8)
酒馆官方扩展 [Dynamic Audio](https://github.com/SillyTavern/Extension-Audio)

---

**切勿在未经审查的情况下执行来自不明来源的 JavaScript 代码**

---

此扩展允许你在SillyTavern中运行外部JavaScript代码。由于SillyTavern默认不支持直接执行JavaScript代码，这个扩展通过使用iframe来隔离和执行脚本，从而让你在某些受限的上下文中运行外部脚本。
#### 使用方法
使用代码块包裹需要渲染的代码部分，如果代码块中没有同时存在`<body>`和`</body>`标签，则不进行渲染。
#### 示例
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
- **说明**：
  - body标签的父容器宽度已设定为聊天框的宽度，即对于body的宽度设定为width:50%时，将使其宽度以及iframe的宽度设定为聊天框的一半。你还可以使用`var(--parent-width)`来基于聊天框宽度设定样式。

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
执行后SillyTavern页面将会弹出提示语 `hello!`
### 变量操作
扩展提供了两个函数用于获取和设置SillyTavern中绑定到聊天的局部变量，这两个函数分别是 `getVariables()` 和 `setVariables()`。这些函数允许 `iframe` 中的脚本与主页面进行交互，从而实现持久化的状态管理。
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
  - SillyTavern会向 `iframe` 返回当前的局部变量。

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
  - SillyTavern会更新这些局部变量，之后可以通过 `getVariables()` 函数再次获取到这些变量。

## 播放器功能

用于解决iframe之间难以继承播放进度的问题，变量操作的延伸功能。

### 基于Dynamic Audio的改动

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
/audioselect [type=bgm|ambient] url
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

#### 5.模式切换

```
/audiomode [type=bgm|ambient] [mode=repeat|random|single|stop]
```

# :question:常见问答
## :calling: 我要安装&更新
> 安装扩展之后没有反应？

网络问题，安装扩展需要连接到 github，但 github 不开启 VPN 很难连接上，确保你的酒馆是通过 VPN 连接网络的。

> 再次安装扩展之后提示 `Extension installation failed,Directory already exists at data/default-user/extensions/JS-Slash-Runner`？

这一般是上一个情况所造成的后续问题，打开酒馆安装文件夹，进入 `data/default-user/extensions` 路径，删除 `JS-Slash-Runner` 整个文件夹后，重新在酒馆安装扩展。

> 安卓手机要怎么进入酒馆的文件夹呢？

**仅适用于部分安卓系统或手机品牌，未测试**
方法一：在启动了 `Termux` 的情况下， 点开你手机的文件管理 APP，从根目录开始，进入 Android 文件夹下的 data 文件夹，会提示访问限制，前往查看后，点开左上角侧边栏可以看到 `Termux`，点击进入即可访问酒馆路径

方法二：下载文件管理器Mixplorer 或 MT 管理器等管理器，在启动了 `Termux` 的情况下，于文件管理器 APP 内添加本地存储，之后的操作与方法一类似，点开左上角侧边栏可以看到 `Termux`，添加即可。此方法添加存储器后，需要频繁访问文件夹时比方法一更方便。具体操作从此楼层开始看：https://discord.com/channels/1134557553011998840/1296494001406345318/1307915735963799582

> 安装扩展提示 `Extension installation failed，Server Error:Error: spawn git ENOENT at ChildProcess. handle. onexit`

没有安装 git，详见：https://discord.com/channels/1134557553011998840/1296494001406345318/1308033318108921867

> 上面的方法都试过了还是不行？

先连接 VPN，然后使用浏览器打开 [N0VI028/JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner) ，点击右上角绿色的 CODE 按钮，选择 Download ZIP，下载压缩包后，将压缩包内的文件夹重命名为 `JS-Slash-Runner`，移动到酒馆 `data/default-user/extensions` 路径下。

> 更新时一直 `Loading third-party extensions... Please wait...` 加载，或者加载完之后没有显示扩展？

同上，属于网络问题，安装问题的解决方式同样适用于更新。

## :magic_wand: 我是作者
> 为什么我的代码没有渲染？

1. 代码内容使用代码块符号（三个 `）包裹起来了
2. 代码内容中有 `<body></body>` 的闭合标签
需要同时满足上面两个条件才能渲染出界面。

> 我的界面一开始渲染高度就无限增大？

body 和 html 的高度相关样式都避免使用 `vh`，`%` 等相对 iframe 高度的单位，因为 iframe 的高度基于内部内容，如果 body 和 html 的高度也不定，它们会互相叠加，左脚踩右脚上天……推荐给你的界面高度设定：1. 一个固定值；2. 依据某个属性计算；3. auto。

- type:音乐或音效

- mode:播放模式，分别是列表循环、随机播放、单曲循环、播完停止

例：`/audiomode type=ambient mode=random`
