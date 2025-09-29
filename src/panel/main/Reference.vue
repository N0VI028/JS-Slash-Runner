<template>
  <Item type="box">
    <template #title>{{ t`编写参考` }}</template>
    <template #description>{{ t`编写脚本的参考文档` }}</template>
    <template #detail>
      <div class="flex w-full flex-wrap gap-0.5">
        <Divider margin-y="0">{{ t`酒馆助手` }}</Divider>
        <div class="mb-0.5 flex items-center justify-center gap-0.5">
          <div class="TH-reference-button">
            <a
              href="https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html"
              style="cursor: pointer"
              :title="t`查看酒馆助手文档`"
            >
              {{ t`查看教程及文档` }}
            </a>
            <i class="fa-solid fa-external-link"></i>
          </div>
          <div ref="tavern_helper_types_button" class="TH-reference-button">
            <a
              style="cursor: pointer"
              :title="
                t`下载提供给 VSCode/Cursor 的 TypeScript 类型声明文件, 既让 VSCode/Cursor 能提供代码提示, 也可以发给 ai 让它了解`
              "
            >
              {{ t`下载参考文件` }}
            </a>
            <i class="fa-solid fa-ellipsis-vertical"></i>
          </div>
          <div ref="tavern_helper_types_popup" class="list-group" style="display: none">
            <a
              href="https://gitlab.com/novi028/JS-Slash-Runner/-/raw/main/dist/@types.zip?ref_type=heads&inline=false"
              class="list-group-item"
            >
              {{ t`电脑编写模板用` }}
            </a>
            <a
              href="https://gitlab.com/novi028/JS-Slash-Runner/-/raw/main/dist/@types.txt?ref_type=heads&inline=false"
              class="list-group-item"
            >
              {{ t`手机或 AI 官网用` }}
            </a>
          </div>
        </div>
        <Divider margin-y="0">{{ t`酒馆 /STScript` }}</Divider>
        <div class="mb-0.5 flex items-center justify-center gap-0.5">
          <div class="TH-reference-button">
            <a
              href="https://rentry.org/sillytavern-script-book"
              style="cursor: pointer"
              :title="t`查看酒馆 /STScript 命令手册`"
            >
              {{ t`查看手册` }}
            </a>
            <i class="fa-solid fa-external-link"></i>
          </div>
          <div class="TH-reference-button">
            <a
              target="_blank"
              :title="t`下载你所用酒馆版本及扩展所提供的酒馆 STScript 命令列表, 可发给 ai 参考了解`"
              @click="downloadSlashCommands"
            >
              {{ t`下载参考文件` }}
            </a>
          </div>
        </div>
      </div>
    </template>
  </Item>
</template>

<script setup lang="ts">
import {
  SlashCommandArgument,
  SlashCommandNamedArgument,
} from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';

function formatSlashCommands(): string {
  const cmdList = Object.keys(SlashCommandParser.commands)
    .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(key => SlashCommandParser.commands[key]);

  const transform_unnamed_arg = (arg: SlashCommandArgument) => {
    return {
      is_required: arg.isRequired,
      default_value: arg.defaultValue ?? undefined,
      accepts_multiple: arg.acceptsMultiple,
      enum_list: arg.enumList.length > 0 ? arg.enumList.map(e => e.value) : undefined,
      type_list: arg.typeList.length > 0 ? arg.typeList : undefined,
    };
  };

  const transform_named_arg = (arg: SlashCommandNamedArgument) => {
    return {
      name: arg.name,
      ...transform_unnamed_arg(arg),
    };
  };

  const transform_help_string = (help_string: string) => {
    const content = $('<span>').html(help_string);
    return content
      .text()
      .split('\n')
      .map(line => line.trim())
      .filter(line => line !== '')
      .join(' ');
  };

  return cmdList
    .map(cmd => ({
      name: cmd.name,
      named_args: cmd.namedArgumentList.map(transform_named_arg) ?? [],
      unnamed_args: cmd.unnamedArgumentList.map(transform_unnamed_arg) ?? [],
      return_type: cmd.returns ?? 'void',
      help_string: transform_help_string(cmd.helpString) ?? 'NO DETAILS',
    }))
    .map(
      cmd =>
        `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
          .map(
            arg =>
              `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list ? arg.type_list.join('|') : ''
              }]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
          .map(
            arg =>
              `(${arg.accepts_multiple ? `...` : ``}${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list ? arg.type_list.join('|') : ''
              })${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')} // ${cmd.help_string}`,
    )
    .join('\n');
}

// TODO: 不再使用 popper
const tavern_helper_types_button = useTemplateRef('tavern_helper_types_button');
const tavern_helper_types_popup = useTemplateRef('tavern_helper_types_popup');
onMounted(() => {
  const popper_instance = Popper.createPopper(tavern_helper_types_button.value!, tavern_helper_types_popup.value!, {
    placement: 'right-end',
  });
  $(tavern_helper_types_button.value!).on('click', function () {
    const $popup = $(tavern_helper_types_popup.value!);
    $popup.css('display', $popup.css('display') === 'none' ? 'block' : 'none');
    popper_instance.update();
  });
});

function downloadSlashCommands(event: Event) {
  const target = event.target as HTMLAnchorElement;

  const url = URL.createObjectURL(new Blob([formatSlashCommands()], { type: 'text/plain' }));
  target.href = url;
  target.download = 'slash_command.txt';
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
</script>

<style lang="scss" scoped>
@reference 'tailwindcss';
.TH-reference-button {
  @apply cursor-pointer flex items-center justify-center bg-(--grey5020a) rounded-sm p-0.5 text-xs text-(--SmartThemeBodyColor) gap-0.5;
  margin-top: 5px;

  a {
    @apply text-(--SmartThemeBodyColor);
  }
}

.list-group-item {
  @apply p-0.5 text-sm cursor-pointer;
}
</style>
