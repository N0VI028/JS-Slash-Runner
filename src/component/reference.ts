import { SlashCommandParser } from '@sillytavern/scripts/slash-commands/SlashCommandParser';
import {
  SlashCommandNamedArgument,
} from '@sillytavern/scripts/slash-commands/SlashCommandArgument';
import { executeSlashCommandsWithOptions } from '@sillytavern/scripts/slash-commands';

import third_party from '@/third_party.html';

function formatSlashCommands(): string {
  const cmdList = Object.keys(SlashCommandParser.commands)
    .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map(key => SlashCommandParser.commands[key]);
  const transform_arg = (arg: SlashCommandNamedArgument) => {
    const transformers = {
      name: (value: SlashCommandNamedArgument['name']) => ({ name: value }),
      // description: (value: SlashCommandNamedArgument['description']) => ({ description: value }),
      isRequired: (value: SlashCommandNamedArgument['isRequired']) => ({
        is_required: value,
      }),
      defaultValue: (value: SlashCommandNamedArgument['defaultValue']) =>
        value !== null ? { default_value: value } : {},
      acceptsMultiple: (value: SlashCommandNamedArgument['acceptsMultiple']) => ({ accepts_multiple: value }),
      enumList: (value: SlashCommandNamedArgument['enumList']) =>
        value.length > 0 ? { enum_list: value.map(e => e.value) } : {},
      typeList: (value: SlashCommandNamedArgument['typeList']) => (value.length > 0 ? { type_list: value } : {}),
    };

    return Object.entries(arg)
      .filter(([_, value]) => value !== undefined)
      .reduce(
        (result, [key, value]) => ({
          ...result,
          // @ts-ignore
          ...transformers[key]?.(value),
        }),
        {},
      );
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
      named_args: cmd.namedArgumentList.map(transform_arg) ?? [],
      unnamed_args: cmd.unnamedArgumentList.map(transform_arg) ?? [],
      return_type: cmd.returns ?? 'void',
      help_string: transform_help_string(cmd.helpString) ?? 'NO DETAILS',
    }))
    .map(
      cmd =>
        `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
          .map(
            arg =>
              `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              }]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
          .map(
            arg =>
              `(${arg.accepts_multiple ? `...` : ``}${
                arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
              })${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
          )
          .join(' ')} // ${cmd.help_string}`,
    )
    .join('\n');
}

/**
 * 初始化编写参考
 */
export function initReference() {

  $('#copy_third_party_installation').on('pointerup', function () {
    navigator.clipboard.writeText(
      'npm install --save-dev @types/file-saver @types/jquery @types/jqueryui @types/lodash @types/yamljs',
    );
    executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  });
  $('#copy_third_party_tag').on('pointerup', function () {
    navigator.clipboard.writeText(third_party);
    executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  });

  $('#download_slash_commands').on('click', function () {
    const url = URL.createObjectURL(new Blob([formatSlashCommands()], { type: 'text/plain' }));
    $(this).attr('href', url);
    $(this).attr('download', 'slash_command.txt');
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
}