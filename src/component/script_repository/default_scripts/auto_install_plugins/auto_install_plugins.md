## 自动安装插件

**作者：** 青空莉想做舞台少女的狗

**版本：** 1.0.0

**说明：** 酒馆助手内置的脚本，自动安装角色卡所需插件

[点此查看源文件](https://gitgud.io/StageDog/tavern_resource/-/tree/main/酒馆助手/自动安装插件/源文件?ref_type=heads)

## 使用方法

### 角色卡发布者需要做的

- 发布角色卡前，在酒馆助手的 “脚本库-变量” 中新建一个 "预安装插件-xxx" 的变量, 值的部分在其中以 `插件名称: 插件安装链接` 的格式书写你需要安装的插件, 其中插件名称可任意, 仅对玩家起到提示作用. 例如:

<div style="text-align: left; background-color: #313131; padding: 5px; border-radius: 5px; color: #cecece;">
提示词模板: https://codeberg.org/zonde306/ST-Prompt-Template<br>
记忆增强: https://gitee.com/muyoou/st-memory-enhancement
</div>

- 导出角色卡

### 角色卡游玩者需要做的

- 安装酒馆助手
- 添加并启用此脚本到全局脚本或局部脚本
- 导入绑定了预安装插件的角色卡

