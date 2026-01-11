<!-- markdownlint-disable MD041 MD036 -->
## 4.3.20

### 📦函数

- 新增 `builtin.copyText` 函数, 用于复制文本到剪贴板

## 4.3.19

### 🗣提示词查看器

- 调整提示词列表的滑动流畅度

### 💬酒馆助手宏

- 修复在同一行使用多个 `{{format_message_variable::变量}}` 不能全部生效的问题

## 4.3.18

### 📦函数

- 现在, 如果对已经存在的角色卡使用 `importRawCharacter` 函数, 也会更新角色卡世界书. 例如你可以在角色卡脚本里这样做到自动更新角色卡:

  ```ts
  if (/** 通过某种方式检测到角色卡应该被更新, 如在一个世界书条目里填写版本号, 检测当前世界书版本号比网络最新的版本号低 */) {
    // 从链接更新角色卡
    await importRawCharacter(
      substitudeMacros('{{char}}'),
      await fetch('https://testingcf.jsdelivr.net/gh/lolo-desu/lolocard/src/日记络络/白化蓝染的日记本.png').then(response => response.blob()),
    );

    // 刷新酒馆来让酒馆读取更新后的角色卡
    toastr.success('角色卡自动更新成功, 准备刷新页面以生效...', '白化蓝染的日记本');
    setTimeout(() => triggerSlash('/reload-page'), 3000);
  }
  ```

## 4.3.17

### 🗣提示词查看器

- 为提示词查看器增加加载动画, 从而更明确提示**提示词查看器开启时, 将始终显示最新提示词**: 输入框的发送按钮、`/gen` 命令、`generate` 函数等所发送出的 AI 请求也会使得提示词查看器被更新
- 现在, 如果你还没有查看过提示词查看器右上角的**问号**, 它会闪烁直到你有点击过, 保证你知道提示词查看器挂着时会始终显示最新提示词

### 🐛修复

- `rebindGlobalWorldbooks` 后立即 `getGlobalWorldbookNames` 不能获取到最新全局世界书启用情况的问题

## 4.3.16

### 🐛修复

- 搜索框对某些正则表达式的处理

## 4.3.15

### 📕脚本库

- 处于禁用状态的脚本、文件夹名称将会半透明显示而不是被删除线覆盖
- 当脚本库完全禁用 (如整个角色脚本库被关闭) 或文件夹被禁用时, 其下的脚本、文件夹也会被正确半透明显示

### 🐛修复

- 优化预设脚本、角色卡脚本的导入和保存判定逻辑

## 4.3.14

### 🐛修复

- 修复在 `generate`、`generateRaw` 请求 AI 生成时如果玩家手动停止生成, 可能影响预设 "流式传输" 设置的问题

## 4.3.13

### 🗣提示词查看器

- 让提示词查看器支持搜索一些特殊字符

### 🔢变量管理器

- 让变量发生变化时的动画更正确地播放

### 🐛修复

