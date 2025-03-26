import { defaultAudioSettings, initAudioComponents } from '@/component/audio';
import { initExtensionMainPanel } from '@/component/main';
import { defaultIframeSettings, initIframePanel } from '@/component/message_iframe';
import { defaultScriptSettings, initScriptRepository } from '@/component/script_repository';
import { initAudioSlashCommands } from '@/slash_command/audio';
import { initSlashEventEmit } from '@/slash_command/event';
import { extensionFolderPath, extensionName } from '@/util/extension_variables';

import { saveSettingsDebounced } from '@sillytavern/script';
import { extension_settings, renderExtensionTemplateAsync } from '@sillytavern/scripts/extensions';

const defaultSettings = {
  enabled_extension: true,
  render: {
    ...defaultIframeSettings,
  },
  script: {
    ...defaultScriptSettings,
  },
  audio: {
    ...defaultAudioSettings,
  },
};

// function formatSlashCommands(): string {
//   const cmdList = Object.keys(SlashCommandParser.commands)
//     .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
//     .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
//     .map(key => SlashCommandParser.commands[key]);
//   const transform_arg = (arg: SlashCommandNamedArgument) => {
//     const transformers = {
//       name: (value: SlashCommandNamedArgument['name']) => ({ name: value }),
//       // description: (value: SlashCommandNamedArgument['description']) => ({ description: value }),
//       isRequired: (value: SlashCommandNamedArgument['isRequired']) => ({
//         is_required: value,
//       }),
//       defaultValue: (value: SlashCommandNamedArgument['defaultValue']) =>
//         value !== null ? { default_value: value } : {},
//       acceptsMultiple: (value: SlashCommandNamedArgument['acceptsMultiple']) => ({ accepts_multiple: value }),
//       enumList: (value: SlashCommandNamedArgument['enumList']) =>
//         value.length > 0 ? { enum_list: value.map(e => e.value) } : {},
//       typeList: (value: SlashCommandNamedArgument['typeList']) => (value.length > 0 ? { type_list: value } : {}),
//     };

//     return Object.entries(arg)
//       .filter(([_, value]) => value !== undefined)
//       .reduce(
//         (result, [key, value]) => ({
//           ...result,
//           // @ts-ignore
//           ...transformers[key]?.(value),
//         }),
//         {},
//       );
//   };
//   const transform_help_string = (help_string: string) => {
//     const content = $('<span>').html(help_string);
//     return content
//       .text()
//       .split('\n')
//       .map(line => line.trim())
//       .filter(line => line !== '')
//       .join(' ');
//   };

//   return cmdList
//     .map(cmd => ({
//       name: cmd.name,
//       named_args: cmd.namedArgumentList.map(transform_arg) ?? [],
//       unnamed_args: cmd.unnamedArgumentList.map(transform_arg) ?? [],
//       return_type: cmd.returns ?? 'void',
//       help_string: transform_help_string(cmd.helpString) ?? 'NO DETAILS',
//     }))
//     .map(
//       cmd =>
//         `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
//           .map(
//             arg =>
//               `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${
//                 arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
//               }]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
//           )
//           .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
//           .map(
//             arg =>
//               `(${arg.accepts_multiple ? `...` : ``}${
//                 arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')
//               })${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`,
//           )
//           .join(' ')} // ${cmd.help_string}`,
//     )
//     .join('\n');
// }

/**
 * 设置页面切换
 *  @param event 事件对象
 * */
function handleSettingPageChange(event: JQuery.ClickEvent) {
  const target = $(event.currentTarget);
  let id = target.attr('id');
  if (id === undefined) {
    return;
  }
  id = id.replace('-settings-title', '');

  function resetAllTitleClasses() {
    $('#main-settings-title').removeClass('title-item-active');
    $('#render-settings-title').removeClass('title-item-active');
    $('#script-settings-title').removeClass('title-item-active');
    $('#audio-settings-title').removeClass('title-item-active');
  }

  function hideAllContentPanels() {
    $('#main-settings-content').hide();
    $('#render-settings-content').hide();
    $('#script-settings-content').hide();
    $('#audio-settings-content').hide();
  }

  resetAllTitleClasses();
  hideAllContentPanels();

  switch (id) {
    case 'main':
      $('#main-settings-title').addClass('title-item-active');
      $('#main-settings-content').show();
      break;
    case 'render':
      $('#render-settings-title').addClass('title-item-active');
      $('#render-settings-content').show();
      break;
    case 'script':
      $('#script-settings-title').addClass('title-item-active');
      $('#script-settings-content').show();
      break;
    case 'audio':
      $('#audio-settings-title').addClass('title-item-active');
      $('#audio-settings-content').show();
      break;
  }
}

/**
 * 初始化扩展面板
 */
jQuery(async () => {
  const getContainer = () => $('#extensions_settings');
  const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'settings');
  getContainer().append(windowHtml);
  //@ts-ignore
  if (!extension_settings[extensionName]) {
    //@ts-ignore
    extension_settings[extensionName] = defaultSettings;
    saveSettingsDebounced();
  }

  // 默认显示主设置界面
  $('#main-settings-title').addClass('title-item-active');
  $('#main-settings-content').show();
  $('#render-settings-content').hide();
  $('#script-settings-content').hide();
  $('#audio-settings-content').hide();

  // 监听设置选项卡切换
  $('#main-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#render-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#script-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));
  $('#audio-settings-title').on('click', (event: JQuery.ClickEvent) => handleSettingPageChange(event));

  // $('#scriptLibraryButton')
  //   .off('click')
  //   .on('click', function () {
  //     isScriptLibraryOpen = !isScriptLibraryOpen;
  //     $('#scriptLibraryPopup').slideToggle(200, 'swing');
  //   });

  // $(document).on('mousedown touchstart', function (e) {
  //   const clickTarget = $(e.target);

  //   if (
  //     isScriptLibraryOpen &&
  //     clickTarget.closest('#scriptLibraryButton').length === 0 &&
  //     clickTarget.closest('#scriptLibraryPopup').length === 0
  //   ) {
  //     $('#scriptLibraryPopup').slideUp(200, 'swing');
  //     isScriptLibraryOpen = false;
  //   }
  // });
  // $('#copy_third_party_installation').on('pointerup', function () {
  //   navigator.clipboard.writeText(
  //     'npm install --save-dev @types/file-saver @types/jquery @types/jqueryui @types/lodash @types/yamljs',
  //   );
  //   executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  // });
  // $('#copy_third_party_tag').on('pointerup', function () {
  //   navigator.clipboard.writeText(third_party);
  //   executeSlashCommandsWithOptions('/echo severity=success 已复制到剪贴板!');
  // });

  // $('#download_slash_commands').on('click', function () {
  //   const url = URL.createObjectURL(new Blob([formatSlashCommands()], { type: 'text/plain' }));
  //   $(this).attr('href', url);
  //   $(this).attr('download', 'slash_command.txt');
  //   setTimeout(() => URL.revokeObjectURL(url), 0);
  // });
  initExtensionMainPanel();
  initIframePanel();
  initScriptRepository();
  initAudioComponents();
  initAudioSlashCommands();
  initSlashEventEmit();
});
