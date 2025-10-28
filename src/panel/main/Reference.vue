<template>
  <Item type="box">
    <template #title>{{ t`编写参考` }}</template>
    <template #description>{{ t`编写脚本的参考文档` }}</template>
    <template #detail>
      <div class="flex w-full flex-wrap gap-0.5">
        <Divider margin-y="0">{{ t`酒馆助手` }}</Divider>
        <div class="mb-0.5 flex items-center justify-center gap-0.5">
          <div
            class="TH-reference-button"
            @click="open('https://n0vi028.github.io/JS-Slash-Runner-Doc/guide/基本用法/如何正确使用酒馆助手.html')"
          >
            {{ t`查看教程及文档` }}<i class="fa-solid fa-external-link" />
          </div>
          <div ref="tavern_helper_types_button" class="TH-reference-button">
            {{ t`下载参考文件` }}<i class="fa-solid fa-ellipsis-vertical" />
          </div>
          <div ref="tavern_helper_types_popup" class="list-group" style="display: none">
            <a
              target="_blank"
              href="https://gitlab.com/novi028/JS-Slash-Runner/-/raw/main/dist/@types.zip?ref_type=heads&inline=false"
              class="list-group-item"
            >
              {{ t`电脑编写模板用` }}<i class="fa-solid fa-download" />
            </a>
            <a
              target="_blank"
              href="https://gitlab.com/novi028/JS-Slash-Runner/-/raw/main/dist/@types.txt?ref_type=heads&inline=false"
              class="list-group-item"
            >
              {{ t`手机或 AI 官网用` }}<i class="fa-solid fa-download" />
            </a>
          </div>
        </div>
        <Divider margin-y="0">{{ t`酒馆 /STScript` }}</Divider>
        <div class="mb-0.5 flex items-center justify-center gap-0.5">
          <div class="TH-reference-button" @click="open('https://rentry.org/sillytavern-script-book')">
            {{ t`查看手册` }}
            <i class="fa-solid fa-external-link" />
          </div>
          <div class="TH-reference-button" @click="downloadSlashCommands">
            {{ t`下载参考文件` }}<i class="fa-solid fa-download" />
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
import { download } from '@sillytavern/scripts/utils';

function open(url: string) {
  window.open(url, '_blank');
}

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

function downloadSlashCommands() {
  download(new Blob([formatSlashCommands()]), 'slash_command.txt', 'text/plain');
}
</script>

<style lang="scss" scoped>
@reference '../../global.css';
.TH-reference-button {
  @apply cursor-pointer flex items-center justify-center bg-(--grey5020a) rounded-sm p-0.5 th-text-xs text-(--SmartThemeBodyColor) gap-0.5;
  margin-top: 5px;

  a {
    @apply text-(--SmartThemeBodyColor);
  }
}

.list-group-item {
  @apply p-0.5 th-text-sm cursor-pointer;
}
</style>
