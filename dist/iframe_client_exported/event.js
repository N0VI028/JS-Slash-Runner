export const iframe_client_event = `
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * function hello() { alert("hello"); }
 * eventOn(要监听的事件, hello);
 *
 * @example
 * // 消息被修改时监听是哪一条消息被修改
 * // 能这么做是因为酒馆 MESSAGE_UPDATED 会发送消息 id 回来, 但是这个发送太自由了, 我还没整理出每种消息会发送什么
 * function detectMessageUpdated(message_id) {
 *   alert(\`你刚刚修改了第 \${message_id} 条聊天消息对吧😡\`);
 * }
 * eventOn(tavern_events.MESSAGE_UPDATED, detectMessageUpdated);
 */
async function eventOn(event_type, listener) {
    return detail.listen_event("[eventOn]", event_type, listener);
}
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动在最后运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数会将 \`listener\` 调整为最后运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整到最后运行的函数
 *
 * @example
 * eventMakeLast(要监听的事件, 要注册的函数);
 */
async function eventMakeLast(event_type, listener) {
    return detail.listen_event("[eventMakeLast]", event_type, listener);
}
/**
 * 让 \`listener\` 监听 \`event_type\`, 当事件发生时自动在最先运行 \`listener\`.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数会将 \`listener\` 调整为最先运行.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册/调整为最先运行的函数
 *
 * @example
 * eventMakeFirst(要监听的事件, 要注册的函数);
 */
async function eventMakeFirst(event_type, listener) {
    return detail.listen_event("[eventMakeFirst]", event_type, listener);
}
/**
 * 让 \`listener\` 仅监听下一次 \`event_type\`, 当该次事件发生时运行 \`listener\`, 此后取消监听.
 *
 * - 如果 \`listener\` 已经在监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要注册的函数
 *
 * @example
 * eventOnce(要监听的事件, 要注册的函数);
 */
async function eventOnce(event_type, listener) {
    return detail.listen_event("[eventOnce]", event_type, listener);
}
async function eventWaitOnce(event_type, listener) {
    if (!listener) {
        eventOnce(event_type, detail.do_nothing);
        return eventWaitOnce(event_type, detail.do_nothing);
    }
    const listener_string = listener.toString();
    const entry = \`\${event_type}#\${listener_string}\`;
    return new Promise((resolve, _) => {
        const uid = Date.now() + Math.random();
        function handleMessage(event) {
            if (event.data?.request === "iframe_event_wait_callback" && event.data.uid == uid) {
                window.removeEventListener("message", handleMessage);
                resolve(event.data.result);
                detail.waiting_event_map.deleteEntry(entry, uid);
                console.info(\`[Event][eventWaitOnce](\${getIframeName()}) 等待到函数因 '\${event_type}' 事件触发后的执行结果: \${JSON.stringify(event.data.result)}\\n\\n  \${detail.console_listener_string(listener_string)}\`);
            }
        }
        window.addEventListener("message", handleMessage);
        detail.waiting_event_map.put(entry, uid);
        console.info(\`[Event][eventWaitOnce](\${getIframeName()}) 等待函数被 '\${event_type}' 事件触发\\n\\n  \${detail.console_listener_string(listener_string)}\`);
    });
}
/**
 * 发送 \`event_type\` 事件, 同时可以发送一些数据 \`data\`.
 *
 * 所有正在监听 \`event_type\` 消息频道的都会收到该消息并接收到 \`data\`.
 *
 * @param event_type 要发送的事件
 * @param data 要随着事件发送的数据
 *
 * @example
 * // 发送 "角色阶段更新完成" 事件, 所有监听该事件的 \`listener\` 都会被运行
 * eventEmit("角色阶段更新完成");
 *
 * @example
 * // 发送 "存档" 事件, 并等待所有 \`listener\` (也许是负责存档的函数) 执行完毕后才继续
 * await eventEmit("存档");
 *
 * @example
 * // 发送时携带数据 ["你好", 0]
 * eventEmit("事件", "你好", 0);
 */
async function eventEmit(event_type, ...data) {
    return detail.make_iframe_promise({
        request: "[Event][eventEmit]",
        event_type: event_type,
        data: data
    });
}
/**
 * 让 \`listener\` 取消对 \`event_type\` 的监听.
 *
 * - 如果 \`listener\` 没有监听 \`event_type\`, 则调用本函数不会有任何效果.
 *
 * @param event_type 要监听的事件
 * @param listener 要取消注册的函数
 *
 * @example
 * eventRemoveListener(要监听的事件, 要取消注册的函数);
 */
async function eventRemoveListener(event_type, listener) {
    return detail.make_iframe_promise({
        request: '[Event][eventRemoveListener]',
        event_type: event_type,
        listener_uid: detail.listener_uid_map.get(listener),
        listener_string: listener.toString(),
    });
}
/**
 * 取消本 iframe 中对 \`event_type\` 的所有监听
 *
 * @param event_type 要取消监听的事件
 */
async function eventClearEvent(event_type) {
    return detail.make_iframe_promise({
        request: '[Event][eventClearEvent]',
        event_type: event_type,
    });
}
/**
 * 取消本 iframe 中 \`listener\` 的的所有监听
 *
 * @param listener 要取消注册的函数
 */
async function eventClearListener(listener) {
    return detail.make_iframe_promise({
        request: '[Event][eventClearListener]',
        listener_uid: detail.listener_uid_map.get(listener),
        listener_string: listener.toString(),
    });
}
/**
 * 取消本 iframe 中对所有事件的所有监听
 */
async function eventClearAll() {
    return detail.make_iframe_promise({
        request: '[Event][eventClearAll]'
    });
}
// iframe 事件
const iframe_events = {
    MESSAGE_IFRAME_RENDER_STARTED: 'message_iframe_render_started',
    MESSAGE_IFRAME_RENDER_ENDED: 'message_iframe_render_ended',
    GENERATION_STARTED: 'js_generation_started', // \`generate\` 函数开始生成
    STREAM_TOKEN_RECEIVED_FULLY: 'js_stream_token_received_fully', // 启用流式传输的 \`generate\` 函数传输当前完整文本: "这是", "这是一条", "这是一条流式传输"
    STREAM_TOKEN_RECEIVED_INCREMENTALLY: 'js_stream_token_received_incrementally', // 启用流式传输的 \`generate\` 函数传输当前增量文本: "这是", "一条", "流式传输"
    GENERATION_ENDED: 'js_generation_ended', // \`generate\` 函数完成生成
};
// 酒馆事件. **不建议自己发送酒馆事件, 因为你并不清楚它需要发送什么数据**
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
//------------------------------------------------------------------------------------------------------------------------
var detail;
(function (detail) {
    function console_listener_string(listener_string) {
        const index = listener_string.indexOf('\\n');
        if (index > -1) {
            return listener_string.slice(0, index);
        }
        else {
            return listener_string;
        }
    }
    detail.console_listener_string = console_listener_string;
    // TODO: 可能最好重写整个 tavern_event 的 client 和 server?
    detail.listener_uid_map = new Map();
    detail.uid_listener_map = new Map();
    async function listen_event(request, event_type, listener) {
        let listener_uid = 0;
        if (!detail.listener_uid_map.has(listener)) {
            listener_uid = Date.now() + Math.random();
            detail.listener_uid_map.set(listener, listener_uid);
            detail.uid_listener_map.set(listener_uid, listener);
        }
        return detail.make_iframe_promise({
            request: \`[Event]\${request}\`,
            event_type: event_type,
            listener_uid: detail.listener_uid_map.get(listener),
            listener_string: listener.toString(),
        });
    }
    detail.listen_event = listen_event;
    detail.waiting_event_map = new ArrayMultimap();
    window.addEventListener("message", async (event) => {
        if (event.data?.request === "iframe_event_callback") {
            // @ts-ignore 7015
            const listener = detail.uid_listener_map.get(event.data.listener_uid);
            if (!listener) {
                console.warn(\`[Event][callback '\${event.data.event_type}'](\${getIframeName()}) 监听到 '\${event.data.event_type}' 事件, 但注册的函数触发失败或不存在\\n\\n  \${detail.console_listener_string(event.data.listener_string)}\`);
                return;
            }
            console.info(\`[Event][callback '\${event.data.event_type}'](\${getIframeName()}) 函数因监听到 '\${event.data.event_type}' 事件而触发\\n\\n  \${detail.console_listener_string(event.data.listener_string)}\`);
            const result = await listener.call(null, ...(event.data.args ?? []));
            const uid = detail.waiting_event_map.get(\`\${event.data.event_type}#\${event.data.listener_string}\`)[0];
            if (uid) {
                window.postMessage({
                    request: 'iframe_event_wait_callback',
                    uid: uid,
                    result: result,
                }, '*');
            }
        }
    });
})(detail || (detail = {}));
//------------------------------------------------------------------------------------------------------------------------
// 已被弃用的接口, 请尽量按照指示更新它们
/**
 * @deprecated 已弃用, 请使用 eventOn
 */
const tavernOn = eventOn;
/**
 * @deprecated 已弃用, 请使用 eventMakeLast
 */
const tavernMakeLast = eventMakeLast;
/**
 * @deprecated 已弃用, 请使用 eventMakeFirst
 */
const tavernMakeFirst = eventMakeFirst;
/**
 * @deprecated 已弃用, 请使用 eventOnce
 */
const tavernOnce = eventOnce;
/**
 * @deprecated 已弃用, 请使用 eventRemoveListener
 */
const tavernRemoveListener = eventRemoveListener;
/**
 * @deprecated 已弃用, 请使用 eventClearEvent
 */
const tavernClearEvent = eventClearEvent;
/**
 * @deprecated 已弃用, 请使用 eventClearListener
 */
const tavernClearListener = eventClearListener;
/**
 * @deprecated 已弃用, 请使用 eventClearAll
 */
const tavernClearAll = eventClearAll;
`;
//# sourceMappingURL=event.js.map