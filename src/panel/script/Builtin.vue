<template>
  <Popup :buttons="[{ name: t`关闭` }]">
    <div class="my-1.25 flex flex-col flex-wrap gap-0.5">
      <h3 class="my-0!">{{ t`内置库` }}</h3>
      <div class="mb-0.75 flex flex-col gap-0.75">
        <span class="inline-block text-left">{{
          t`内置库更多是作为脚本能做什么的示例, 更多实用脚本请访问社区的工具区`
        }}</span>
        <span class="inline-block text-left"
          >{{ t`如果需要制作脚本, 建议查看` }}
          <a
            href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html"
            target="_blank"
          >
            {{ t`官方编写模板配置教程` }}
          </a>
        </span>
      </div>
      <!-- prettier-ignore-attribute -->
      <div
        v-for="builtin in builtins"
        :key="builtin.name"
        class="flex w-full items-center justify-between rounded-sm border border-(--SmartThemeBorderColor) p-0.25"
      >
        <div class="ml-0.5 grow overflow-hidden text-left! text-ellipsis! whitespace-nowrap!">
          {{ builtin.name }}
        </div>
        <div class="flex shrink-0! flex-nowrap! items-center gap-0.5">
          <DefineToolButton v-slot="{ name, icon }">
            <div class="menu_button interactable my-0! mr-0.5" :title="name">
              <i class="fa-solid" :class="icon"></i>
            </div>
          </DefineToolButton>
          <ToolButton name="查看作者备注" icon="fa-info-circle" @click="openInfo(builtin)" />
          <ToolButton name="导出脚本" icon="fa-plus" @click="importScript(builtin)" />
        </div>
      </div>
    </div>
  </Popup>
</template>

<script setup lang="ts">
import Popup from '@/panel/component/Popup.vue';
import { useGlobalScriptsStore } from '@/store/scripts';
import { Script } from '@/type/scripts';
import { renderMarkdown } from '@/util/tavern';
import { uuidv4 } from '@sillytavern/scripts/utils';

const [DefineToolButton, ToolButton] = createReusableTemplate<{
  name: string;
  icon: string;
}>();

type BuiltinScript = {
  name: string;
  content_url: string;
  info_url: string;
};
async function getInfo(script: BuiltinScript): Promise<string> {
  const response = await fetch(script.info_url);
  if (!response.ok) {
    throw Error(`获取脚本信息失败: ${response.status} ${response.statusText}`);
  }
  return response.text();
}
async function toScript(script: BuiltinScript): Promise<Script> {
  return {
    type: 'script',
    enabled: false,
    name: script.name,
    id: uuidv4(),
    content: `import '${script.content_url}'`,
    info: await getInfo(script),
    button: {
      enabled: true,
      buttons: [],
    },
    data: {},
  };
}

const builtins: BuiltinScript[] = [
  {
    name: t`标签化: 随世界书、预设或链接配置自动开关正则、提示词条目`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/标签化/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/标签化/README.md',
  },
  {
    name: t`预设防误触`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/预设防误触/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/预设防误触/README.md',
  },
  {
    name: t`世界书强制自定义排序`,
    content_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/世界书强制自定义排序/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/世界书强制自定义排序/README.md',
  },
  {
    name: t`世界书强制用推荐的全局设置`,
    content_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/世界书强制用推荐的全局设置/index.js',
    info_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/世界书强制用推荐的全局设置/README.md',
  },
  {
    name: t`一键禁用条目递归`,
    content_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/一键禁用条目递归/index.js',
    info_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/一键禁用条目递归/README.md',
  },
  {
    name: t`保存预设条目时直接保存预设`,
    content_url:
      'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/保存提示词时保存预设/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/保存提示词时保存预设/README.md',
  },
  {
    name: t`预设条目更多按钮: 一键新增预设条目`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/预设条目更多按钮/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/预设条目更多按钮/README.md',
  },
  {
    name: t`角色卡绑定预设: 切换到某个角色卡时切换为对应预设`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/角色卡绑定预设/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/角色卡绑定预设/README.md',
  },
  {
    name: t`输入助手`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/输入助手/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/输入助手/README.md',
  },
  {
    name: t`压缩系统消息: 让 AI 对内容理解更连贯`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/压缩相邻消息/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/压缩相邻消息/README.md',
  },
  {
    name: t`深度条目排斥器: 让深度条目只能在 D0 或 D9999`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/深度条目排斥器/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/深度条目排斥器/README.md',
  },
  {
    name: t`token数过多提醒: 防止玩傻子AI`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/token数过多提醒/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/token数过多提醒/README.md',
  },
  {
    name: t`删除角色卡时删除绑定的主要世界书`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/删除角色卡时删除绑定的主要世界书/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/删除角色卡时删除绑定的主要世界书/README.md',
  },
  {
    name: t`取消代码块高亮`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/取消代码块高亮/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/取消代码块高亮/README.md',
  },
  {
    name: t`世界书繁简互换: 一键将繁体/简体世界书翻译成简体/繁体`,
    content_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/dist/酒馆助手/世界书繁简互换/index.js',
    info_url: 'https://testingcf.jsdelivr.net/gh/StageDog/tavern_resource/src/酒馆助手/世界书繁简互换/README.md',
  },
];

async function openInfo(builtin: BuiltinScript) {
  toastr.info(t`正在加载作者备注...`);
  useModal({
    component: Popup,
    attrs: {
      width: 'wide',
      buttons: [{ name: t`关闭` }],
      onOpened: () => {
        toastr.clear();
      },
    },
    slots: {
      default: `<div class="p-1.5 text-left">${renderMarkdown(await getInfo(builtin))}</div>`,
    },
  }).open();
}

async function importScript(builtin: BuiltinScript) {
  toastr.info(t`正在加载脚本...`);
  const script = await toScript(builtin);
  toastr.clear();
  useGlobalScriptsStore().script_trees.push(script);
  toastr.success(t`成功导入脚本: '${script.name}'`);
}
</script>