- 避免火狐浏览器在控制台对前端界面的报错, **虽然并不影响实际使用** (by [ciallo-ollaic](https://github.com/N0VI028/JS-Slash-Runner/pull/69))

## 4.3.12

### 📦函数

- `generateRaw` 在一些情况下用 `inject` 注入提示词失败的问题

### 🐛修复

- 对酒馆 `1.12.10`~`1.12.12` 版本的兼容性

## 4.3.11

### 🎨渲染器

- 修复一些极端条件下的 iframe blob 渲染方式高度不正确的问题

### 📦函数

- 现在酒馆助手脚本注册的酒馆助手宏 `registerMacroLike` 会在脚本关闭时自动取消注册

## 4.3.10

### 💬酒馆助手宏

- 修复酒馆助手内置的变量宏在一些极端情况下不能正常获取变量的问题

### 📦函数

- 补充了很多酒馆新版本提供的事件
- 优化 `errorCatched` 捕获到的报错的显示

## 4.3.9

### 🎨渲染器

- 修复一些极端条件下的 iframe blob 渲染方式高度不正确的问题

### 💬酒馆助手宏

- `{{get_message_variable::变量}}` 和 `{{format_message_variable::变量}}` 将会忽略以 `$` 开头的变量. 如对于 `{ $meta: {}, 好感度: 0 }`, `{{get_message_variable::stat_data}}` 将只会返回 `{ 好感度: 0 }`

### 📦函数

- 现在 `generate` 和 `generateRaw` 的 `custom_api` 参数支持 `same_as_preset` 和 `unset` 值, 分别表示使用预设的值和不设置该参数. 如, 以下代码将会取消设置频率惩罚和存在惩罚, 方便不支持这些参数的模型.

  ```ts
  generate({
    custom_api: {
      frequency_penalty: 'unset',
      presence_penalty: 'unset',
    }
  })
  ```

## 4.3.8

### 🎨渲染器

- 尝试修复 4.0 后渲染优化导致的某些酒馆美化下前端代码块无法正常隐藏的问题

## 4.3.7

### 🔢变量管理器

- 现在你可以在一个脚本中用 `registerVariableSchema` 为变量管理器注册 zod 变量结构, 如 `stat_data.好感度` 必须是一个数值; 注册后, 如果实际变量不满足要求, 变量管理器将会提示错误信息.

## 4.3.6

### ⏫原生体验

- **`要加载 # 条消息`可以设置为任意非负数**: 原本酒馆只允许酒馆上方`人头`设置中的`要加载 # 条消息`设置为 5 的倍数, 现在你可以设置为任意非负数, 如设置为 `1` 来只显示聊天中最近的 1 楼消息, 从而让游玩酒馆更流畅.

## 4.3.5

### 📕脚本库

- 内置`删除角色卡时删除绑定的主要世界书`脚本, 添加后, 在删除角色卡时将会自动删除角色卡绑定的主要世界书

### 🐛修复

- `appendAudioList` 函数在一些版本下无法使用的问题
- `playAudio` 函数在一些情况下无法接续播放音频的问题

## 4.3.4

### 🗣提示词查看器

- 为提示词条目身份添加图标 (如 `⚙️ system`), 方便区分不同身份的提示词条目
- 延后提示词查看器对提示词的监听阶段, 从而让更多提示词处理脚本对提示词的处理能正确显示

## 4.3.3

### 🗣提示词查看器

- 新增了复制提示词功能, 可以复制所有提示词和单个提示词到剪贴板

### 🔍日志查看器

- 优化日志查看器的渲染性能

### 🐛修复

- 让搜索框更正确地区分输入的是普通字符串还是/正则/
- 修复 Blob 渲染模式高度不正确的问题

## 4.3.2

### ⏫原生体验

- **`要加载 # 条消息`将会实时去除旧楼层, 从而让游玩酒馆更流畅**: 如果设置`要加载 # 条消息`为 5, 则页面将最多显示 5 个楼层, 当发送新消息或收到新回复时, 旧楼层将会被自动移除.

## 4.3.1

### 🐛修复

- 修复部分设备对脚本的兼容性

## 4.3.0

### 🔍日志查看器

- 新增了日志查看器功能, 前端界面、脚本中的所有通过 `console` (`console.info` 等) 所记录下的日志都可以在日志查看器中直接查看, **方便手机玩家向前端界面、脚本作者汇报错误.**

## 4.2.1

### 🐛修复

- 酒馆助手对酒馆 1.12.10 的兼容性, **但建议更新酒馆到 1.13.3~1.13.4**
- 修复一些极小概率概率问题

## 4.2.0

### ⏫原生体验

- **`替换/更新`角色卡将会更新世界书: 你不需要在`替换/更新`角色卡之前删除世界书了!**
- **导出角色卡将始终导出最新世界书**

### 📕脚本库

- 在`替换/更新`角色卡时重新加载角色脚本

### 📦函数

- 现在 `eventOn` 等监听事件函数将会返回一个 `stop` 函数, 便于取消监听:

  ```ts
  // 监听消息接收, 当接收到消息时执行 listener
  const { stop } = eventOn(tavern_events.MESSAGE_RECEIVED, listener);

  // 取消监听
  stop();
  ```

- 现在 `injectPrompts` 将会返回一个 `uninject` 函数, 便于取消提示词注入

## 4.1.5

### 🐛修复

- 现在调整预设脚本将不会重新加载预设, 例如预设脚本的切换步骤按钮将正常生效

## 4.1.4

### 💬酒馆助手宏

- 新增 `{{format_message_variable::变量}}` 等 `{{format_xxx_variable}}` 宏. 相比起 `{{get_xxx_variable}}` 将变量显示为一行 JSON 字符串, `{{format_xxx_variable}}` 将变量显示为格式化后的 YAML 块:

  ```json
  // {{get_message_variable::stat_data}}
  {"青空黎":{"性别":"男"},"络络":{"亲密度":10,"阅读日记数量":0,"拥有联系方式":false},"世界":{"当前星期":"星期三","当前日期":"4月4日","当前时间阶段":1,"下次响应界面选择判断":0,"当前主线事件ID":"无","当前主线事件阶段":0,"当前主线故事大纲":"无","主线事件冷却计数":0}}
  ```

  ```yaml
  # {{format_message_variable::stat_data}}
  青空黎:
    性别: 男
  络络:
    亲密度: 10
    阅读日记数量: 0
    拥有联系方式: false
  世界:
    当前星期: 星期三
    当前日期: 4月4日
    当前时间阶段: 1
    下次响应界面选择判断: 0
    当前主线事件ID: 无
    当前主线事件阶段: 0
    当前主线故事大纲: 无
    主线事件冷却计数: 0
  ```

### 📦函数

- 导出 `builtin.parseRegexFromString` 函数, 用于将 `/字符串/` 转换为正则表达式

## 4.1.3

### 🐛修复

- 角色变量管理器的标题应该显示为 "角色" 而不是角色卡名称

## 4.1.2

### 🐛修复

- `setChatMessages` 在一些边界情况下出错的问题

## 4.1.1

### 🎨渲染器

- 让折叠代码块功能只在启用渲染器时生效

### 📕脚本库

- 添加复制脚本按钮, 点击即可复制脚本到其他脚本库
- 折叠"移动"、"复制"、"导出"、按钮, 点击"更多操作"按钮展开
- 当在脚本编辑界面修改按钮名称或增多减少按钮时会触发重启脚本

### 📦函数

- 现在 `registerMacroLike` 对于同样的正则表达式只会注册一次
- 补充 `unregisterMacroLike` 用于取消注册酒馆助手宏
- 在文档中指出函数可能抛出的异常, 在类型定义文件中也用 `@throws` 来标注函数可能抛出的异常

### 🐛修复

- 让 `getChatMessages` 和 `setChatMessages` 仅从 `chat_message.swipes.length` 判断 swipe 数量, 避免其他插件的影响
- 让 `errorCatched` 函数处理 Promise 的方式更正确
- `createChatMessages` 在一些边界情况下出错的问题
- `generate` 和 `generateRaw` 不能将存在惩罚和频率惩罚自定义为 0 的问题

## 4.1.0

### 📕脚本库

- 添加转移脚本按钮，点击即可将脚本转移到其他脚本库，当然你也可以直接拖拽脚本来转移脚本
- 为脚本拖动添加动画效果
- 优化脚本文件夹的拖动体验

## 4.0.21

### 🐛修复

- 内置库中`压缩相邻消息`脚本的链接地址错误
- 让前端界面或脚本的 `window.SillyTavern` 始终指向酒馆的最新上下文而非前端界面或脚本初始化时的上下文
- 假设脚本通过 `initializeGlobal` 向其他脚本共享出了接口, 而其他脚本通过 `waitGlobalInitialized` 等待了共享; 则之后即使共享接口的脚本重启, 它所共享出的接口依旧有效.

## 4.0.20

### 🗣提示词查看器

- 提示词查看器现在可以展示消息中的图片了

### 🐛修复

- 修复脚本库中文件夹可以拖动到文件夹内的错误嵌套行为, 注意文件夹本身是不支持嵌套的
- 修复导入角色卡并切换角色卡时, 极小概率下角色数据没有跟着切换的问题
- 保证一些玄学情况下脚本按钮依旧能够显示

## 4.0.19

### 🗣提示词查看器

- 提示词查看器现在可以展示使用中的模型和预设

## 4.0.18

### 🐛修复

- 编写参考中的 "酒馆 /STScript" 参考文件无法下载的问题; 当然更建议你直接使用[酒馆助手前端界面或脚本编写教程](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html)

## 4.0.17

### 🐛修复

- 4.0.15 后提示词查看器和变量管理器在电脑上无法拖动或改变大小的问题

## 4.0.16

### 🐛修复

- 4.0.14 后脚本名字中有 - 时无法操控脚本变量的问题

## 4.0.15

### 🐛修复

- 提示词查看器和变量管理器在移动端初始高度过小的问题
- 与 3.2.3 以前导出的带脚本角色卡的兼容性

## 4.0.14

### 📦函数

- 为 `generate` 和 `generateRaw` 的自定义 API 新增 `temperature` 等参数, 更方便的调用可能得重写整个函数了, 看情况再说
- 导出 `builtin.duringGenerating` 函数, 用于判断酒馆是否正在请求生成
- 导出 `builtin.renderMarkdown` 函数, 用于将 markdown 字符串转换为 HTML
- 导出 `builtin.uuidv4` 函数, 用于生成 UUID
- 为前端界面和脚本直接提供酒馆内置的 `showdown` 库, 并在编写模板中更新它的类型定义从而让 AI 知道
- 新增 `reloadIframe` 函数, 便于在前端界面或脚本内重新加载该前端界面或脚本. 如在聊天文件切换时:

  ```ts
  // 当聊天文件变更时, 重新加载前端界面或脚本
  let current_chat_id = SillyTavern.getCurrentChatId();
  eventOn(tavern_events.CHAT_CHANGED, chat_id => {
    if (current_chat_id !== chat_id) {
      current_chat_id = chat_id;
      reloadIframe();
    }
  })
  ```

### 🐛修复

- 在脚本库中选择 "包含数据导出" 时无法导出变量的问题
- 4.0.10 后 `replaceVariables` 对脚本变量保存失效的问题

### 🔧杂项

- 更换解析 markdown 所使用的库, 便于支持 raw html

## 4.0.13

### 🗣提示词查看器

- 现在提示词查看器能正确估算带图片、视频消息的 token 数

### 🐛修复

- 修复酒馆消息中有图片时, 酒馆助手宏会失效的问题

### 📦函数

- 导出酒馆计算图片、视频 token 的接口到 `builtin.getImageTokenCost` 和 `builtin.getVideoTokenCost`
- 调整 `tavern_events.GENERATE_AFTER_DATA` 等事件的参数[类型定义](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/iframe/exported.sillytavern.d.ts#L23), 现在能正确反映酒馆发送图片、视频给 AI 的情况

## 4.0.12

### 📕脚本库

- 将预设脚本库挪到了角色脚本库下面, 因为不常用

### 📦函数

- 将 `initializeGlobal` 和 `waitGlobalInitialized` 函数加入到 `TavernHelper` 接口中, 而不只是前端界面或脚本中可用, 便于扩展用它与脚本分享接口 (如 `waitGlobalInitialized('Mvu')` 来等待 `Mvu` 接口初始化完毕)

### 🔧杂项

- 将全局 `TavernHelper` 接口的注册时间提前, 从而尝试解决一些设备、网络环境使用依赖于酒馆助手的插件时的问题
- 取消使用酒馆 1.13.0 才有的某个功能, 从而恢复对酒馆 1.12.10 的兼容性

## 4.0.11

### 🎨渲染器

- 调整酒馆助手宏渲染逻辑, 让它始终在前端界面渲染前渲染

### 🔧杂项

- 处理一些酒馆特殊设置引起的问题

## 4.0.10

### 🎨渲染器

- 调整前端界面渲染逻辑, 避免某些设备上重新渲染

### 📕脚本库

- 调整脚本刷新逻辑, 使之更符合 3.0 的刷新逻辑
- 调整脚本按钮的显示时延和插入逻辑, 使之与 [Samueras/GuidedGenerations-Extension](https://github.com/Samueras/GuidedGenerations-Extension) 等兼容, 不会让酒馆卡死

### 🔧杂项

- 恢复了前端界面、脚本间 lodash 库的隔离性, 避免 AI 误操作修改了 `_.remove` 等命令

## 4.0.9

### 📕脚本库

- 切换角色卡时角色脚本可能加载失败的问题

## 4.0.8

### 🎨渲染器

- 修复了因未知原因导致重复渲染前端界面的问题, 虽然到现在我也不知道原因, 但反正修了 ()

### 🔧杂项

- 为方便 QR 助手兼容，对 `<div class="qr--buttons">` 补充了 `id` 属性.

## 4.0.7

### 🎨渲染器

- 响应式设置渲染深度: 改变渲染深度后立即调整前端界面的渲染情况
- 优化前端界面对高度的调整机制
- 避免前端界面重复渲染
- 调整折叠代码块的显示样式及逻辑

### 🗣提示词查看器

- 修复神秘 Vue 导致的提示词查看器概率空白问题

## 4.0.6

### 🔧杂项

- 将酒馆助手加载顺序调回 `"loading_order": 100`, 以期解决一些玄学问题

## 4.0.5

### 🔢变量管理器

- 让新楼层出现时楼层变量的更新逻辑更符合直觉

### 🗣提示词查看器

- 现在如果在 AI 回复途中打开提示词查看器, 不会再中断 AI 回复

## 4.0.4

### 🎨渲染器

- 现在流式过程中也会应用【折叠代码块】功能

## 4.0.3

### 🐛修复

- 4.0.0 后 `generate` 请求非流回复时会空回的问题
- 现在 `generate` 使用非流时能正常进行工具调用

## 4.0.2

### 🐛修复

- 更新按钮无法使用的问题
- 让对旧数据的转换更正确

## 4.0.1

### 🐛修复

- 修复前端界面与一些美化之间的冲突

## 4.0.0

**用 Vue + Pinia + TailwindCSS 完全重写了酒馆助手.**

### 🎨渲染器

- 移除了 2.0.10 加入的【启用加载动画】选项, 渲染逻辑改为先显示界面再加载网络资源, 避免用户误认为前端界面加载很慢是酒馆助手导致的 (实际上, 加载慢应该考虑网络问题).
- 为【折叠代码块】新增只折叠前端界面代码块的选项, 便于设置了渲染深度的玩家查看以前的消息.

### 📕脚本库

- 现在预设也可以绑定酒馆助手脚本了, 从而方便门之主写卡助手这类有配套脚本的预设, 及 SPreset 等可以绑定在预设上方便导入的脚本.
- 移除脚本库的【移动到另一脚本库】按钮, 现在你可以直接将脚本拖动到另一个脚本库.
- 移除了使用较少的脚本批量操作功能, 请将脚本放入同一文件夹后进行操作来替代.
- 在脚本编辑界面, 为脚本按钮设置了总开关, 你可以方便地一键启用/禁用所有脚本按钮.
- 为脚本编辑界面的脚本内容、作者备注、变量列表界面添加了全屏按钮, 便于查看和编辑.

### 🔢变量管理器

- 翻译并调整了 [svelte-jsoneditor](https://github.com/josdejong/svelte-jsoneditor) 作为新的变量管理器, 用 250mb 的数据进行测试没有卡顿.
- 新的变量管理器支持【文本】、【树状】两种视图, 未来将继续支持【卡片】视图.
- 你现在可以将变量管理器窗口拖动到最左边或最右边, 从而让窗口吸附在酒馆界面边缘.
- 将变量管理器在移动端的显示逻辑改为始终吸顶显示.

### 🗣提示词查看器

- 优化了提示词查看器的性能. 用 28179 楼聊天记录 (206.9mb) 进行测试, 虽然酒馆本身对提示词的处理变得慢, 但提示词查看器对它的显示没有卡顿.
- 增加了等待画面和使用说明, 以说明提示词查看器**永远显示最新提示词**.
- 增加了展开全部、折叠全部按钮, 并对于用户的折叠喜好进行记忆, 迎合不同的使用习惯.
- 你现在可以将提示词查看器窗口拖动到最左边或最右边, 从而让窗口吸附在酒馆界面边缘.
- 将提示词查看器在移动端的显示逻辑改为始终吸顶显示.

### 🎧播放器

- 新增音频标题功能. 你现在可以为导入的音频设置一个标题, 从而更方便地在 UI 中管理播放列表.
- 调整音频导入 UI, 支持单个链接导入和批量导入两种模式.
- 调整了音量控制器的位置, 方便移动端用户操作.
- 移除了播放器的冷却时间和淡入淡出功能.
- 为音频播放器制作了[新的函数接口](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/播放音频/播放状态.html)
- 不再维护 `/audioselect` 等快速回复命令 (旧角色卡不受影响), 因为酒馆助手脚本完全兼容和上位替代快速回复.
- 不再维护 `audioenable`、`audioplay`、`audioMode` 等旧命令, 建议以新的 `playAudio`、`pauseAudio`、`setAudioSettings` 等函数代替.

### 🌐i18n 国际化

- 对酒馆助手进行了英文翻译. 现在酒馆语言选择英文时, 酒馆助手也将显示英文界面.

### 💬酒馆助手宏

- 补充了 `{{get_character_variable::变量}}` 和 `{{get_preset_variable::变量}}`, 用于获取当前角色卡和预设的变量

### 📦函数

- `getVariables`、`replaceVariables` 等[变量相关函数](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/变量/变量类型.html)现在支持处理预设变量 (`'preset'`) 和第三方插件常用的扩展变量 (`'extension'`).
- 现在在脚本内操作脚本变量时, 你可以只写 `getVariables({type: 'script'})` 而不需要传入 `script_id` 参数.
- `replaceVariables` 不再需要 `await`.
- 新增 [`getAllEnabledScriptButtons`](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/脚本额外功能.html#getallenabledscriptbuttons) 函数用于获取当前处于启用状态的所有脚本按钮, 方便 QR 助手对脚本按钮进行适配
- 新增 `installExtension` 等[安装酒馆插件](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/安装酒馆扩展.html)相关接口, 现在你可以简单地在酒馆助手中安装、更新、卸载酒馆插件了 (虽然已经有[自动安装插件脚本](https://stagedog.github.io/青空莉/作品集/)).
- 新增 `getTavernHelperExtensionId` 函数用于获取酒馆助手扩展 ID.
- 新增 `getTavernVersion` 函数用于[获取酒馆版本](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/查询版本.html).
- 为音频播放器制作了[新的函数接口](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/播放音频/播放状态.html)

### 🔧杂项

- 移除了主界面上的酒馆助手总开关. 如需要完全禁用酒馆助手, 请使用酒馆扩展管理按钮.
- 插件主界面将会记忆用户最后选择的功能面板, 下次打开时会自动显示.
- 补充了一些酒馆事件的类型定义, 请使用酒馆助手前端界面或脚本编写模板的作者[更新模板](https://stagedog.github.io/青空莉/工具经验/实时编写前端界面或脚本/如何更新模板/).

### 3.6.13

### ⏫功能

- 为 `generate` 和 `generateRaw` 添加 `iframe_events.GENERATION_BEFORE_END` 事件, 以便在生成结束前由提示词模板等脚本更改结果

## 3.6.12

### 🐛修复

- 3.6.3 后 `replaceTavernRegexes` 成功修改正则，但正则界面对正则的显示没刷新

## 3.6.11

### 💻界面

- 移除了酒馆助手设置中的 `token 数过多提醒` 功能, 因为并没有解决答疑频道问类似问题人很多的问题; 需要此功能请在 `酒馆助手-内置库` 中添加 `token 数过多提醒脚本`

### ⏫功能

**内置库:**

- 添加`token数过多提醒`脚本, 可以提醒你 token 数过多

## 3.6.10

### 💻界面

- 提示词查看器上面的提示信息改为显示 5 秒后自动消失, 避免占用手机屏幕空间

## 3.6.9

### 💻界面

- 考虑到答疑频道提问这类问题的人有很多, 在酒馆助手设置中新增 `token 数过多提醒` 功能, 当聊天 token 数过多时会提醒你总结前文

## 3.6.8

### 🐛修复

- 与最新版提示词模板的消息楼层变量兼容性

## 3.6.7

### 🐛修复

- 让 `getChatMessages` 和 `replaceChatMessages` 对多 swipe 楼层的处理更为正确

## 3.6.6

### 💻界面

- 在一些容易发问的地方提示**“酒馆助手正在完全重写”**

## 3.6.5

### ⏫功能

- 补充 @zonde306 在酒馆 1.13.4 新增的事件 `tavern_events.WORLDINFO_ENTRIES_LOADED` 的[类型定义](https://github.com/N0VI028/JS-Slash-Runner/blob/3eb2beaa13e5f11626ff37e20d55b0f8e4cb3a60/%40types/iframe/event.d.ts#L381-L386), 监听该事件可以在世界书激活前调整预激活的世界书条目
- 调整`tavern_events.WORLD_INFO_ACTIVATED` 的[类型定义](https://github.com/N0VI028/JS-Slash-Runner/blob/3eb2beaa13e5f11626ff37e20d55b0f8e4cb3a60/%40types/iframe/event.d.ts#L327-L329), 监听该事件可以在世界书激活后调整激活的世界书条目

## 3.6.4

### 💻界面

- 将变量管理器的 `消息` 选项卡改为 `消息楼层` 选项卡, 避免歧义
- 减少变量管理器消息楼层选项卡默认显示的楼层数, 暂时避免卡顿; 其余问题将在完全重写完酒馆助手后优化

## 3.6.3

### 💻界面

- 在提示词查看器界面新增了一条说明 `💡 这个窗口打开时, 你也可以自己发送消息来刷新提示词发送情况`, 提醒对于 `generate` 和 `generateRaw` 也可以通过提示词查看器查看发送结果

### ⏫功能

- 优化 `replaceTavernRegexes` 的性能

### 🐛修复

- 修复提示词模板和酒馆助手宏在消息楼层中的渲染顺序冲突, 导致 `{{get_message_variable::}}` 等宏不能正常显示的问题

## 3.6.2

### ⏫功能

- 为前端和脚本默认置入了 [`pixi.js` 库](https://pixijs.com/), 便于制作 live2d、动画、播放器等.
- 新增 `waitGlobalInitialized` 函数, 便于等待其他 iframe 中共享出来的全局接口初始化完毕, 并使之在当前 iframe 中可用. 如 `Mvu`:

  ```typescript
  await waitGlobalInitialized('Mvu');
  ...此后可以直接使用 Mvu
  ```

- 新增 `initializeGlobal` 函数, 便于将接口共享到全局, 使之在其他 iframe 中可用. 如 `Mvu`:

  ```typescript
  initializeGlobal('Mvu', Mvu);
  ...此后其他 iframe 将能通过 `await waitGlobalInitialized('Mvu')` 来等待初始化完毕, 从而用 `Mvu` 为变量名访问该接口
  ```

### 🐛修复

- 修复 `setLorebookSettings` 不能正确设置某些设置的问题

## 3.6.1

### ⏫功能

- (破坏性) 将原本的 `Character` 重命名为 `RawCharacter`, 为之后制作角色卡接口 `Character` 腾位置, **请尽量迁移原来使用的 `Character` 为 `RawCharacter`**

### 🐛修复

- 优化实时监听对脚本和前端界面的重新渲染方式

## 3.6.0

### 💻界面

- 移除了 `渲染器` 页面的 `启用渲染优化` 开关, 现在会**始终启用渲染优化**, 且不会影响其他代码块的高亮.

### 🐛修复

- 确保了对 html 代码块中酒馆助手宏的替换发生在 html 代码块被渲染成前端界面前

## 3.5.1

### 💻界面

- 拆分 `调试模式` 和 `Blob URL 渲染` 为两个独立的设置

### 🐛修复

- 修复 `insertOrAssignVariables`、`insertVariables` 和 `getAllVariables` 对数组合并方式的处理. 现在如果插入新数组, 将会覆盖旧数组, 而不是合并

## 3.5.0

### 💻界面

- 现在你可以在酒馆助手设置中自行禁用 2.0.10 时添加的加载动画, 而不是期待作者在 html 里添加 `<!-- disable-default-loading -->` 来禁用
- 现在启用调试模式还会将脚本和前端界面渲染为 Blob URL, 而不是自行在 html 里添加 `<!-- enable-blob-url-render -->` 来启用

### ⏫功能

- 新增 `importRawChat` 函数, 便于像酒馆界面里那样导入聊天文件
- 现在 `setChatMessages` 支持使用深度参数, 如 `setChatMessages([{ message_id: -1, message: '新的消息' }])` 表示修改最后一楼的正文

### 🐛修复

- 让 `setChatMessages` 渲染结果更贴近酒馆原生

## 3.4.21

### ⏫功能

- 使用 `stopGenerationById` 和 `stopAllGeneration` 时, 会发送 `tavern_events.GENERATION_STOPPED` 事件, 并携带停止的生成 ID

### 🐛修复

- 让切换角色卡时对角色脚本的处理更正确, 例如在脚本卸载时使用 `replaceScriptButtons` 不会导致脚本被复制到其他角色卡中了

## 3.4.20

### ⏫功能

- 为脚本和前端界面加入 `jquery-ui-touch-punch` 库, 让手机也能正常使用 jQuery UI 组件
- `generate`和`generateRaw`现在支持通过 `generation_id` 参数自定义生成ID，达到同时运行多个生成任务的效果，并支持通过 `stopGenerationById` 停止特定生成，`stopAllGeneration` 停止所有通过酒馆助手请求的生成（不包括酒馆自身请求）

### 🐛修复

- 避免 `createChatMessages` 在未要求未设置 `data` 时设置 `data` 为空对象, 导致 `{{get_message_variable}}` 不可用的问题
- 修复酒馆助手宏在代码块内对含 `<user>` 文本的渲染问题
- 修复 `importRawPreset` 在酒馆新版本不能正确导入预设的问题
- 修复开关酒馆助手宏过快可能导致意外的问题

## 3.4.19

### 🐛修复

- 脚本按钮名称中不能有 `"` 的问题
- 在手机点击脚本按钮会收起输入法的问题

## 3.4.18

### 🐛修复

- `getAllVariables` 可能获取不到当前楼层变量的问题
- 修复 `replaceVariables` 在另一些情况下不能正确保存对脚本变量的修改的问题

## 3.4.17

### ⏫功能

- 在代码任意处写入注释`<!--enable-blob-url-render-->` 后将用 `blob-url` 渲染, 而不使用 `srcdoc`. 这种渲染更方便查看日志和调试, 但一些国产浏览器不支持.
- 为了更好的 Vue 兼容性, 为 iframe 添加全局变量 `Vue` 和 `VueRouter`

### 🐛修复

- 修复与酒馆 1.12.10 的兼容性

## 3.4.16

### ⏫功能

- 新增导入酒馆角色卡、预设、世界书、酒馆正则功能 (`importRawCharacter` 等接口), 你可以直接从酒馆界面导出角色卡、预设、世界书、酒馆正则，而使用这些函数导入它们, 由此便于有人希望利用 gitlab、github 制作**自动更新角色卡、预设、世界书酒馆正则功能**, 具体见于[类型文件](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/function/import_raw.d.ts)

### 🐛修复

- 修复 `setChatMessage` 在一些情况下渲染出错的问题
- 修复某些框架不使用酒馆助手模板而依赖了有问题的代码, 在新版本不可用的问题

## 3.4.15

### ⏫功能

- 新增 `injectPrompts` 和 `uninjectPrompts` 函数, 便于注入和移除提示词

### 🐛修复

- 修复 `replaceVariables` 在一些情况下不能正确保存对脚本变量的修改的问题

## 3.4.14

### ⏫功能

- 新增 `getScriptInfo` 和 `replaceScriptInfo` 函数, 便于获取和替换脚本作者注释
- 对酒馆用于注册函数调用的函数 `SillyTavern.registerFunctionTool` 添加类型定义, 具体见于[类型文件](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/iframe/exported.sillytavern.d.ts)

## 3.4.13

### 💻界面

- 让脚本库中关闭的脚本像正则那样名字带有删除线
- 变量管理器和提示词查看器的窗口大小添加记忆功能, 下次打开时会自动恢复到上次的大小

### ⏫功能

- 为 `getScriptButtons` 等脚本按钮函数移除 `script_id` 参数, 现在你可以在脚本中直接调用它们而无需传入 `getScriptId()` 参数 (以前的代码依旧有效):

  ```typescript
  // 以前
  const buttons = getScriptButtons(getScriptId());

  // 现在
  const buttons = getScriptButtons();
  ```

### 🐛修复

- 为流式 `generate` 函数补充 `iframe_events.GENERATION_STARTED` 事件
- 修复 `createChatMessages` 对 `system` 消息的处理

## 3.4.12

### 💻界面

- 调整`酒馆助手设置-编写参考`的显示
- 移除`酒馆助手设置-实时监听-监听地址`, 避免有人跳着看教程而填错

### ⏫功能

- 为前端界面添加 tailwindcss cdn 版支持. 其提供了很多预定义样式, 例如 `class="items-center"` 表示居中对齐.
- 更新 `font-awesome` 图标库为 `@fortawesome/fontawesome-free` 版本

### 🐛修复

- 取消预设函数隐式将酒馆系统提示词 (Main Prompt、Auxiliary Prompt、Post-Instruction Prompt、Enhance Definition) 转换为一般提示词的功能, 因为这似乎会导致酒馆清空这几个条目.

  但酒馆系统提示词与一般提示词相比并无优势, 甚至缺少更改插入位置为聊天中的功能, 因此并不建议你使用.

- 修复 `createChatMessages` 对 `refresh: none` 的处理
- 修复 `createChatMessages` 在尾部插入消息时不会处理酒馆助手渲染的问题
- 清理 `getWorldbook` 获取的 `recursion.delay_until`、`effect.sticky`、`effect.cooldown`、`effect.delay` 等字段, 将 `0` 等无效值转换为 `null`
- 修复 `getPreset` 提取出的老预设存在的类型错误

## 3.4.11

### ⏫功能

- ~~趁没人用~~调整预设提示词条目的插入字段 (`prompt.position`), 添加新酒馆的插入顺序字段 (`prompt.injection_order`).
- 将预设占位符提示词的 id 从 `snake_case` 改为 `camelCase`, 便于与酒馆界面交互.

### 🐛修复

- 修复了提示词查看器搜索功能的问题
- 修复预设文件中可能不存在 `marker` 字段而导致预设函数不可用的问题

## 3.4.10

### 💻界面

- 在`酒馆助手设置-主设置-开发工具`中新增`禁用酒馆助手宏`功能, 方便使用写卡预设/世界书时, 将人设模板中的 `{{get_message_variable::变量}}` 等酒馆助手宏直接发给 AI 而不进行替换. 也就是说:
  - 使用写卡预设时: 开启"酒馆助手"的`禁用酒馆助手宏`和关闭"提示词模板", 以便发送人设模板让 AI 给你输出人设
  - 游玩/测试角色卡时: 关闭"酒馆助手"的`禁用酒馆助手宏`和关闭"提示词模板", 从而让酒馆助手宏和提示词模板 EJS 得到替换和执行处理,让动态提示词生效

## 3.4.9

### 🐛修复

- 让酒馆助手的加载不再依赖于任何网络文件, 避免 `failed to load: [object Event]`

## 3.4.8

### 💻界面

- 让变量管理器更紧凑

### ⏫功能

- **`generate`函数和 `generateRaw` 函数现在支持自定义 api 了**

  ```typescript
  const result = await generate({
    user_input: '你好',
    custom_api: {
      apiurl: 'https://your-proxy-url.com',
      key: 'your-api-key',
      model: 'gpt-4',
      source: 'openai'
    }
  });
  ```

- 新增 `getButtonEvent` 来获取脚本按钮对应的事件
- 弃用 `eventOnButton`, 请使用 `eventOn(getButtonEvent('按钮名称'), 函数)` 代替
- `generate` 和 `generateRaw` 现在可以自定义请求的API了

### 🐛修复

- `createWorldbookEntries` 和 `deleteWorldbookEntries` 不可用的问题
- 修改变量管理器嵌套卡片的排版，扩大文本显示范围

## 3.4.7

### ⏫功能

- 优化事件监听的性能

### 🐛修复

- 尝试修复切换角色卡时事件监听没能正确卸载的问题

## 3.4.6

### 🐛修复

- 移除不常使用的油猴兼容性设置，想要使用相关功能请直接安装原作者的[油猴脚本](https://greasyfork.org/zh-CN/scripts/503174-sillytavern-st%E9%85%92%E9%A6%86-html%E4%BB%A3%E7%A0%81%E6%B3%A8%E5%85%A5%E5%99%A8)
- 修复在 QR 启用但没有显示任何 QR 组，并且启用了复数个拥有按钮的脚本时，按钮无法正确显示的问题

## 3.4.5

### ⏫功能

- 优化 `replacePreset` 和 `updatePresetWith` 的性能

## 3.4.4

### 📚脚本库

**内置库:**

- 添加`预设条目更多按钮`脚本, 可以一键新建/复制条目到某条目附近
- 移除了不太常用的[`样式加载`](https://discord.com/channels/1291925535324110879/1354783717910122496)和容易被误用的[`资源预载`](https://discord.com/channels/1291925535324110879/1354791063935520898)脚本, 需要请查看脚本原帖

### 🐛修复

- `replacePreset` 不能正确处理预设提示词 id 冲突的问题

## 3.4.3

### ⏫功能

- 为预设和世界书操作新增可选选项 `render:'debounced'|'immediate'`, 用于控制是否防抖渲染. 默认使用防抖渲染, 因为大多数情况下不需要立即渲染.
- 将酒馆的 `PromptManager` 导出到 `builtin` 中, 并额外提供 `builtin.renderPromptManager` 和 `builtin.renderPromptManagerDebounced` 函数, 用于刷新预设提示词的渲染.

## 3.4.2

### 🐛修复

- `replareWorldbook` 不能正确处理关键字的问题

## 3.4.1

### ⏫功能

**提示词发送情况查看:**

- 内置库中的 "查看提示词发送" 脚本已经调整为内置功能, 在工具箱或界面左下角魔法棒快捷菜单中即可找到入口. **它会显示酒馆经过处理后最终发给 ai 的提示词**, 因此将正确处理一些特殊机制, 得到**真实的提示词和相对真实的提示词 token 数**. 特殊机制包含但不限于:
  - 世界书绿灯条目的激活
  - 预设的 "压缩系统消息" 功能
  - 提示词模板
  - 酒馆、酒馆助手宏
  - 角色卡里其他监听提示词发送而进行的脚本

- 支持随消息发送自动刷新
- 可按内容搜索（支持正则表达式），以及根据消息role筛选
- 搜索时勾选“仅显示匹配”可在搜索结果中折叠匹配部分外的上下文

**世界书:**

- 新增 `createWorldbookEntries` 和 `deleteWorldbookEntries` 函数, 便于向世界书新增和删除条目

  ```typescript
  // 创建两个条目, 一个标题叫 "神乐光", 一个留白
  const { worldbook, new_entries } = await createWorldbookEntries('eramgt少女歌剧', [{ name: '神乐光' }, {}]);
  ```

  ```typescript
   // 删除所有名字中包含 `神乐光` 的条目
   const { worldbook, deleted_entries } = await deleteWorldbookEntries('eramgt少女歌剧', entry => entry.name.includes('神乐光'));
  ```

### 🐛修复

- 将 `createChatMessages` 的默认 `refresh` 选项修复为用 `'affected'`, 从而避免在尾部创建消息时刷新整个聊天消息
- 让 `generate` 函数也能触发提示词模板

## 3.4.0

### 📚脚本库

**内置库:**

- 新增 `世界书强制用推荐的全局设置` 脚本. 这是大多数作者写卡时的默认设置, 本来就没有玩家去修改的必要

### ⏫功能

**世界书:**

- 重新制作世界书接口 `Worldbook`, 原本的所有 `Lorebook` 函数均被弃用 (但仍可运行), 请使用 `Worldbook` 接口, 具体见于[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/%E5%8A%9F%E8%83%BD%E8%AF%A6%E6%83%85/%E4%B8%96%E7%95%8C%E4%B9%A6/%E4%BF%AE%E6%94%B9%E4%B8%96%E7%95%8C%E4%B9%A6.html)或[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/function/worldbook.d.ts)
  - 移除了 `getLorebookSettings` 等控制全局设置的功能, 因为很少有需要改动的时候, 取而代之的是内置库新增 `世界书强制用推荐的全局设置` 脚本
  - `getWorldbook` 将直接返回按世界书 "自定义顺序" 排序好的数组 (不知道自定义顺序是什么? 请查看内置库中的 "世界书强制自定义顺序" 说明)

**MVU 变量框架:**

- 新增了 mvu 接口, 现在你可以通过 `Mvu` 来使用 MVU 变量框架中的功能了 (解析 ai 输出的更新命令、监听 mvu 更新变量事件从而调整变量或触发剧情等), 具体见于[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/%E5%8A%9F%E8%83%BD%E8%AF%A6%E6%83%85/%E6%8E%A5%E5%8F%A3%E8%AE%BF%E9%97%AE.html#mvu-%E5%8F%98%E9%87%8F%E6%A1%86%E6%9E%B6)和[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/iframe_client/exported.mvu.d.ts), 例如:

  ```typescript
  // 解析包含 _.set() 命令的消息, 从而更新络络好感度为 30
  const old_data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
  const new_data = await Mvu.parseMessage("_.set('角色.络络.好感度', 30); // 强制修改", old_data);
  ```

  ```typescript
  // 在 mvu 变量更新结束时, 保持好感度不低于 0
  eventOn('mag_variable_update_ended', (variables) => {
    if (_.get(variables, 'stat_data.角色.络络.好感度') < 0) {
      _.set(variables, 'stat_data.角色.络络.好感度', 0);
    }
  });
  ```

**变量:**

- 让 `insertOrAssignVariables` 等变量函数返回更新后的变量表, 便于在脚本中使用

**脚本按钮:**

- 新增 `appendInexistentScriptButtons` 函数, 便于为已经有按钮的脚本新增脚本按钮, 例如角色卡作者可能在导入 mvu (`import 'https://testingcf.jsdelivr.net/gh/MagicalAstrogy/MagVarUpdate@master/artifact/bundle.js'`) 的脚本中自己额外写了代码和按钮, mvu 则可以新增 "重新处理变量" 等按钮但不影响角色卡作者已经写的按钮.

### 🐛修复

- 修复与酒馆 1.12.10 的兼容性
- 修复了无法通过脚本库点开内置库的问题
- 修复了预设对当前加载到设置中的预设内容 (`'in_use'`) 的获取和修改功能
- 修复了 `getPreset` 对预设提示词列表中占位提示词 (如 Chat History) 等开启状态的获取
- 补充了事件发送, 修复了提示词模板更换时间后 `generate` 函数不会触发提示词模板的问题
- 尝试修复切换角色卡时事件监听未能移除的问题

## 3.3.4

### 🐛修复

- `getLorebookEntries` 在一些情况不可用的问题

## 3.3.3

### 🐛修复

- `getLorebookEntries` 在一些情况不可用的问题

## 3.3.2

### ⏫功能

- 更换了内置脚本库等的网络链接 (从 `fastly.jsdelivr.net` 更换为 `testingcf.jsdelivr.net`), 让国内更容易访问
- 为前端和脚本默认置入了 [`zod` 库](https://zod.dev/basics). 通过这个库, 你可以更方便地解析 ai 输出的数据, 并对不符的数据进行**中文报错**. 如果已经配置了[编写模板](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html)请下载新的模板.

  ```typescript
  // 定义一个手机消息数据类型
  type PhoneMessage = z.infer<typeof PhoneMessage>;
  const PhoneMessage = z.object({
    name: z.string()       // `name` 是一个字符串
           .catch('络络'),  // 如果 ai 错误输出了数字之类的, 用 '络络'

    content: z.string()
              .default('络络'),  // 如果 ai 忘了输出 `content`, 用 '你好',

    reply_count: z.number().min(1),  // 至少有一条回复

    time: z.iso.time(),
  });

  const data = JSON.parse(/*假设你从 ai 回复中提取出了一条手机消息*/);
  const phone_message = PhoneMessage.parse(message);
  console.info(data);
  // >> { name: '络络', content: '你好', reply_count: 1, time: '06:15' }
  // 如果解析失败, 将会报错
  // >> 无效输入: 期望 string，实际接收 undefined
  ```

  之后会用这个库修改酒馆助手的 `@types` 文件夹, 允许你检查酒馆助手的如 `ChatMessage` 等数据类型.

## 3.3.1

### ⏫功能

- `{{get_message_variable::}}` 等宏将字符串变量替换为文本时, 将不会用引号包裹内容. 例如 `{{get_message_variable::世界.时间阶段}}` 将不会替换为 `"早上"` 而是 `早上`

### 🐛修复

- `loadPreset` 不能正常使用的问题

## 3.3.0

### ⏫功能

- 更新了一套操控预设的函数, 现在你可以**比酒馆接口更简单地**通过脚本操控酒馆的预设了! 具体函数请自行参考[文档](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/功能详情/预设操作/创建预设.html)或[类型文件 (可以直接发给 ai)](https://github.com/N0VI028/JS-Slash-Runner/blob/main/%40types/function/preset.d.ts), 如果已经配置了[编写模板](https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html)请`pnpm add -D type-fest`并下载新的`@types`文件夹!

  ```typescript
  // 为酒馆正在使用的预设开启流式传输
  await setPreset('in_use', { settings: { should_stream: true } });
  ```

  ```typescript
  // 将 '预设A' 的条目按顺序复制到 '预设B' 开头
  const preset_a = getPreset('预设A');
  const preset_b = getPreset('预设B');
  preset_b.prompts = [...preset_a.prompts, ...preset_b.prompts];
  await replacePreset('预设B', preset_b);
  ```

  ```typescript
  // 将 '预设A' 的条目顺序反过来
  await updatePresetWith('预设A', preset => {
    preset.prompts = preset.prompts.reverse();
    return preset;
  });
  ```

## 3.2.13

### ⏫功能

- 新增 `formatAsTavernRegexedString()` 函数, 可获取酒馆正则处理后的文本结果

  ```typescript
  // 获取最后一楼文本, 将它视为将会作为显示的 AI 输出, 对它应用酒馆正则
  const message = getChatMessages(-1)[0];
  const result = formatAsTavernRegexedString(message.message, 'ai_output', 'display', { depth: 0 });
  ```

### 📚脚本库

**内置库:**

- 新增 `世界书强制自定义排序` 脚本. 很多作者会使用自定义排序来写世界书, 因为他们将能自己拖动改变世界书条目顺序: 按功能分类条目、把允许玩家自定义的条目放在最上面……**所以请使用自定义排序.**

### 🐛修复

- 世界书条目函数将 `与所有` 和 `非任意` 弄反了

## 3.2.12

### 💻界面

- 变量管理器切换为文本视图时, 使用 YAML 而非 JSON 格式显示变量文本, 这更便于编辑

## 3.2.11

### ⏫功能

- 新增 `getAllVariables()` 函数, 直接获取合并后的变量表. 简单来说, 它包含了前端界面/脚本一般会需要的变量表.

  ```typescript
  // 你可以直接写下面一行:
  const variables = getAllVariables();
  ```

  ```typescript
  // 而以前不熟悉代码的人可能出现这个问题

  // 想获取当前消息楼层的 stat_data.好感度
  const variables = _.get(getVariables({type: 'message', message_id: getCurrentMessageId()}), 'stat_data.好感度');

  // 但是新的消息楼层并没有更新变量, 所以没有 stat_data.好感度
  console.info(JSON.stringify(variables));
  // >> null
  ```

## 3.2.10

### 📚脚本库

**内置库:**

- 新增 `查看提示词发送情况` 脚本, 启用后可以在左下角魔棒中打开`提示词发送情况`界面来查看上次发送的提示词情况.

### 🐛修复

- 渲染界面高度问题
- 角色卡头像获取问题

## 3.2.9

### 🐛修复

- 渲染界面大小调整时的显示问题

## 3.2.8

### 🐛修复

- 部分国产浏览器无法渲染的问题

## 3.2.7

### 🐛修复

- 部分国产浏览器无法渲染的问题

## 3.2.6

### ⏫功能

- 默认禁用大多数非报错日志, 从而优化高频性能; 可通过开启 "调试模式" 来启用所有日志

## 3.2.5

### ⏫功能

- 新增 `getScriptButtons` 和 `replaceScriptButtons` 用于获取和替换脚本的按钮设置, 例如, 你可以这样设置二级按钮:

  ```typescript
  eventOnButton('前往地点', () => {
    replaceScriptButtons(getScriptId(), [
      { name: '学校', visible: true },
      { name: '商店', visible: true },
    ]);
  });
  ```

- 新增 `eventEmitAndWait` 用于在非异步函数中监听并等待事件.

## 3.2.4

### 💻界面

- 变量管理器的对象类型增加折叠功能

## 3.2.3

⚠️有破坏性变更, 升级本版本后如果再降级扩展，脚本功能将出现不可预期的问题。如有降级需求，在升级之前备份`sillytavern/data/用户名/settings.json`文件。

### ⏫功能

1. 脚本支持文件夹分组
   - 根据文件夹批量开关脚本
   - 自定义文件夹图标和图标颜色
   - 通过拖动脚本控件，可直接移动到指定文件夹

2. 脚本批量管理
   - 通过全局/角色脚本库文字旁的齿轮图标进入批量操作模式
   - 可以批量删除、移动、导出脚本
   - 脚本导入导出支持zip格式，保留文件夹层级结构
   - 支持搜索脚本
  
3. 脚本支持存储数据
   - 新增脚本变量存储功能，脚本可以存储和读取自己的数据，你可以通过 `getVariables({type: 'script', script_id: getScriptId()})` 等来访问脚本变量
   - 脚本编辑界面新增可视化变量管理
   - 当脚本包含数据时，导出时会弹出选择对话框，注意API-KEY等敏感数据的处理，可清除数据后导出

## 3.2.2

### 🐛修复

- 修复 `{{get_message_variable::stat_data}}` 在第 0 楼中会显示最新数值而不是第 0 楼应该对应数值的问题

## 3.2.1

### 🐛修复

- 修复 `{{get_message_variable::stat_data}}`

## 3.2.0

### ⏫功能

完善了助手宏功能,

- 现在楼层中的 `{{get_message_variable::stat_data}}` 等助手宏将会显示为对应的值, 因此你可以用酒馆正则直接制作带变量的文字状态栏:

  ```typescript
  熟络度: {{get_message_variable::stat_data.络络.熟络度[0]}}
  笨蛋度: {{get_message_variable::stat_data.络络.笨蛋度[0]}}
  ```

- 新增了 `registerMacros` 用于注册新的助手宏:

  ```typescript
  registerMacros(
    /<checkbox>(.*?)<checkbox>/gi,
    (context: Context, substring: string, content: string) => { return content; });
  ```

## 3.1.9

### 🐛修复

- 兼容旧版酒馆，目前支持的最低酒馆版本为1.12.10

## 3.1.8

### 🐛修复

- 修复generateRaw没有注入世界书深度条目的问题
- 修复了当局部脚本关闭时，每次新建对话都会弹出脚本开启提示框的问题
- 修复了变量管理器的部分已知问题

## 3.1.7

### 🐛修复

- 修复在快速回复未启用，但勾选了合并快速回复时，快速回复按钮栏高度异常的问题
- 修复了从界面添加或删除快速回复集时，脚本按钮消失的问题

## 3.1.6

### 🐛修复

- 修复 `setLorebookEntries`

## 3.1.5

### 💻界面

- 为变量管理器添加 json 解析

### ⏫功能

- 补充单文件的酒馆助手函数参考文件, 从而方便手机端

### 🐛修复

- 修复变量管理器数组的保存问题
- 修复更换聊天时, 局部脚本未正确清理的问题

## 3.1.4

### ⏫功能

- 补充 `builtin.addOneMessage`, 用于向页面添加某一楼消息

## 3.1.3

### 💻界面

- 脚本按钮不再单独占用一行，现在与快速回复按钮一起显示，多个脚本的按钮是否合为一行由快速回复的“合并快速回复”按钮控制
- 播放器标签页更名为工具箱，播放器移动到工具箱子菜单
- 输入框旁的快捷菜单增加快速打开变量管理器的按钮

### ⏫功能

- 新增变量管理器，可对全局、角色、聊天、消息变量进行可视化管理

### 🐛修复

- 修复 `setVariables` 对消息楼层变量进行操作时意外触发渲染事件的问题
- 修复了切换角色时上一个角色的角色脚本错误地复制到当前角色的问题
- 修复了按钮容器错误创建的问题

## 3.1.2

### 💻界面

- 在界面中新增到[酒馆命令自查手册](https://rentry.org/sillytavern-script-book)的参考链接
- 拆分了渲染优化和折叠代码块选项, 现在你可以单独禁用代码块的高亮从而优化渲染速度

### ⏫功能

- 为 `ChatMessage` 补充了 `extra` 字段, 为 `ChatMessageSwiped` 补充了 `swipes_info` 字段.
- 新增了 `createChatMessages` 接口来增加新的消息, 相比于 `/send` 和 `/sendas`, 它支持批量创建

  ```typescript
  // 在末尾插入一条消息
  await createChatMessages([{role: 'user', message: '你好'}]);
  ```

  ```typescript
  // 在第 10 楼前插入两条消息且不需要刷新显示
  await createChatMessages([{role: 'user', message: '你好'}, {role: 'assistant', message: '我好'}], {insert_at: 10});
  ```

- 新增了 `deleteChatMessages` 接口来删除消息, 相比于 `/del`, 它支持批量删除以及零散地进行删除

  ```typescript
  // 删除第 10 楼、第 15 楼、倒数第二楼和最后一楼
  await deleteChatMessages([10, 15, -2, getLastMessageId()]);
  ```

  ```typescript
  // 删除所有楼层
  await deleteChatMessages(_.range(getLastMessageId() + 1));
  ```

- 新增了 `rotateChatMessages` 接口来调整消息顺序

  ```typescript
  // 将 [4, 7) 楼放到 [2, 4) 楼之前, 即, 将 4-6 楼放到 2-3 楼之前
  await rotateChatMessages(2, 4, 7);
  ```

  ```typescript
  // 将最后一楼放到第 5 楼之前
  await rotateChatMessages(5, getLastMessageId(), getLastMessageId() + 1);
  ```

  ```typescript
  // 将最后 3 楼放到第 1 楼之前
  await rotateChatMessages(1, getLastMessageId() - 2, getLastMessageId() + 1);
  ```

  ```typescript
  // 将前 3 楼放到最后
  await rotateChatMessages(0, 3, getLastMessageId() + 1);
  ```

- 新增了 `getChatLorebook` 和 `setChatLorebook` 对聊天世界书进行更直接的控制
- 为 `getOrCreateChatLorebook` 新增一个可选参数, 从而允许自定义聊天世界书名称:

  ```typescript
  // 如果聊天世界书不存在, 则尝试创建一个名为 '你好' 的世界书作为聊天世界书
  const lorebook = await getOrCreateChatLorebook('你好');
  ```

### 🐛修复

- 修复 `getCharLorebooks` 不能获取到附加世界书的问题

## 3.1.1

### ⏫功能

- 新增了 `setChatMessages` 接口, 相比原来的 `setChatMessage` 更灵活——你现在可以直接地跳转开局、隐藏消息等等.

  ```typescript
  // 修改第 10 楼被 ai 使用的消息页的正文
  await setChatMessages([{message_id: 10, message: '新的消息'}]);
  ```

  ```typescript
  // 补充倒数第二楼的楼层变量
  const chat_message = getChatMessages(-2)[0];
  _.set(chat_message.data, '神乐光好感度', 5);
  await setChatMessages([{message_id: 0, data: chat_message.data}], {refresh: 'none'});
  ```

  ```typescript
  // 切换为开局 3
  await setChatMessages([{message_id: 0, swipe_id: 2}]);
  ```

  ```typescript
  // 隐藏所有楼层
  const last_message_id = getLastMessageId();
  await setChatMessages(_.range(last_message_id + 1).map(message_id => ({message_id, is_hidden: true})));
  ```

- 调整了 `getChatMessage` 接口, 现在返回类型将根据是否获取 swipes 部分 (`{ include_swipes: boolean }`) 返回 `ChatMessage[]` 或 `ChatMessageSwiped[]`.

  ```typescript
  // 仅获取第 10 楼被 ai 使用的消息页
  const chat_messages = getChatMessages(10);
  const chat_messages = getChatMessages('10');
  const chat_messages = getChatMessages('10', { include_swipes: false });
  // 获取第 10 楼所有的消息页
  const chat_messages = getChatMessages(10, { include_swipes: true });
  ```

  ```typescript
  // 获取最新楼层被 ai 使用的消息页
  const chat_message = getChatMessages(-1)[0];  // 或 getChatMessages('{{lastMessageId}}')[0]
  // 获取最新楼层所有的消息页
  const chat_message = getChatMessages(-1, { include_swipes: true })[0];  // 或 getChatMessages('{{lastMessageId}}', { include_swipes: true })[0]
  ```

  ```typescript
  // 获取所有楼层被 ai 使用的消息页
  const chat_messages = getChatMessages('0-{{lastMessageId}}');
  // 获取所有楼层所有的消息页
  const chat_messages = getChatMessages('0-{{lastMessageId}}', { include_swipes: true });
  ```

### 🐛修复

- 现在 `setChatMessage` 使用 `refresh: 'display_and_render_current'` 选项时将会发送对应的酒馆渲染事件从而激活对应的监听器, 而不只是渲染 iframe.

## 3.1.0

现在所有内置库脚本将使用 `import 'https://fastly.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/标签化/index.js'` 的形式从仓库直接获取最新代码, **因此脚本将永远保持最新**, 你不再需要为了更新脚本重新导入脚本.

## 3.0.7

### ⏫功能

- 导出了 `toastr` 库, 你现在可以用 `toastr.error('内容', '标题')` 而不是 `triggerSlash('/echo severity=error title=标题 内容')` 来进行酒馆提示了:
  - `toastr.info`
  - `toastr.success`
  - `toastr.warning`
  - `toastr.error`

## 3.0.6

### 🐛修复

- 修复世界书条目操作后, 以前版本酒馆可能不能正常显示世界书条目的问题

## 3.0.5

### 💻界面

- 新导入的脚本将添加到末尾而不是开头
- 在脚本编辑界面新建按钮将默认是启用的

### 📚脚本库

**内置库:**

- 新增 `预设防误触` 脚本, 启用后将锁定预设除了 '流式传输'、'请求思维链' 和 '具体条目' 以外的选项, 不能通过界面来修改

### ⏫功能

**世界书条目操作:**

- 新增 `replaceLorebookEntries` 和 `updateLorebookEntriesWith` 函数, 相比于原来的 `setLorebookEntries` 等函数更方便

  ```typescript
  // 禁止所有条目递归, 保持其他设置不变
  const entries = await getLorebookEntries("eramgt少女歌剧");
  await replaceLorebookEntries("eramgt少女歌剧", entries.map(entry => ({ ...entry, prevent_recursion: true })));
  ```

  ```typescript
  // 删除所有名字中包含 `神乐光` 的条目
  const entries = await getLorebookEntries("eramgt少女歌剧");
  _.remove(entries, entry => entry.comment.includes('神乐光'));
  await replaceLorebookEntries("eramgt少女歌剧", entries);
  ```

- 新增 `createLorebookEntry` 和 `deleteLorebookEntry` 的数组版本: `createLorebookEntries` 和 `deleteLorebookEntries`

### 🐛修复

- 部分函数不兼容以前版本的问题

## 3.0.4

### 🐛修复

- 深度输入框为0时无法正确加载
- 快速回复代码编辑界面在开启前端优化时无法正确显示

## 3.0.3

### 💻界面

- 现在脚本导入发生冲突时, 将可以选择是 '新建脚本' 还是 '覆盖原脚本'.

### 📚脚本库

**内置库:**

- 让`标签化`能开关酒馆助手脚本

### 🐛修复

- 在没有打开角色卡时 `replaceTavernRegexes` 意外报错

## 3.0.2

### 📚脚本库

**内置库:**

- 优化了`标签化`的执行速度
- 让`自动关闭前端卡不兼容选项`也会关闭 "在响应中显示标签"
- 添加了`样式加载`脚本
- 添加了`资源预载`脚本

### ⏫功能

- 新增 `getScriptId` 函数, 可以在脚本中获取脚本的唯一 id

- `getVariables` 等变量操作现在支持获取和修改绑定在角色卡的变量, 你也可以在酒馆助手 "脚本库" 设置界面的 "变量" 按钮手动修改角色卡变量.

  ```typescript
  const variables = getVariables({type: 'character'});
  ```

- `getVariables` 等变量操作现在支持获取和修改某层消息楼层的变量，并支持负数来获取倒数楼层的变量（如 `-1` 为最新一条消息）

  ```typescript
  const variables = getVariables({type: 'message', message_id: -1});
  ```

- `getChatMessage` 和 `setChatMessage` 也支持了用负数来获取倒数楼层

### 🐛修复

- 实时修改监听器不能监听脚本

## 3.0.1

### 🐛修复

- 部分函数无法正常使用
- 音频播放器无法正常播放
- getCharacterRegexes在不选择角色时错误抛出异常

## 3.0.0

### 💻全新用户界面

- 重新设计了整体界面布局，各功能模块独立控制启用

### ⏫版本管理

- 扩展启动时自动检查版本并提示更新，点击更新按钮可查看最新版本到本地版本的更新日志

### 📚脚本库功能

- 新增脚本库功能，支持脚本的统一管理
- 提供脚本导入导出功能
- 脚本可与角色卡一同导出，导入角色卡时自动导入脚本
- 新增绑定到角色卡的变量，可被扩展读取及与角色卡一同导出
- 内置库中拥有扩展提供的实用功能脚本

### 🔌扩展性增强

- 将酒馆助手核心函数注册到全局作用域
- 支持其他扩展插件调用酒馆助手的功能

### ✍️写卡体验提升

请阅读 [【正确使用酒馆助手编写前端界面教程】【直播】刚装好的win11喵从安装软件开始](https://discord.com/channels/1291925535324110879/1374317316631695370/1374330019446263879)

- 支持真实时修改，只需要在软件中修改代码，酒馆就会立即更新内容
- 支持拆分文件编写，为界面不同功能拆分逻辑
- 支持使用 package.json 自行加入第三方库
