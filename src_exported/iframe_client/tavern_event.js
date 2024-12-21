"use strict";
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册的函数
 *
 * @example
 * // 收到 ai 消息时弹窗输出 `hello`;
 * function hello() { alert("hello"); }
 * tavernOn(tavern_events.MESSAGE_RECEIVED, hello);
 */
function tavernOn(event_type, listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_on',
        event_type: event_type,
        listener_name: listener.name,
    }, '*');
}
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最后运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最后运行.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册/调整到最后运行的函数
 *
 * @example
 * tavernMakeLast(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernMakeLast(event_type, listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_make_last',
        event_type: event_type,
        listener_name: listener.name,
    }, '*');
}
/**
 * 让 `listener` 监听 `event_type`, 当事件发生时自动在最先运行 `listener`.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数会将 `listener` 调整为最先运行.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册/调整为最先运行的函数
 *
 * @example
 * tavernMakeFirst(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernMakeFirst(event_type, listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_make_first',
        event_type: event_type,
        listener_name: listener.name,
    }, '*');
}
/**
 * 让 `listener` 仅监听下一次 `event_type`, 当该次事件发生时运行 `listener`, 此后取消监听.
 *
 * - 如果 `listener` 已经在监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要注册的函数
 *
 * @example
 * tavernOnce(tavern_events.MESSAGE_RECEIVED, 要注册的函数);
 */
function tavernOnce(event_type, listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_once',
        event_type: event_type,
        listener_name: listener.name,
    }, '*');
}
/**
 * 让 `listener` 取消对 `event_type` 的监听.
 *
 * - 如果 `listener` 没有监听 `event_type`, 则调用本函数不会有任何效果.
 *
 * @param event_type 酒馆事件
 * @param listener 要取消注册的函数
 *
 * @example
 * tavernRemoveListener(tavern_events.MESSAGE_RECEIVED, 要取消注册的函数);
 */
function tavernRemoveListener(event_type, listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_remove_listener',
        event_type: event_type,
        listener_name: listener.name,
    }, '*');
}
/**
 * 取消本 iframe 中对 `event_type` 的所有监听
 *
 * @param event_type 要取消监听的事件
 *
 * @example
 * tavernRemoveListeners(tavern_events.MESSAGE_EDITED);
 */
function tavernClearEvent(event_type) {
    window.parent.postMessage({
        request: 'iframe_tavern_clear_event',
        event_type: event_type,
    }, '*');
}
/**
 * 取消本 iframe 中 `listener` 的的所有监听
 *
 * @param listener 要取消注册的函数
 *
 * @example
 * tavernRemoveListeners(tavern_events.MESSAGE_EDITED);
 */
function tavernClearListener(listener) {
    window.parent.postMessage({
        request: 'iframe_tavern_clear_listener',
        listener_name: listener.name,
    }, '*');
}
/**
 * 取消本 iframe 中对所有酒馆事件的所有监听
 */
function tavernClearAll() {
    window.parent.postMessage({
        request: 'iframe_tavern_clear_all'
    }, '*');
}
window.addEventListener("message", (event) => {
    if (event.data.request === "iframe_tavern_callback") {
        // @ts-ignore 7015
        const fn = window[event.data.listener_name];
        if (typeof fn === 'function') {
            fn(...(event.data.args || []));
            // @ts-ignore 18047
            console.info(`[Tavern Event](${window.frameElement.id}) 监听到酒馆 ${event.data.event_type} 事件, 触发 ${event.data.listener_name}`);
        }
    }
});
/**
 * 可被监听的酒馆事件
 *
 * @example
 * // 收到 ai 消息时弹窗输出 `hello`;
 * function hello() { alert("hello"); }
 * tavernOn(tavern_events.MESSAGE_RECEIVED, hello);
 */
