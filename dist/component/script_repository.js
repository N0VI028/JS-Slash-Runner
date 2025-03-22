// @ts-nocheck
import { eventSource, event_types, saveSettingsDebounced, reloadCurrentChat, this_chid, characters, } from '../../../../../../script.js';
import { selected_group } from '../../../../../group-chats.js';
import { extension_settings } from '../../../../../extensions.js';
import { power_user } from '../../../../../power-user.js';
import { extensionName } from '../index.js';
export const defaultScriptSettings = {
    script_enabled: true,
    global_script_enabled: true,
    script_repository_enabled: true,
};
/**
 * 自动为当前角色启用正则表达式规则
 */
export async function autoEnableCharacterRegex() {
    if (this_chid === undefined) {
        return;
    }
    if (selected_group) {
        return;
    }
    const avatar = characters[this_chid].avatar;
    if (!extension_settings.character_allowed_regex.includes(avatar)) {
        extension_settings.character_allowed_regex.push(avatar);
        reloadCurrentChat();
    }
    saveSettingsDebounced();
}
/**
 * 注册自动启用角色正则表达式的事件监听
 */
export async function registerAutoEnableCharacterRegex() {
    eventSource.on(event_types.CHAT_CHANGED, autoEnableCharacterRegex);
}
/**
 * 取消注册自动启用角色正则表达式的事件监听
 */
export async function unregisterAutoEnableCharacterRegex() {
    eventSource.removeListener(event_types.CHAT_CHANGED, autoEnableCharacterRegex);
}
/**
 * 处理自动启用角色正则表达式开关的点击事件
 */
export async function onAutoEnableCharacterRegexClick() {
    const isEnabled = Boolean($('#auto_enable_character_regex').prop('checked'));
    extension_settings[extensionName].auto_enable_character_regex = isEnabled;
    if (isEnabled) {
        registerAutoEnableCharacterRegex();
    }
    else {
        saveSettingsDebounced();
    }
}
/**
 * 自动禁用不兼容的选项
 */
export async function autoDisableIncompatibleOptions() {
    if (power_user.auto_fix_generated_markdown || power_user.trim_sentences || power_user.forbid_external_media) {
        power_user.auto_fix_generated_markdown = false;
        $('#auto_fix_generated_markdown').prop('checked', power_user.auto_fix_generated_markdown);
        power_user.trim_sentences = false;
        $('#trim_sentences_checkbox').prop('checked', power_user.trim_sentences);
        power_user.forbid_external_media = false;
        $('#forbid_external_media').prop('checked', power_user.forbid_external_media);
    }
    saveSettingsDebounced();
}
/**
 * 注册自动禁用不兼容选项的事件监听
 */
export async function registerAutoDisableIncompatibleOptions() {
    eventSource.on(event_types.CHAT_CHANGED, autoDisableIncompatibleOptions);
}
/**
 * 取消注册自动禁用不兼容选项的事件监听
 */
export async function unregisterAutoDisableIncompatibleOptions() {
    eventSource.removeListener(event_types.CHAT_CHANGED, autoDisableIncompatibleOptions);
}
/**
 * 处理自动禁用不兼容选项开关的点击事件
 */
export async function onAutoDisableIncompatibleOptions() {
    const isEnabled = Boolean($('#auto_disable_incompatible_options').prop('checked'));
    extension_settings[extensionName].auto_disable_incompatible_options = isEnabled;
    if (isEnabled) {
        registerAutoDisableIncompatibleOptions();
    }
    else {
        unregisterAutoDisableIncompatibleOptions();
    }
    saveSettingsDebounced();
}
export async function initAutoSettings() {
    // 处理自动启用角色正则表达式设置
    const auto_enable_character_regex = extension_settings[extensionName].auto_enable_character_regex;
    $('#auto_enable_character_regex')
        .prop('checked', auto_enable_character_regex)
        .on('click', onAutoEnableCharacterRegexClick);
    if (auto_enable_character_regex) {
        onAutoEnableCharacterRegexClick();
    }
    // 处理自动禁用不兼容选项设置
    const auto_disable_incompatible_options = extension_settings[extensionName].auto_disable_incompatible_options;
    $('#auto_disable_incompatible_options')
        .prop('checked', auto_disable_incompatible_options)
        .on('click', onAutoDisableIncompatibleOptions);
    if (auto_disable_incompatible_options) {
        onAutoDisableIncompatibleOptions();
    }
}
//# sourceMappingURL=script_repository.js.map