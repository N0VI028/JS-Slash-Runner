# :question:常见问题
## :calling: 我要安装&更新
> Q1.安装扩展之后没有反应？

A1.网络问题，安装扩展需要连接到 github，但 github 不开启 VPN 很难连接上，确保你的酒馆是通过 VPN 连接网络的。

> Q2.安装成功但是扩展界面里没有显示，在管理面板里发现扩展提示`Missing modules`，且无法选中启动选框？

A2.酒馆版本过低，扩展使用的模块在旧版本不支持导致的。需要升级酒馆，实测1.12.6之后的版本没有问题，最低支持版本不详:emoji_187: 

> Q3.再次安装扩展之后提示 `Extension installation failed,Directory already exists at data/default-user/extensions/JS-Slash-Runner`？

A3.这一般是网络情况所造成的后续问题，打开酒馆安装文件夹，进入 `data/default-user/extensions` 路径，删除 `JS-Slash-Runner` 整个文件夹后，重新在连接VPN的情况下于酒馆安装扩展。

> Q4.安卓手机要怎么进入酒馆的文件夹呢？

**A4.仅适用于部分安卓系统或手机品牌，未测试**
方法一：在启动了 `Termux` 的情况下， 点开你手机的文件管理 APP，从根目录开始，进入 Android 文件夹下的 data 文件夹，会提示访问限制，前往查看后，点开左上角侧边栏可以看到 `Termux`，点击进入即可访问酒馆路径

方法二：下载文件管理器Mixplorer 或 MT 管理器等管理器，在启动了 `Termux` 的情况下，于文件管理器 APP 内添加本地存储，之后的操作与方法一类似，点开左上角侧边栏可以看到 `Termux`，添加即可。此方法添加存储器后，需要频繁访问文件夹时比方法一更方便。

> Q5.安装扩展提示 `Extension installation failed，Server Error:Error: spawn git ENOENT at ChildProcess. handle. onexit`

A5.没有安装 git，或需要重新安装

> Q6.上面的方法都试过了还是不行？

A6.先连接 VPN，然后使用浏览器打开 [N0VI028/JS-Slash-Runner](https://github.com/N0VI028/JS-Slash-Runner) ，点击右上角绿色的 CODE 按钮，选择 Download ZIP，下载压缩包后，将压缩包内的文件夹重命名为 `JS-Slash-Runner`，移动到酒馆 `data/default-user/extensions` 路径下。

> Q7.更新时一直 `Loading third-party extensions... Please wait...` 加载，或者加载完之后没有显示扩展？

A7.同上，属于网络问题，安装问题的解决方式同样适用于更新。

## :magic_wand: 我是作者
> Q1.为什么我的代码没有渲染？

A1.
1. 代码内容使用代码块符号（三个 `）包裹起来了
2. 代码内容中有 `<body></body>` 的闭合标签
需要同时满足上面两个条件才能渲染出界面。

> Q2.界面渲染出来了一两秒就消失了？

A2.可能是插件冲突，检查是否开启了其他会插入或修改界面的扩展或者油猴插件，关闭掉试试。

> Q3.QR触发不起作用？

A3.检查代码中是否对triggerSlash进行了函数定义，例如下面的内容：
```
function triggerSlash(command) {
  console.log("send command:", command);
}
```
如有，删除掉，防止覆盖扩展的默认定义。