const tavern_events = {
    APP_READY: 'app_ready',
    EXTRAS_CONNECTED: 'extras_connected',
    MESSAGE_SWIPED: 'message_swiped',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_RECEIVED: 'message_received',
    MESSAGE_EDITED: 'message_edited',
    MESSAGE_DELETED: 'message_deleted',
    MESSAGE_UPDATED: 'message_updated',
    MESSAGE_FILE_EMBEDDED: 'message_file_embedded',
    IMPERSONATE_READY: 'impersonate_ready',
    CHAT_CHANGED: 'chat_id_changed',
    GENERATION_AFTER_COMMANDS: 'GENERATION_AFTER_COMMANDS',
    GENERATION_STARTED: 'generation_started',
    GENERATION_STOPPED: 'generation_stopped',
    GENERATION_ENDED: 'generation_ended',
    EXTENSIONS_FIRST_LOAD: 'extensions_first_load',
    EXTENSION_SETTINGS_LOADED: 'extension_settings_loaded',
    SETTINGS_LOADED: 'settings_loaded',
    SETTINGS_UPDATED: 'settings_updated',
    GROUP_UPDATED: 'group_updated',
    MOVABLE_PANELS_RESET: 'movable_panels_reset',
    SETTINGS_LOADED_BEFORE: 'settings_loaded_before',
    SETTINGS_LOADED_AFTER: 'settings_loaded_after',
    CHATCOMPLETION_SOURCE_CHANGED: 'chatcompletion_source_changed',
    CHATCOMPLETION_MODEL_CHANGED: 'chatcompletion_model_changed',
    OAI_PRESET_CHANGED_BEFORE: 'oai_preset_changed_before',
    OAI_PRESET_CHANGED_AFTER: 'oai_preset_changed_after',
    OAI_PRESET_EXPORT_READY: 'oai_preset_export_ready',
    OAI_PRESET_IMPORT_READY: 'oai_preset_import_ready',
    WORLDINFO_SETTINGS_UPDATED: 'worldinfo_settings_updated',
    WORLDINFO_UPDATED: 'worldinfo_updated',
    CHARACTER_EDITED: 'character_edited',
    CHARACTER_PAGE_LOADED: 'character_page_loaded',
    CHARACTER_GROUP_OVERLAY_STATE_CHANGE_BEFORE: 'character_group_overlay_state_change_before',
    CHARACTER_GROUP_OVERLAY_STATE_CHANGE_AFTER: 'character_group_overlay_state_change_after',
    USER_MESSAGE_RENDERED: 'user_message_rendered',
    CHARACTER_MESSAGE_RENDERED: 'character_message_rendered',
    FORCE_SET_BACKGROUND: 'force_set_background',
    CHAT_DELETED: 'chat_deleted',
    CHAT_CREATED: 'chat_created',
    GROUP_CHAT_DELETED: 'group_chat_deleted',
    GROUP_CHAT_CREATED: 'group_chat_created',
    GENERATE_BEFORE_COMBINE_PROMPTS: 'generate_before_combine_prompts',
    GENERATE_AFTER_COMBINE_PROMPTS: 'generate_after_combine_prompts',
    GENERATE_AFTER_DATA: 'generate_after_data',
    GROUP_MEMBER_DRAFTED: 'group_member_drafted',
    WORLD_INFO_ACTIVATED: 'world_info_activated',
    TEXT_COMPLETION_SETTINGS_READY: 'text_completion_settings_ready',
    CHAT_COMPLETION_SETTINGS_READY: 'chat_completion_settings_ready',
    CHAT_COMPLETION_PROMPT_READY: 'chat_completion_prompt_ready',
    CHARACTER_FIRST_MESSAGE_SELECTED: 'character_first_message_selected',
    // TODO: Naming convention is inconsistent with other events
    CHARACTER_DELETED: 'characterDeleted',
    CHARACTER_DUPLICATED: 'character_duplicated',
    /** @deprecated The event is aliased to STREAM_TOKEN_RECEIVED. */
    SMOOTH_STREAM_TOKEN_RECEIVED: 'stream_token_received',
    STREAM_TOKEN_RECEIVED: 'stream_token_received',
    FILE_ATTACHMENT_DELETED: 'file_attachment_deleted',
    WORLDINFO_FORCE_ACTIVATE: 'worldinfo_force_activate',
    OPEN_CHARACTER_LIBRARY: 'open_character_library',
    ONLINE_STATUS_CHANGED: 'online_status_changed',
    IMAGE_SWIPED: 'image_swiped',
    CONNECTION_PROFILE_LOADED: 'connection_profile_loaded',
    TOOL_CALLS_PERFORMED: 'tool_calls_performed',
    TOOL_CALLS_RENDERED: 'tool_calls_rendered',
};
/**
 * 如果代码要随消息变化而运行, 则监听这些事件.
 *
 * @example
 * tavern_messagelike_events.forEach((event_type) => { tavernOn(event_type, 要注册的函数); });
 */
const tavern_messagelike_events = [
    tavern_events.MESSAGE_EDITED,
    tavern_events.MESSAGE_DELETED,
    tavern_events.MESSAGE_SWIPED,
    tavern_events.MESSAGE_RECEIVED
];
//# sourceMappingURL=tavern_event.js.map