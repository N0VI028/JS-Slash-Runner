// @ts-nocheck
import { eventSource, event_types, saveSettingsDebounced, reloadCurrentChat } from '../../../../../script.js';
import { extension_settings, renderExtensionTemplateAsync } from '../../../../extensions.js';
import { executeSlashCommandsWithOptions } from '../../../../slash-commands.js';
import { SlashCommandParser } from '../../../../slash-commands/SlashCommandParser.js';
import { handleIframe } from './iframe_server/index.js';
import { iframe_client } from './iframe_client_exported/index.js';
import { initSlashEventEmit } from './slash_command/event.js';
import { initializeMacroOnExtension, destroyMacroOnExtension, registerAllMacros, unregisterAllMacros, } from './component/macro.js';
import { initializeEmbeddedCodeblockOnExtension, destroyEmbeddedCodeblockOnExtension, } from './component/embedded_codeblock.js';
import { initializeCharacterLevelOnExtension, destroyCharacterLevelOnExtension, } from './component/character_level/index.js';
import { clearTempVariables, shouldUpdateVariables, checkVariablesEvents } from './iframe_server/variables.js';
import { script_url } from './script_url.js';
import { third_party } from './third_party.js';
import { defaultAudioSettings, initAudioComponents } from './component/audio.js';
import { defaultIframeSettings, renderAllIframes, renderPartialIframes, formattedLastMessage, initIframePanel, viewport_adjust_script, tampermonkey_script, fullRenderEvents, partialRenderEvents, } from './component/message_iframe.js';
import { initAutoSettings } from './component/script_repository.js';
export const extensionName = 'JS-Slash-Runner';
export const extensionFolderPath = `third-party/${extensionName}`;
let isScriptLibraryOpen = false;
const defaultSettings = {
    activate_setting: false,
    render: {
        ...defaultIframeSettings,
    },
    audio: {
        ...defaultAudioSettings,
    },
};
async function onExtensionToggle() {
    const isEnabled = Boolean($('#activate_setting').prop('checked'));
    extension_settings[extensionName].activate_setting = isEnabled;
    if (isEnabled) {
        script_url.set('iframe_client', iframe_client);
        script_url.set('viewport_adjust_script', viewport_adjust_script);
        script_url.set('tampermonkey_script', tampermonkey_script);
        registerAllMacros();
        initializeMacroOnExtension();
        initializeEmbeddedCodeblockOnExtension();
        initializeCharacterLevelOnExtension();
        window.addEventListener('message', handleIframe);
        fullRenderEvents.forEach(eventType => {
            eventSource.on(eventType, renderAllIframes);
        });
        partialRenderEvents.forEach(eventType => {
            eventSource.on(eventType, mesId => {
                renderPartialIframes(mesId);
            });
        });
        checkVariablesEvents.forEach(eventType => {
            eventSource.on(eventType, mesId => {
                shouldUpdateVariables(mesId);
            });
        });
        eventSource.on(event_types.MESSAGE_DELETED, () => {
            clearTempVariables();
            formattedLastMessage();
        });
        await renderAllIframes();
    }
    else {
        script_url.delete('iframe_client');
        script_url.delete('viewport_adjust_script');
        script_url.delete('tampermonkey_script');
        unregisterAllMacros();
        destroyMacroOnExtension();
        destroyEmbeddedCodeblockOnExtension();
        destroyCharacterLevelOnExtension();
        window.removeEventListener('message', handleIframe);
        fullRenderEvents.forEach(eventType => {
            eventSource.removeListener(eventType, renderAllIframes);
        });
        partialRenderEvents.forEach(eventType => {
            eventSource.removeListener(eventType, renderPartialIframes);
        });
        checkVariablesEvents.forEach(eventType => {
            eventSource.removeListener(eventType, mesId => {
                shouldUpdateVariables(mesId);
            });
        });
        eventSource.removeListener(event_types.MESSAGE_DELETED, () => {
            clearTempVariables();
            formattedLastMessage();
        });
        await reloadCurrentChat();
    }
    saveSettingsDebounced();
}
function formatSlashCommands() {
    const cmdList = Object.keys(SlashCommandParser.commands)
        .filter(key => SlashCommandParser.commands[key].name === key) // exclude aliases
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map(key => SlashCommandParser.commands[key]);
    const transform_arg = (arg) => {
        const transformers = {
            name: (value) => ({ name: value }),
            // description: (value: SlashCommandNamedArgument['description']) => ({ description: value }),
            isRequired: (value) => ({
                is_required: value,
            }),
            defaultValue: (value) => value !== null ? { default_value: value } : {},
            acceptsMultiple: (value) => ({ accepts_multiple: value }),
            enumList: (value) => value.length > 0 ? { enum_list: value.map(e => e.value) } : {},
            typeList: (value) => (value.length > 0 ? { type_list: value } : {}),
        };
        return Object.entries(arg)
            .filter(([_, value]) => value !== undefined)
            .reduce((result, [key, value]) => ({
            ...result,
            // @ts-ignore
            ...transformers[key]?.(value),
        }), {});
    };
    const transform_help_string = (help_string) => {
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
        .map(cmd => `/${cmd.name}${cmd.named_args.length > 0 ? ` ` : ``}${cmd.named_args
        .map(arg => `[${arg.accepts_multiple ? `...` : ``}${arg.name}=${arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')}]${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`)
        .join(' ')}${cmd.unnamed_args.length > 0 ? ` ` : ``}${cmd.unnamed_args
        .map(arg => `(${arg.accepts_multiple ? `...` : ``}${arg.enum_list ? arg.enum_list.join('|') : arg.type_list.join('|')})${arg.is_required ? `` : `?`}${arg.default_value ? `=${arg.default_value}` : ``}`)
        .join(' ')} // ${cmd.help_string}`)
        .join('\n');
}
function addQuickButton() {
    const buttonHtml = $(`
  <div id="js_slash_runner_container" class="list-group-item flex-container flexGap5 interactable">
      <div class="fa-solid fa-puzzle-piece extensionsMenuExtensionButton" /></div>
      切换渲染状态
  </div>`);
    buttonHtml.css('display', 'flex');
    $('#extensionsMenu').append(buttonHtml);
    $('#js_slash_runner_container').on('click', function () {
        const currentChecked = $('#activate_setting').prop('checked');
        $('#activate_setting').prop('checked', !currentChecked);
        onExtensionToggle();
    });
}
/**
 * 初始化扩展面板
 */
jQuery(async () => {
    const getContainer = () => $(document.getElementById('extensions_settings'));
    const windowHtml = await renderExtensionTemplateAsync(`${extensionFolderPath}`, 'settings');
    getContainer().append(windowHtml);
    extension_settings[extensionName] = extension_settings[extensionName] || {};
    if (!extension_settings[extensionName] ||
        !extension_settings[extensionName].render ||
        !extension_settings[extensionName].audio) {
        Object.assign(extension_settings[extensionName], defaultSettings);
        saveSettingsDebounced();
    }
    addQuickButton();
    const extensionEnabled = extension_settings[extensionName].activate_setting;
    $('#activate_setting').prop('checked', extensionEnabled);
    $('#activate_setting').on('click', onExtensionToggle);
    if (extensionEnabled) {
        onExtensionToggle();
    }
    $('#scriptLibraryButton')
        .off('click')
        .on('click', function () {
        isScriptLibraryOpen = !isScriptLibraryOpen;
        $('#scriptLibraryPopup').slideToggle(200, 'swing');
    });
    $(document).on('mousedown touchstart', function (e) {
        const clickTarget = $(e.target);
        if (isScriptLibraryOpen &&
            clickTarget.closest('#scriptLibraryButton').length === 0 &&
            clickTarget.closest('#scriptLibraryPopup').length === 0) {
            $('#scriptLibraryPopup').slideUp(200, 'swing');
            isScriptLibraryOpen = false;
        }
    });
    $('#copy_third_party_installation').on('pointerup', function () {
        navigator.clipboard.writeText('npm install --save-dev @types/file-saver @types/jquery @types/jqueryui @types/lodash @types/yamljs');
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
    initAutoSettings();
    initAudioComponents();
    initSlashEventEmit();
    initIframePanel();
});
//# sourceMappingURL=index.js.map