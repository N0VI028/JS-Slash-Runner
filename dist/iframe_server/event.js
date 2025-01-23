import { extract, get_or_set } from "../util/helper.js";
import { eventSource } from "../../../../../../script.js";
import { getIframeName, getLogPrefix, registerIframeHandler } from "./index.js";
let iframe_listener_event_callback_map = new Map();
function unpack(event) {
    return {
        iframe_name: getIframeName(event),
        listener_uid: event.data.listener_uid,
        listener_string: event.data.listener_string,
        event_type: event.data.event_type,
    };
}
function tryGetEventCallback(event) {
    const data = unpack(event);
    return iframe_listener_event_callback_map.get(data.iframe_name)?.get(data.listener_uid)?.get(data.event_type);
}
function removeEventCallback(event) {
    const data = unpack(event);
    // @ts-ignore 2345
    iframe_listener_event_callback_map.get(data.iframe_name).get(data.listener_uid).delete(data.event_type);
}
function makeEventCallback(event, once) {
    const data = unpack(event);
    const default_callback = async (...args) => {
        if (once) {
            removeEventCallback(event);
        }
        event.source.postMessage({
            request: 'iframe_event_callback',
            event_type: data.event_type,
            listener_uid: data.listener_uid,
            listener_string: data.listener_string,
            args: args
        }, { targetOrigin: "*" });
    };
    const default_event_callback = new Map([[data.event_type, default_callback]]);
    const default_listener_event_callback = new Map([[data.listener_uid, default_event_callback]]);
    const listener_event_callback = get_or_set(iframe_listener_event_callback_map, data.iframe_name, () => default_listener_event_callback);
    const event_callback = get_or_set(listener_event_callback, data.listener_uid, () => default_event_callback);
    const callback = get_or_set(event_callback, data.event_type, () => default_callback);
    return callback;
}
function console_listener_string(listener_string) {
    const index = listener_string.indexOf('\n');
    if (index > -1) {
        return listener_string.slice(0, index);
    }
    else {
        return listener_string;
    }
}
export function registerIframeEventHandler() {
    registerIframeHandler('[Event][eventOn]', async (event) => {
        const data = unpack(event);
        if (tryGetEventCallback(event)) {
            console.warn(`[Event][eventOn](${data.iframe_name}) 函数已经在监听 '${data.event_type}' 事件, 调用无效\n\n  ${console_listener_string(data.listener_string)}`);
            return;
        }
        const callback = makeEventCallback(event, false);
        eventSource.on(data.event_type, callback);
        console.info(`[Event][eventOn](${data.iframe_name}) 函数开始监听 '${data.event_type}' 事件并将随事件触发\n\n  ${console_listener_string(data.listener_string)}`);
    });
    registerIframeHandler('[Event][eventMakeLast]', async (event) => {
        const is_listening = tryGetEventCallback(event) !== undefined;
        const data = unpack(event);
        const callback = makeEventCallback(event, false);
        eventSource.makeLast(data.event_type, callback);
        if (is_listening) {
            console.info(`[Event][eventMakeLast](${data.iframe_name}) 函数调整为监听到 '${data.event_type}' 事件时最后触发\n\n  ${console_listener_string(data.listener_string)}`);
        }
        else {
            console.info(`[Event][eventMakeLast](${data.iframe_name}) 函数开始监听 '${data.event_type}' 事件并将随事件最后触发\n\n  ${console_listener_string(data.listener_string)}`);
        }
    });
    registerIframeHandler('[Event][eventMakeFirst]', async (event) => {
        const is_listening = tryGetEventCallback(event) !== undefined;
        const data = unpack(event);
        const callback = makeEventCallback(event, false);
        eventSource.makeFirst(data.event_type, callback);
        if (is_listening) {
            console.info(`[Event][eventMakeFirst](${data.iframe_name}) 函数调整为监听到 '${data.event_type}' 事件时最先触发\n\n  ${console_listener_string(data.listener_string)}`);
        }
        else {
            console.info(`[Event][eventMakeFirst](${data.iframe_name}) 函数开始监听 '${data.event_type}' 事件并将随事件最先触发\n\n  ${console_listener_string(data.listener_string)}`);
        }
    });
    registerIframeHandler('[Event][eventOnce]', async (event) => {
        const data = unpack(event);
        if (tryGetEventCallback(event)) {
            console.warn(`[Event][eventOnce](${data.iframe_name}) 函数已经在监听 '${data.event_type}' 事件, 调用无效\n\n  ${console_listener_string(data.listener_string)}`);
            return;
        }
        const callback = makeEventCallback(event, true);
        eventSource.once(data.event_type, callback);
        console.info(`[Event][eventOnce](${data.iframe_name}) 函数开始监听下一次 '${data.event_type}' 事件并仅在该次事件时触发\n\n  ${console_listener_string(data.listener_string)}`);
    });
    registerIframeHandler('[Event][eventEmit]', async (event) => {
        const event_type = event.data.event_type;
        const data = event.data.data;
        await eventSource.emit(event_type, ...data);
        console.info(`${getLogPrefix(event)}发送 '${event_type}' 事件, 携带数据: ${JSON.stringify(data)}`);
    });
    registerIframeHandler('[Event][eventRemoveListener]', async (event) => {
        const data = unpack(event);
        const callback = tryGetEventCallback(event);
        if (!callback) {
            console.warn(`[Event][eventRemoveListener](${data.iframe_name}) 函数没有监听 '${data.event_type}' 事件, 调用无效\n\n  ${console_listener_string(data.listener_string)}`);
            return;
        }
        eventSource.removeListener(data.event_type, callback);
        removeEventCallback(event);
        console.info(`[Event][eventRemoveListener](${data.iframe_name}) 函数不再监听 '${data.event_type}' 事件\n\n  ${console_listener_string(data.listener_string)}`);
    });
    registerIframeHandler('[Event][eventClearEvent]', async (event) => {
        const iframe_name = getIframeName(event);
        const event_type = event.data.event_type;
        iframe_listener_event_callback_map
            .get(iframe_name)
            ?.forEach((event_callback_map, _) => {
            const callback = event_callback_map.get(event_type);
            if (callback) {
                eventSource.removeListener(event_type, callback);
                event_callback_map.delete(event_type);
            }
        });
        console.info(`${getLogPrefix(event)}所有函数都不再监听 '${event_type}' 事件`);
    });
    registerIframeHandler('[Event][eventClearListener]', async (event) => {
        const iframe_name = getIframeName(event);
        const listener_uid = event.data.listener_uid;
        const listener_string = event.data.listener_string;
        const listener_event_callback_map = iframe_listener_event_callback_map.get(iframe_name);
        if (listener_event_callback_map) {
            const event_callback_map = extract(listener_event_callback_map, listener_uid);
            if (event_callback_map) {
                event_callback_map.forEach((callback, event_type) => {
                    eventSource.removeListener(event_type, callback);
                });
            }
        }
        console.info(`${getLogPrefix(event)}函数不再监听任何事件\n\n  ${console_listener_string(listener_string)}`);
    });
    registerIframeHandler('[Event][eventClearAll]', async (event) => {
        const iframe_name = getIframeName(event);
        clearIframeEventListeners(iframe_name);
        console.info(`${getLogPrefix(event)}取消所有函数对所有事件的监听`);
    });
    function clearIframeEventListeners(iframe_name) {
        const listener_event_callback_map = extract(iframe_listener_event_callback_map, iframe_name);
        listener_event_callback_map
            ?.forEach((event_callback_map, _) => {
            event_callback_map.forEach((callback, event_type) => {
                eventSource.removeListener(event_type, callback);
            });
        });
    }
    const event_observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
                if (node instanceof HTMLIFrameElement) {
                    clearIframeEventListeners(node.id);
                }
            });
        });
    });
    event_observer.observe(document.body, { childList: true, subtree: true });
}
//# sourceMappingURL=event.js.map