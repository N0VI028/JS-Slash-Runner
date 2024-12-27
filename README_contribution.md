# 参与贡献

## 环境配置

你可以参考 [参与前端插件开发的 VSCode 环境配置](https://sillytavern-stage-girls-dog.readthedocs.io/tool_and_experience/js_slash_runner/index.html) 来得到 VSCode 上更详细的配置和使用教程.

- VSCode: 安装并导入 [VSCode 配置文件](https://gitgud.io/SmilingFace/tavern_resource/-/raw/main/工具经验/sillytavern.code-profile?inline=false)
- Git: 安装并将本项目克隆到酒馆的 `SillyTavern/public/scripts/extensions/third-party` 文件夹下, 在酒馆根目录进行 `npm install --dev --no-audit --no-fund --no-progress` 以得到酒馆的语法高亮.
- typescript: `npm install -g typescript`
- python

## 项目结构

项目采用 typescript 编写, 相较于 javascript 有更丰富的静态检查; 当然你也可以在开头加上一句 `// @ts-nocheck` 然后当作 javascript 写.

所有代码均位于 `src` 中, 你只应该对 `src/iframe_client_exported` 以外的代码进行修改, 然后运行 `python compile.py` 完成修改.

:alert: 在 ``import`` 其他脚本时, 记得使用 ``.js`` 后缀, 如 ``import { iframe_client } from "./iframe_client_exported/index.js";``.

```text
.
├── .vscode  # VSCode 调试任务设置
├── src
│   ├── iframe_client  # iframe 内可用的代码, 角色卡编写者能使用的 triggerSlash 等都位于此
│   │   │              #   由于它实际是 iframe 中的代码, 如果要与其他部分代码交互, 则要通过 window.parent.postMessage 发送消息
│   │   │              #
│   │   │              # 那么如何将这里的代码注入到 iframe 的 content 中呢?
│   │   │              #   运行 `python compile.py` 后,
│   │   │              #   这里所有代码会被保存为 iframe_client_exported/index.ts 中的 iframe_client 字符串,
│   │   │              #   因此直接用 `<script>${iframe_client}</script>` 即可
│   │   ├── tavern_event.ts
│   │   └── ...
│   │
│   ├── iframe_server  # 服务器端对 iframe 发送的 postMessage 进行处理, 从而完成对应功能
│   │   ├── tavern_event.ts
│   │   └── ...
│   │
│   ├── iframe_client_exported  # 由编译脚本自动生成
│   │   ├── index.ts            # 我们要将代码注入到 iframe 中则直接使用这个文件中的 iframe_client 字符串即可
│   │   └── ...
│   │
│   ├── slash_command  # 自定义的酒馆 Slash Command
│   │   ├── message_channel.ts
│   │   └── ...
│   │
│   ├── util  # 杂七杂八
│   │
│   ├── index.ts           # 主文件
│   ├── message_iframe.ts  # 楼层消息 iframe
│   └── script_iframe.ts   # 全局脚本 iframe
│
├── dist  # typescript 编译得到的 javascript 代码, 实际被酒馆使用, 但无需我们在意
│
├── compile.py     # 编译脚本
├── manifest.json  # 酒馆插件整体设置
└── tsconfig.json  # typescript 项目设置
```

## 一次完整的提交

1. 对除了 `src/iframe_client_exported` 以外的代码进行修改.
2. `python compile.py` 编译文件
3. 在酒馆网页或通过 VSCode 等调试添加的功能, 并修正、重新编译
4. 上传提交
